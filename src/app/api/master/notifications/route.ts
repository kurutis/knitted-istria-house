// app/api/notifications/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту
const patchLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 запросов в минуту
const deleteLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 }); // 20 запросов в минуту

// GET - получить уведомления пользователя
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
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

        // Кэшируем уведомления (короткое время для актуальности)
        const cacheKey = `notifications_${session.user.id}_${page}_${limit}_${includeRead}`;
        
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
                logError('Error fetching notifications', error);
                throw new Error('DATABASE_ERROR');
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
                // Добавляем читаемую дату
                formatted_date: new Date(notification.created_at).toLocaleString('ru-RU')
            })) || [];

            // Считаем непрочитанные
            const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

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

        // Добавляем мета-информацию
        const response = {
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        };

        return NextResponse.json(response, { status: 200 });
        
    } catch (error) {
        logError('Error in notifications GET', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки уведомлений',
            notifications: [],
            unread_count: 0,
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
        }, { status: 500 });
    }
}

// PATCH - отметить уведомление как прочитанное
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = patchLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.'
            }, { status: 429 });
        }

        const body = await request.json();
        const { notificationId, markAll } = body;

        if (markAll) {
            // Отмечаем все уведомления как прочитанные
            const { error: updateError } = await supabase
                .from('notifications')
                .update({ 
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('user_id', session.user.id)
                .eq('is_read', false);

            if (updateError) {
                logError('Error marking all notifications as read', updateError);
                return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
            }

            // Инвалидируем кэш
            invalidateCache(new RegExp(`notifications_${session.user.id}`));

            logInfo('All notifications marked as read', { userId: session.user.id });

            return NextResponse.json({ 
                success: true, 
                message: 'Все уведомления отмечены как прочитанные' 
            }, { status: 200 });
        }

        if (!notificationId) {
            return NextResponse.json({ error: 'ID уведомления обязателен' }, { status: 400 });
        }

        // Проверяем принадлежность уведомления
        const { data: notification, error: checkError } = await supabase
            .from('notifications')
            .select('user_id')
            .eq('id', notificationId)
            .single();

        if (checkError || notification?.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Уведомление не найдено' }, { status: 404 });
        }

        // Отмечаем как прочитанное
        const { error: updateError } = await supabase
            .from('notifications')
            .update({ 
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId);

        if (updateError) {
            logError('Error marking notification as read', updateError);
            return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`notifications_${session.user.id}`));

        return NextResponse.json({ 
            success: true, 
            message: 'Уведомление отмечено как прочитанное' 
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in notifications PATCH', error);
        return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
    }
}

// DELETE - удалить уведомление
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.'
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const notificationId = searchParams.get('id');
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

            invalidateCache(new RegExp(`notifications_${session.user.id}`));

            return NextResponse.json({ 
                success: true, 
                message: 'Все прочитанные уведомления удалены' 
            }, { status: 200 });
        }

        if (!notificationId) {
            return NextResponse.json({ error: 'ID уведомления обязателен' }, { status: 400 });
        }

        // Проверяем принадлежность
        const { data: notification, error: checkError } = await supabase
            .from('notifications')
            .select('user_id')
            .eq('id', notificationId)
            .single();

        if (checkError || notification?.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Уведомление не найдено' }, { status: 404 });
        }

        // Удаляем уведомление
        const { error: deleteError } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (deleteError) {
            logError('Error deleting notification', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`notifications_${session.user.id}`));

        return NextResponse.json({ 
            success: true, 
            message: 'Уведомление удалено' 
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in notifications DELETE', error);
        return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
    }
}

// POST - создать уведомление (вспомогательная функция, может использоваться другими сервисами)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        // Только администраторы могут создавать уведомления для других
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const body = await request.json();
        const { userId, title, message, type, metadata } = body;

        if (!userId || !title || !message) {
            return NextResponse.json({ error: 'Обязательные поля: userId, title, message' }, { status: 400 });
        }

        const { data: notification, error: insertError } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type: type || 'system',
                metadata: metadata || null,
                is_read: false,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            logError('Error creating notification', insertError);
            return NextResponse.json({ error: 'Ошибка создания уведомления' }, { status: 500 });
        }

        // Инвалидируем кэш получателя
        invalidateCache(new RegExp(`notifications_${userId}`));

        return NextResponse.json({ 
            success: true, 
            notification 
        }, { status: 201 });
        
    } catch (error) {
        logError('Error in notifications POST', error);
        return NextResponse.json({ error: 'Ошибка создания уведомления' }, { status: 500 });
    }
}