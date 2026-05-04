import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";
import { z } from "zod";

// Схема валидации
const paramsSchema = z.object({
    id: z.string().uuid('Неверный формат ID чата')
});

// Rate limiting для отметки прочтения
const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 запросов в минуту

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

        // Валидация ID чата
        const { id } = await params;
        const validationResult = paramsSchema.safeParse({ id });
        if (!validationResult.success) {
            return NextResponse.json({ 
                error: validationResult.error.issues[0].message 
            }, { status: 400 });
        }

        // Проверяем доступ к чату (с кэшем)
        const hasAccess = await checkChatAccess(id, session.user.id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Получаем количество непрочитанных сообщений до обновления (для аналитики)
        const { count: unreadCount, error: countError } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', id)
            .neq('sender_id', session.user.id)
            .eq('is_read', false);

        if (countError) {
            logError('Error counting unread messages', countError, 'warning');
        }

        // Оптимизированное обновление: только если есть что обновлять
        let updatedCount = 0;
        
        if (unreadCount && unreadCount > 0) {
            // Отмечаем сообщения как прочитанные
            const { data: updatedMessages, error: updateError } = await supabase
                .from('messages')
                .update({ 
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('chat_id', id)
                .neq('sender_id', session.user.id)
                .eq('is_read', false)
                .select('id');

            if (updateError) {
                logError('Error marking messages as read', updateError);
                return NextResponse.json({ error: 'Ошибка при обновлении сообщений' }, { status: 500 });
            }

            updatedCount = updatedMessages?.length || 0;
        }

        // Инвалидируем кэш сообщений
        invalidateCache(new RegExp(`chat_messages_${id}`));
        
        // Обновляем счетчик непрочитанных в чате (если есть такая колонка)
        await supabase
            .from('chat_participants')
            .update({ 
                last_read_at: new Date().toISOString(),
                unread_count: 0
            })
            .eq('chat_id', id)
            .eq('user_id', session.user.id);

        // Логируем действие
        if (updatedCount > 0) {
            logInfo('Messages marked as read', {
                chatId: id,
                userId: session.user.id,
                count: updatedCount,
                duration: Date.now() - startTime
            });
        }

        return NextResponse.json({ 
            success: true,
            marked_count: updatedCount,
            message: updatedCount > 0 
                ? `${updatedCount} сообщений отмечено как прочитанные` 
                : 'Нет новых сообщений'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in mark messages as read', error);
        return NextResponse.json({ 
            error: 'Ошибка при отметке сообщений' 
        }, { status: 500 });
    }
}

// Альтернативная версия для отметки конкретного сообщения
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('messageId');

        if (!messageId) {
            return NextResponse.json({ error: 'ID сообщения обязателен' }, { status: 400 });
        }

        const messageIdValidation = z.string().uuid().safeParse(messageId);
        if (!messageIdValidation.success) {
            return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 });
        }

        // Проверяем, что пользователь имеет доступ к сообщению
        const { data: message, error: checkError } = await supabase
            .from('messages')
            .select(`
                id,
                chat_id,
                chat_participants!inner (
                    user_id
                )
            `)
            .eq('id', messageId)
            .eq('chat_participants.user_id', session.user.id)
            .single();

        if (checkError || !message) {
            return NextResponse.json({ error: 'Сообщение не найдено или доступ запрещен' }, { status: 404 });
        }

        // Отмечаем конкретное сообщение как прочитанное
        const { error: updateError } = await supabase
            .from('messages')
            .update({ 
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', messageId)
            .eq('is_read', false);

        if (updateError) {
            logError('Error marking message as read', updateError);
            return NextResponse.json({ error: 'Ошибка при обновлении сообщения' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`chat_messages_${message.chat_id}`));

        return NextResponse.json({ 
            success: true,
            message: 'Сообщение отмечено как прочитанное'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error marking message as read', error);
        return NextResponse.json({ error: 'Ошибка при отметке сообщения' }, { status: 500 });
    }
}

// GET - получить количество непрочитанных сообщений
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        const validationResult = paramsSchema.safeParse({ id });
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Неверный формат ID чата' }, { status: 400 });
        }

        // Проверяем доступ
        const hasAccess = await checkChatAccess(id, session.user.id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Кэшируем количество непрочитанных (5 секунд)
        const cacheKey = `chat_unread_${id}_${session.user.id}`;
        const unreadCount = await cachedQuery(cacheKey, async () => {
            const { count, error } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('chat_id', id)
                .neq('sender_id', session.user.id)
                .eq('is_read', false);

            if (error) {
                logError('Error counting unread messages', error);
                return 0;
            }

            return count || 0;
        });

        return NextResponse.json({ 
            unread_count: unreadCount 
        }, { status: 200 });
        
    } catch (error) {
        logError('Error getting unread count', error);
        return NextResponse.json({ 
            unread_count: 0 
        }, { status: 500 });
    }
}

// Вспомогательная функция для проверки доступа к чату
async function checkChatAccess(chatId: string, userId: string): Promise<boolean> {
    const cacheKey = `chat_access_${chatId}_${userId}`;
    
    try {
        const hasAccess = await cachedQuery(cacheKey, async () => {
            const { data: participant, error } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('chat_id', chatId)
                .eq('user_id', userId)
                .maybeSingle();

            return !error && !!participant;
        });
        
        return hasAccess;
    } catch (error) {
        return false;
    }
}