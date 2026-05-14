import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/db-optimized";

const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

function getDeclension(count: number, one: string, two: string, five: string): string {
    const num = Math.abs(count);
    if (num >= 5 && num <= 20) return five;
    const lastDigit = num % 10;
    if (lastDigit === 1) return one;
    if (lastDigit >= 2 && lastDigit <= 4) return two;
    return five;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id, user_id, status')
            .eq('id', id)
            .single();

        if (ticketError) {
            if (ticketError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error finding ticket for read marking', ticketError);
            return NextResponse.json({ error: 'Ошибка при поиске тикета' }, { status: 500 });
        }

        const { count: unreadBefore, error: countError } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('chat_id', ticket.chat_id)
            .neq('sender_id', session.user.id)
            .eq('is_read', false)
            .eq('is_deleted', false);

        if (countError) {
            logError('Error counting unread messages', countError, 'warning');
        }

        const now = new Date().toISOString();

        const { data: updatedMessages, error: updateError } = await supabase
            .from('messages')
            .update({ 
                is_read: true,
                read_at: now,
                updated_at: now
            })
            .eq('chat_id', ticket.chat_id)
            .neq('sender_id', session.user.id)
            .eq('is_read', false)
            .select('id');

        if (updateError) {
            logError('Error marking messages as read', updateError);
            return NextResponse.json({ error: 'Ошибка при отметке сообщений' }, { status: 500 });
        }

        const messagesReadCount = updatedMessages?.length || 0;

        invalidateCache(new RegExp(`chat_messages_${ticket.chat_id}`));
        invalidateCache(/^admin_tickets/);
        invalidateCache(`support_ticket_${id}`);

        if (messagesReadCount > 0) {
            await supabase
                .from('audit_logs')
                .insert({
                    user_id: session.user.id,
                    action: 'TICKET_MESSAGES_READ',
                    entity_type: 'support_ticket',
                    entity_id: id,
                    new_values: { 
                        messages_read: messagesReadCount,
                        chat_id: ticket.chat_id
                    },
                    created_at: now
                });

            if (ticket.user_id) {
                const messageWord = getDeclension(messagesReadCount, 'сообщение', 'сообщения', 'сообщений');
                
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: ticket.user_id,
                        title: '👁️ Сообщения прочитаны',
                        message: `Администратор прочитал ${messagesReadCount} ${messageWord} в вашем обращении`,
                        type: 'support',
                        metadata: { ticket_id: id, count: messagesReadCount },
                        created_at: now,
                        is_read: false
                    });
            }
        }

        logApiRequest('POST', `/api/admin/support/tickets/${id}/read`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            success: true,
            messages_read: messagesReadCount,
            had_unread: (unreadBefore || 0) > 0,
            message: messagesReadCount > 0 
                ? `Отмечено как прочитанное: ${messagesReadCount} ${getDeclension(messagesReadCount, 'сообщение', 'сообщения', 'сообщений')}`
                : 'Непрочитанных сообщений не найдено'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error marking ticket messages as read', error);
        return NextResponse.json({ error: 'Ошибка при обработке запроса' }, { status: 500 });
    }
}