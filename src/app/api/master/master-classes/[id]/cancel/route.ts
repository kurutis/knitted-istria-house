// app/api/master/master-classes/[id]/cancel/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

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
        
        if (session.user.role !== 'master' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
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
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID мастер-класса' }, { status: 400 });
        }

        // Проверяем, существует ли мастер-класс и принадлежит ли мастеру
        const { data: masterClass, error: checkError } = await supabase
            .from('master_classes')
            .select(`
                id,
                master_id,
                title,
                status,
                date_time,
                current_participants
            `)
            .eq('id', id)
            .single();

        if (checkError || !masterClass) {
            return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
        }

        // Проверяем права (админ может отменить любой мастер-класс)
        const isAdmin = session.user.role === 'admin';
        const isOwner = masterClass.master_id === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'У вас нет прав на отмену этого мастер-класса' }, { status: 403 });
        }

        // Проверяем, можно ли отменить мастер-класс
        if (masterClass.status === 'cancelled') {
            return NextResponse.json({ error: 'Мастер-класс уже отменен' }, { status: 400 });
        }

        if (masterClass.status === 'completed') {
            return NextResponse.json({ error: 'Нельзя отменить завершенный мастер-класс' }, { status: 400 });
        }

        const now = new Date();
        const classDate = new Date(masterClass.date_time);
        
        // Если мастер-класс уже начался, нельзя отменить
        if (classDate < now) {
            return NextResponse.json({ error: 'Нельзя отменить уже начавшийся мастер-класс' }, { status: 400 });
        }

        // Обновляем статус мастер-класса на "cancelled"
        const { error: updateError } = await supabase
            .from('master_classes')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            logError('Error cancelling master class', updateError);
            return NextResponse.json({ error: 'Ошибка при отмене мастер-класса' }, { status: 500 });
        }

        // Получаем всех участников мастер-класса
        const { data: registrations, error: regError } = await supabase
            .from('master_class_registrations')
            .select('id, user_id')
            .eq('master_class_id', id);

        if (regError) {
            logError('Error fetching registrations for notification', regError, 'warning');
        }

        // Отправляем уведомления участникам об отмене
        if (registrations && registrations.length > 0) {
            const notifications = registrations.map(reg => ({
                user_id: reg.user_id,
                title: 'Мастер-класс отменен',
                message: `Мастер-класс "${masterClass.title}" был отменен. Приносим извинения за неудобства.`,
                type: 'master_class_cancelled',
                metadata: { master_class_id: id },
                created_at: new Date().toISOString(),
                is_read: false
            }));
            
            await supabase
                .from('notifications')
                .insert(notifications)
                .then(() => {});
        }

        // Инвалидируем кэши
        invalidateCache(new RegExp(`master_class_${id}`));
        invalidateCache(new RegExp(`master_classes_master_${masterClass.master_id}`));
        invalidateCache('public_classes');
        invalidateCache(new RegExp(`user_registrations_`));

        logInfo('Master class cancelled', {
            classId: id,
            masterId: session.user.id,
            title: masterClass.title,
            wasPublished: masterClass.status === 'published',
            participantsNotified: registrations?.length || 0,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Мастер-класс успешно отменен. Участники получили уведомления.'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error cancelling master class', error);
        return NextResponse.json({ error: 'Ошибка при отмене мастер-класса' }, { status: 500 });
    }
}