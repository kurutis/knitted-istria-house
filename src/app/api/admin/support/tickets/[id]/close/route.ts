import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";
import { notifyTicketUpdate } from "@/lib/websocket-server";

const closeTicketSchema = z.object({
    reason: z.string().max(500, 'Причина не может превышать 500 символов').optional(),
});

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

        const body = await request.json();
        const validatedData = closeTicketSchema.parse({
            reason: body.reason
        });

        const { reason } = validatedData;

        const { data: existingTicket, error: fetchError } = await supabase
            .from('support_tickets')
            .select('status, user_id, subject, chat_id')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket for closing', fetchError);
            return NextResponse.json({ error: 'Ошибка поиска тикета' }, { status: 500 });
        }

        if (existingTicket.status === 'closed') {
            return NextResponse.json({ error: 'Тикет уже закрыт' }, { status: 400 });
        }

        const now = new Date().toISOString();

        const { error: updateError } = await supabase
            .from('support_tickets')
            .update({
                status: 'closed',
                closed_at: now,
                closed_by: session.user.id,
                closed_reason: reason ? sanitize.text(reason) : null,
                updated_at: now
            })
            .eq('id', id);

        if (updateError) {
            logError('Error closing ticket', updateError);
            return NextResponse.json({ error: 'Ошибка закрытия тикета' }, { status: 500 });
        }

        invalidateCache(`support_ticket_${id}`);
        invalidateCache(/^admin_tickets/);
        invalidateCache(new RegExp(`user_chats_${existingTicket.user_id}`));

        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'TICKET_CLOSED',
                entity_type: 'support_ticket',
                entity_id: id,
                new_values: { reason: reason || null },
                created_at: now
            });

        const safeSubject = sanitize.text(existingTicket.subject || '');
        
        await supabase
            .from('notifications')
            .insert({
                user_id: existingTicket.user_id,
                title: '✅ Обращение закрыто',
                message: reason 
                    ? `Ваше обращение "${safeSubject.substring(0, 50)}" закрыто. Причина: ${reason}`
                    : `Ваше обращение "${safeSubject.substring(0, 50)}" закрыто. Спасибо, что обратились к нам!`,
                type: 'support',
                metadata: { ticket_id: id, reason: reason || null },
                created_at: now,
                is_read: false
            });

        await notifyTicketUpdate(id, {
            status: 'closed',
            last_message: '',
            last_message_time: now,
            updated_at: now
        });

        logApiRequest('POST', `/api/admin/support/tickets/${id}/close`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin closed ticket`, { 
            ticketId: id, 
            adminId: session.user.id,
            reason: reason || null
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Тикет успешно закрыт',
            reason: reason || null
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error closing ticket', error);
        return NextResponse.json({ error: 'Ошибка закрытия тикета' }, { status: 500 });
    }
}