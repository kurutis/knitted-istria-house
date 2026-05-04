// app/api/master-classes/[id]/register/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface RegistrationResponse {
    success: boolean;
    message: string;
    registration_id: string;
    requires_payment: boolean;
    payment_amount?: number;
    payment_status?: string;
    master_class: {
        id: string;
        title: string;
        date_time: string;
        price: number;
        type: string;
        location: string | null;
        online_link: string | null;
    };
}

// Rate limiting
const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 запросов в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID мастер-класса' }, { status: 400 });
        }

        // 1. Получаем полную информацию о мастер-классе
        const { data: masterClass, error: classError } = await supabase
            .from('master_classes')
            .select(`
                id,
                title,
                description,
                price,
                date_time,
                current_participants,
                max_participants,
                status,
                master_id,
                type,
                location,
                online_link
            `)
            .eq('id', id)
            .single();

        if (classError) {
            if (classError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
            }
            logError('Error fetching master class', classError);
            return NextResponse.json({ error: 'Ошибка при проверке мастер-класса' }, { status: 500 });
        }

        // 2. Проверяем доступность мастер-класса
        if (masterClass.status !== 'published') {
            return NextResponse.json({ error: 'Мастер-класс не доступен для записи' }, { status: 400 });
        }

        // Проверяем дату
        const classDate = new Date(masterClass.date_time);
        const now = new Date();
        
        if (classDate < now) {
            return NextResponse.json({ error: 'Мастер-класс уже прошел' }, { status: 400 });
        }

        // Проверяем, не слишком ли поздно для записи (например, за 1 час до начала)
        const hoursUntilClass = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilClass < 1) {
            return NextResponse.json({ 
                error: 'Запись на мастер-класс закрыта за 1 час до начала' 
            }, { status: 400 });
        }

        // 3. Проверяем наличие мест
        const currentParticipants = masterClass.current_participants || 0;
        const maxParticipants = masterClass.max_participants || 0;

        if (currentParticipants >= maxParticipants) {
            return NextResponse.json({ error: 'Нет свободных мест' }, { status: 400 });
        }

        // 4. Проверяем, не записан ли уже пользователь
        const { data: existing, error: checkError } = await supabase
            .from('master_class_registrations')
            .select('id, payment_status')
            .eq('master_class_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing registration', checkError);
            return NextResponse.json({ error: 'Ошибка проверки записи' }, { status: 500 });
        }

        if (existing) {
            return NextResponse.json({ 
                error: 'Вы уже записаны на этот мастер-класс',
                payment_status: existing.payment_status
            }, { status: 400 });
        }

        // 5. Создаем запись
        const nowISO = new Date().toISOString();
        const { data: registration, error: insertError } = await supabase
            .from('master_class_registrations')
            .insert({
                master_class_id: id,
                user_id: session.user.id,
                payment_status: masterClass.price > 0 ? 'pending' : 'free',
                payment_amount: masterClass.price || 0,
                created_at: nowISO,
                updated_at: nowISO
            })
            .select()
            .single();

        if (insertError) {
            logError('Error creating registration', insertError);
            return NextResponse.json({ error: 'Ошибка при записи' }, { status: 500 });
        }

        // 6. Увеличиваем количество участников
        const newParticipantsCount = currentParticipants + 1;

        const { error: updateError } = await supabase
            .from('master_classes')
            .update({ 
                current_participants: newParticipantsCount,
                updated_at: nowISO
            })
            .eq('id', id);

        if (updateError) {
            logError('Error updating participants count', updateError);
            // Не возвращаем ошибку, так как запись уже создана
        }

        // 7. Создаем уведомление для пользователя
        await supabase
            .from('notifications')
            .insert({
                user_id: session.user.id,
                title: 'Вы записаны на мастер-класс',
                message: `Вы успешно записаны на "${masterClass.title}". ${masterClass.price > 0 ? 'Ожидайте подтверждения оплаты.' : 'До встречи!'}`,
                type: 'master_class',
                metadata: { 
                    master_class_id: id,
                    registration_id: registration.id,
                    payment_required: masterClass.price > 0
                },
                created_at: nowISO,
                is_read: false
            });

        // 8. Уведомляем мастера
        await supabase
            .from('notifications')
            .insert({
                user_id: masterClass.master_id,
                title: 'Новая запись на мастер-класс',
                message: `Пользователь ${session.user.email || session.user.name} записался на "${masterClass.title}". Осталось мест: ${maxParticipants - newParticipantsCount}`,
                type: 'master_class_registration',
                metadata: { 
                    master_class_id: id, 
                    user_id: session.user.id,
                    registration_id: registration.id
                },
                created_at: nowISO,
                is_read: false
            });

        // 9. Инвалидируем кэши
        invalidateCache(`master_class_${id}`);
        invalidateCache(`master_class_registrations_${id}`);
        invalidateCache(`user_registrations_${session.user.id}`);
        invalidateCache(new RegExp(`master_classes_master_${masterClass.master_id}`));

        logInfo('User registered for master class', {
            masterClassId: id,
            userId: session.user.id,
            masterId: masterClass.master_id,
            title: masterClass.title,
            currentParticipants: newParticipantsCount,
            maxParticipants,
            spotsLeft: maxParticipants - newParticipantsCount,
            requiresPayment: masterClass.price > 0,
            price: masterClass.price,
            duration: Date.now() - startTime
        });

        // 10. Формируем ответ
        const response: RegistrationResponse = {
            success: true,
            message: masterClass.price > 0 
                ? 'Вы успешно записаны! Требуется оплата.' 
                : 'Вы успешно записались на мастер-класс!',
            registration_id: registration.id,
            requires_payment: masterClass.price > 0,
            master_class: {
                id: masterClass.id,
                title: masterClass.title,
                date_time: masterClass.date_time,
                price: masterClass.price,
                type: masterClass.type,
                location: masterClass.type === 'offline' ? masterClass.location : null,
                online_link: masterClass.type === 'online' ? masterClass.online_link : null
            }
        };

        if (masterClass.price > 0) {
            response.payment_amount = masterClass.price;
            response.payment_status = 'pending';
        }

        return NextResponse.json(response, { status: 201 });
        
    } catch (error) {
        logError('Error registering for master class', error);
        return NextResponse.json({ error: 'Ошибка при записи' }, { status: 500 });
    }
}