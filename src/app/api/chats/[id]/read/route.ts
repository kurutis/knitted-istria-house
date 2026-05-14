import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

const paramsSchema = z.object({
    id: z.string().uuid('Неверный формат ID чата')
});

const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function checkChatAccess(chatId: string, userId: string): Promise<boolean> {
    const { data: participant, error } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .maybeSingle();

    return !error && !!participant;
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

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        const validationResult = paramsSchema.safeParse({ id });
        if (!validationResult.success) {
            return NextResponse.json({ 
                error: validationResult.error.issues[0].message 
            }, { status: 400 });
        }

        const hasAccess = await checkChatAccess(id, session.user.id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const { count: unreadCount, error: countError } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', id)
            .neq('sender_id', session.user.id)
            .eq('is_read', false);

        if (countError) {
            logError('Error counting unread messages', countError, 'warning');
        }

        let updatedCount = 0;
        
        if (unreadCount && unreadCount > 0) {
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

        invalidateCache(new RegExp(`chat_messages_${id}`));
        
        await supabase
            .from('chat_participants')
            .update({ 
                last_read_at: new Date().toISOString(),
                unread_count: 0
            })
            .eq('chat_id', id)
            .eq('user_id', session.user.id);

        if (updatedCount > 0) {
            logInfo('Messages marked as read', {
                chatId: id,
                userId: session.user.id,
                count: updatedCount,
                duration: Date.now() - startTime
            });
        }

        logApiRequest('POST', `/api/chats/${id}/read`, 200, Date.now() - startTime, session.user.id);

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