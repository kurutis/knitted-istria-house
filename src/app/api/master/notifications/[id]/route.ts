// app/api/master/notifications/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту
const patchLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 запросов в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function GET(request: Request) {
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
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                notifications: [],
                unread_count: 0
            }, { status: 429 });
        }

        // Параметры пагинации
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;
        const includeRead = searchParams.get('includeRead') === 'true';

        // Кэшируем уведомления
        const cacheKey = `master_notifications_${session.user.id}_${page}_${limit}_${includeRead}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('notifications')
                .select('*', { count: 'exact' })
                .eq('user_id', session.user.id);

            if (!includeRead) {
                query = query.eq('is_read', false);
            }

            const { data: notifications, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching master notifications', error);
                throw new Error('DATABASE_ERROR');
            }

            // Подсчет непрочитанных
            let unreadCount = 0;
            if (!includeRead && notifications) {
                unreadCount = notifications.length;
            } else if (notifications) {
                const { count: totalUnread } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', session.user.id)
                    .eq('is_read', false);
                unreadCount = totalUnread || 0;
            }

            // Форматируем уведомления
            const formattedNotifications = notifications?.map(notification => ({
                id: notification.id,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                metadata: notification.metadata,
                is_read: notification.is_read,
                created_at: notification.created_at,
                formatted_date: new Date(notification.created_at).toLocaleString('ru-RU'),
                time_ago: getTimeAgo(new Date(notification.created_at))
            })) || [];

            return {
                notifications: formattedNotifications,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                unread_count: unreadCount
            };
        });

        return NextResponse.json({
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in master notifications GET', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки уведомлений',
            notifications: [],
            unread_count: 0,
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
        }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }
        
        if (session.user.role !== 'master' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = patchLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.'
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const markAll = searchParams.get('markAll') === 'true';

        // Отметить все как прочитанные
        if (markAll) {
            const { error: updateError } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', session.user.id)
                .eq('is_read', false);

            if (updateError) {
                logError('Error marking all notifications as read', updateError);
                return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
            }

            // Инвалидируем кэш
            invalidateCache(new RegExp(`master_notifications_${session.user.id}`));

            logInfo('All master notifications marked as read', {
                userId: session.user.id,
                duration: Date.now() - startTime
            });

            return NextResponse.json({ 
                success: true, 
                message: 'Все уведомления отмечены как прочитанные' 
            }, { status: 200 });
        }

        // Отметить одно уведомление
        if (!id) {
            return NextResponse.json({ error: 'ID уведомления обязателен' }, { status: 400 });
        }

        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID уведомления' }, { status: 400 });
        }

        // Проверяем, существует ли уведомление и принадлежит ли пользователю
        const { data: notification, error: checkError } = await supabase
            .from('notifications')
            .select('id, user_id, is_read')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Уведомление не найдено' }, { status: 404 });
            }
            logError('Error checking notification', checkError);
            return NextResponse.json({ error: 'Ошибка проверки' }, { status: 500 });
        }

        if (notification.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Если уже прочитано, возвращаем успех без обновления
        if (notification.is_read) {
            return NextResponse.json({ 
                success: true, 
                message: 'Уведомление уже прочитано',
                already_read: true
            }, { status: 200 });
        }

        // Отмечаем как прочитанное
        const { error: updateError } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', session.user.id);

        if (updateError) {
            logError('Error marking notification as read', updateError);
            return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`master_notifications_${session.user.id}`));

        logInfo('Notification marked as read', {
            notificationId: id,
            userId: session.user.id,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Уведомление отмечено как прочитанное' 
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in master notifications PATCH', error);
        return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
    }
}

// DELETE - удалить уведомление
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user || (session.user.role !== 'master' && session.user.role !== 'admin')) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const deleteAll = searchParams.get('deleteAll') === 'true';

        if (deleteAll) {
            // Удаляем все прочитанные уведомления
            const { error: deleteError } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', session.user.id)
                .eq('is_read', true);

            if (deleteError) {
                logError('Error deleting all read notifications', deleteError);
                return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
            }

            invalidateCache(new RegExp(`master_notifications_${session.user.id}`));

            return NextResponse.json({ 
                success: true, 
                message: 'Все прочитанные уведомления удалены' 
            }, { status: 200 });
        }

        if (!id) {
            return NextResponse.json({ error: 'ID уведомления обязателен' }, { status: 400 });
        }

        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID' }, { status: 400 });
        }

        // Проверяем принадлежность
        const { data: notification, error: checkError } = await supabase
            .from('notifications')
            .select('user_id')
            .eq('id', id)
            .single();

        if (checkError || notification?.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Уведомление не найдено' }, { status: 404 });
        }

        // Удаляем
        const { error: deleteError } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (deleteError) {
            logError('Error deleting notification', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
        }

        invalidateCache(new RegExp(`master_notifications_${session.user.id}`));

        return NextResponse.json({ 
            success: true, 
            message: 'Уведомление удалено' 
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in master notifications DELETE', error);
        return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
    }
}

// Вспомогательная функция для форматирования времени
function getTimeAgo(date: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'только что';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} ${getMinutesDeclension(minutes)} назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${getHoursDeclension(hours)} назад`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ${getDaysDeclension(days)} назад`;
    if (days < 30) return `${Math.floor(days / 7)} ${getWeeksDeclension(Math.floor(days / 7))} назад`;
    return date.toLocaleDateString('ru-RU');
}

function getMinutesDeclension(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'минуту';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'минуты';
    return 'минут';
}

function getHoursDeclension(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'час';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'часа';
    return 'часов';
}

function getDaysDeclension(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
    return 'дней';
}

function getWeeksDeclension(n: number): string {
    if (n % 10 === 1 && n % 100 !== 11) return 'неделю';
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'недели';
    return 'недель';
}