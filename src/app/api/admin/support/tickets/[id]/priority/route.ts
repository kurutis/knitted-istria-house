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

const updatePrioritySchema = z.object({
    priority: z.enum(['low', 'medium', 'high']),
});

const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

const priorityText: Record<string, string> = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий'
};

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function PUT(
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
        const validatedData = updatePrioritySchema.parse({
            priority: body.priority
        });

        const { priority } = validatedData;

        const { data: oldTicket, error: fetchError } = await supabase
            .from('support_tickets')
            .select('id, priority, status, subject, user_id')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket for priority update', fetchError);
            return NextResponse.json({ error: 'Ошибка поиска тикета' }, { status: 500 });
        }

        if (oldTicket.priority === priority) {
            return NextResponse.json({ 
                success: true, 
                message: 'Приоритет уже установлен',
                priority: priority,
                priority_text: priorityText[priority]
            }, { status: 200 });
        }

        const now = new Date().toISOString();

        const { error: updateError } = await supabase
            .from('support_tickets')
            .update({
                priority: priority,
                updated_at: now
            })
            .eq('id', id);

        if (updateError) {
            logError('Error updating ticket priority', updateError);
            return NextResponse.json({ error: 'Ошибка обновления приоритета' }, { status: 500 });
        }

        invalidateCache(`support_ticket_${id}`);
        invalidateCache(/^admin_tickets/);
        invalidateCache(new RegExp(`user_chats_${oldTicket.user_id}`));

        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'TICKET_PRIORITY_CHANGED',
                entity_type: 'support_ticket',
                entity_id: id,
                old_values: { priority: oldTicket.priority },
                new_values: { priority: priority },
                created_at: now
            });

        const safeSubject = sanitize.text(oldTicket.subject || '');
        
        if (priority === 'high' && oldTicket.priority !== 'high') {
            await supabase
                .from('notifications')
                .insert({
                    user_id: oldTicket.user_id,
                    title: '🔔 Приоритет вашего обращения повышен',
                    message: `Приоритет вашего обращения "${safeSubject.substring(0, 50)}" изменён на "Высокий". Мы уделим ему особое внимание.`,
                    type: 'support',
                    metadata: { 
                        ticket_id: id, 
                        priority: priority,
                        old_priority: oldTicket.priority
                    },
                    created_at: now,
                    is_read: false
                });
        } else if (priority !== oldTicket.priority) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: oldTicket.user_id,
                    title: 'Приоритет обращения изменён',
                    message: `Приоритет вашего обращения "${safeSubject.substring(0, 50)}" изменён с "${priorityText[oldTicket.priority]}" на "${priorityText[priority]}"`,
                    type: 'support',
                    metadata: { 
                        ticket_id: id, 
                        priority: priority,
                        old_priority: oldTicket.priority
                    },
                    created_at: now,
                    is_read: false
                });
        }

        await notifyTicketUpdate(id, {
            status: oldTicket.status,
            last_message: '',
            last_message_time: now,
            updated_at: now
        });

        logApiRequest('PUT', `/api/admin/support/tickets/${id}/priority`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            success: true, 
            message: `Приоритет тикета изменён на "${priorityText[priority]}"`,
            priority: priority,
            priority_text: priorityText[priority]
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating ticket priority', error);
        return NextResponse.json({ error: 'Ошибка обновления приоритета' }, { status: 500 });
    }
}