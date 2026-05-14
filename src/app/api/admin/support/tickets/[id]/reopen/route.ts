import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/db-optimized";
import { notifyTicketUpdate } from "@/lib/websocket-server";

const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

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

        const { data: existingTicket, error: fetchError } = await supabase
            .from('support_tickets')
            .select('status, user_id, subject, chat_id')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket for reopening', fetchError);
            return NextResponse.json({ error: 'Ошибка поиска тикета' }, { status: 500 });
        }

        if (existingTicket.status !== 'closed') {
            return NextResponse.json({ error: 'Можно переоткрыть только закрытый тикет' }, { status: 400 });
        }

        const now = new Date().toISOString();

        const { error: updateError } = await supabase
            .from('support_tickets')
            .update({
                status: 'open',
                closed_at: null,
                closed_by: null,
                closed_reason: null,
                updated_at: now
            })
            .eq('id', id);

        if (updateError) {
            logError('Error reopening ticket', updateError);
            return NextResponse.json({ error: 'Ошибка переоткрытия тикета' }, { status: 500 });
        }

        invalidateCache(`support_ticket_${id}`);
        invalidateCache(/^admin_tickets/);
        invalidateCache(new RegExp(`user_chats_${existingTicket.user_id}`));

        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'TICKET_REOPENED',
                entity_type: 'support_ticket',
                entity_id: id,
                created_at: now
            });

        await supabase
            .from('notifications')
            .insert({
                user_id: existingTicket.user_id,
                title: '🔄 Обращение открыто заново',
                message: `Ваше обращение "${existingTicket.subject?.substring(0, 50) || ''}" снова открыто.`,
                type: 'support',
                metadata: { ticket_id: id },
                created_at: now,
                is_read: false
            });

        await notifyTicketUpdate(id, {
            status: 'open',
            last_message: '',
            last_message_time: now,
            updated_at: now
        });

        logApiRequest('POST', `/api/admin/support/tickets/${id}/reopen`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin reopened ticket`, { ticketId: id, adminId: session.user.id });

        return NextResponse.json({ 
            success: true, 
            message: 'Тикет успешно переоткрыт'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error reopening ticket', error);
        return NextResponse.json({ error: 'Ошибка переоткрытия тикета' }, { status: 500 });
    }
}