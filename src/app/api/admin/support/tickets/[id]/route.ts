import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery } from "@/lib/db-optimized";
import { z } from "zod";

const paramsSchema = z.object({
    id: z.string().uuid('Неверный формат ID тикета')
});

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

export async function GET(
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
        const validationResult = paramsSchema.safeParse({ id });
        if (!validationResult.success) {
            return NextResponse.json({ error: validationResult.error.issues[0].message }, { status: 400 });
        }

        const cacheKey = `support_ticket_${id}`;
        
        const ticket = await cachedQuery(cacheKey, async () => {
            const { data: ticketData, error } = await supabase
                .from('support_tickets')
                .select(`
                    id,
                    chat_id,
                    user_id,
                    subject,
                    status,
                    priority,
                    category,
                    created_at,
                    updated_at,
                    closed_at,
                    closed_reason,
                    started_at,
                    started_by,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url,
                            phone,
                            city
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }

            const profile = ticketData.users?.[0]?.profiles?.[0];
            
            // Получаем количество сообщений
            const { count: messagesCount } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('chat_id', ticketData.chat_id);

            // Получаем количество непрочитанных
            const { count: unreadCount } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('chat_id', ticketData.chat_id)
                .neq('sender_id', session.user.id)
                .eq('is_read', false);

            return {
                id: ticketData.id,
                chat_id: ticketData.chat_id,
                user_id: ticketData.user_id,
                user_name: sanitize.text(profile?.full_name || ticketData.users?.[0]?.email),
                user_email: sanitize.email(ticketData.users?.[0]?.email || ''),
                user_avatar: profile?.avatar_url,
                user_phone: profile?.phone || '',
                user_city: profile?.city || '',
                subject: sanitize.text(ticketData.subject || 'Без темы'),
                status: ticketData.status,
                priority: ticketData.priority,
                category: ticketData.category,
                created_at: ticketData.created_at,
                updated_at: ticketData.updated_at,
                closed_at: ticketData.closed_at,
                closed_reason: ticketData.closed_reason,
                started_at: ticketData.started_at,
                messages_count: messagesCount || 0,
                unread_count: unreadCount || 0
            };
        }, 30);

        if (!ticket) {
            return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
        }

        logApiRequest('GET', `/api/admin/support/tickets/${id}`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(ticket, { status: 200 });
        
    } catch (error) {
        logError('Error fetching ticket details', error);
        return NextResponse.json({ error: 'Ошибка загрузки тикета' }, { status: 500 });
    }
}