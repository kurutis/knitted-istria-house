import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 отмен в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function DELETE(
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

        // 1. Проверяем существование мастер-класса и его статус
        const { data: masterClass, error: classError } = await supabase
            .from('master_classes')
            .select(`
                id,
                title,
                date_time,
                status,
                current_participants,
                max_participants,
                master_id
            `)
            .eq('id', id)
            .single();

        if (classError) {
            if (classError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
            }
            logError('Error fetching master class', classError);
            return NextResponse.json({ error: 'Ошибка проверки мастер-класса' }, { status: 500 });
        }

        // Проверяем, можно ли отменить запись
        const classDate = new Date(masterClass.date_time);
        const now = new Date();
        const hoursUntilClass = (classDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilClass < 2) {
            return NextResponse.json({ 
                error: 'Отмена записи невозможна менее чем за 2 часа до начала мастер-класса' 
            }, { status: 400 });
        }

        if (masterClass.status === 'cancelled') {
            return NextResponse.json({ error: 'Мастер-класс отменен' }, { status: 400 });
        }

        if (masterClass.status === 'completed') {
            return NextResponse.json({ error: 'Мастер-класс уже прошел' }, { status: 400 });
        }

        // 2. Проверяем, существует ли запись пользователя
        const { data: registration, error: checkError } = await supabase
            .from('master_class_registrations')
            .select(`
                id,
                created_at,
                payment_status,
                payment_id
            `)
            .eq('master_class_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking registration', checkError);
            return NextResponse.json({ error: 'Ошибка проверки записи' }, { status: 500 });
        }

        if (!registration) {
            return NextResponse.json({ error: 'Вы не записаны на этот мастер-класс' }, { status: 400 });
        }

        // 3. Если был платеж, обрабатываем возврат (опционально)
        let refundProcessed = false;
        if (registration.payment_status === 'paid' && registration.payment_id) {
            // Здесь можно добавить логику возврата платежа
            // await processRefund(registration.payment_id);
            refundProcessed = true;
        }

        // 4. Удаляем запись
        const { error: deleteError } = await supabase
            .from('master_class_registrations')
            .delete()
            .eq('master_class_id', id)
            .eq('user_id', session.user.id);

        if (deleteError) {
            logError('Error deleting registration', deleteError);
            return NextResponse.json({ error: 'Ошибка при отмене записи' }, { status: 500 });
        }

        // 5. Обновляем количество участников
        const newParticipants = Math.max((masterClass.current_participants || 1) - 1, 0);

        const { error: updateError } = await supabase
            .from('master_classes')
            .update({ 
                current_participants: newParticipants,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            logError('Error updating participants count', updateError);
            // Не возвращаем ошибку, так как запись уже удалена
        }

        // 6. Создаем уведомление для пользователя
        await supabase
            .from('notifications')
            .insert({
                user_id: session.user.id,
                title: 'Запись на мастер-класс отменена',
                message: `Вы успешно отменили запись на "${masterClass.title}"`,
                type: 'master_class',
                metadata: { 
                    master_class_id: id,
                    cancelled_at: new Date().toISOString()
                },
                created_at: new Date().toISOString()
            });

        // 7. Уведомляем мастера (если нужно)
        if (masterClass.master_id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: masterClass.master_id,
                    title: 'Отмена записи на мастер-класс',
                    message: `Пользователь ${session.user.email} отменил запись на "${masterClass.title}"`,
                    type: 'master_class',
                    metadata: { 
                        master_class_id: id,
                        user_id: session.user.id
                    },
                    created_at: new Date().toISOString()
                });
        }

        // 8. Инвалидируем кэши
        invalidateCache(`master_class_${id}`);
        invalidateCache(`master_class_registrations_${id}`);
        invalidateCache(`user_registrations_${session.user.id}`);
        invalidateCache(new RegExp(`master_classes_master_${masterClass.master_id}`));

        logInfo('Master class registration cancelled', {
            masterClassId: id,
            userId: session.user.id,
            masterId: masterClass.master_id,
            title: masterClass.title,
            hadPayment: registration.payment_status === 'paid',
            refundProcessed,
            hoursBeforeClass: Math.round(hoursUntilClass),
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Запись на мастер-класс успешно отменена',
            refund_processed: refundProcessed
        }, { status: 200 });
        
    } catch (error) {
        logError('Error canceling registration', error);
        return NextResponse.json({ error: 'Ошибка при отмене записи' }, { status: 500 });
    }
}