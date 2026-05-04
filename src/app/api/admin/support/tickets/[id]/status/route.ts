// app/api/admin/support/[id]/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

interface TicketUpdateData {
    status: string
    updated_at: string
    closed_at?: string | null
    closed_by?: string | null
    closed_reason?: string | null
    started_at?: string | null
    started_by?: string | null
}

// Схема валидации
const updateStatusSchema = z.object({
    status: z.enum(['open', 'in_progress', 'closed']),
    reason: z.string().max(500, 'Причина не может превышать 500 символов').optional(),
});

// Rate limiting
const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

// Текстовое описание статусов
const statusText: Record<string, string> = {
    'open': 'Открыт',
    'in_progress': 'В обработке',
    'closed': 'Закрыт'
};

// Цвета статусов для UI
const statusColor: Record<string, string> = {
    'open': 'yellow',
    'in_progress': 'blue',
    'closed': 'green'
};

// Допустимые переходы между статусами
const allowedTransitions: Record<string, string[]> = {
    'open': ['in_progress', 'closed'],
    'in_progress': ['closed', 'open'],
    'closed': ['open']
};

// Валидация UUID
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
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for ticket status update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized ticket status update attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID тикета
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = updateStatusSchema.parse({
            status: body.status,
            reason: body.reason
        });

        const { status, reason } = validatedData;

        // Получаем текущий статус тикета
        const { data: existingTicket, error: fetchError } = await supabase
            .from('support_tickets')
            .select('status, user_id, subject, chat_id')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                logInfo('Support ticket not found for status update', { ticketId: id });
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket for status update', fetchError);
            return NextResponse.json({ error: 'Ошибка поиска тикета' }, { status: 500 });
        }

        // Проверка допустимости перехода
        if (!allowedTransitions[existingTicket.status]?.includes(status)) {
            logInfo('Invalid status transition attempted', { 
                ticketId: id, 
                from: existingTicket.status, 
                to: status 
            });
            return NextResponse.json({ 
                error: `Невозможно изменить статус с "${statusText[existingTicket.status]}" на "${statusText[status]}"`,
                allowed: allowedTransitions[existingTicket.status]
            }, { status: 400 });
        }

        // Предотвращение повторного обновления
        if (existingTicket.status === status) {
            return NextResponse.json({ 
                success: true, 
                message: `Статус уже установлен как "${statusText[status]}"`,
                status: status,
                status_text: statusText[status],
                status_color: statusColor[status]
            }, { status: 200 });
        }

        const now = new Date().toISOString();

        // Обновляем статус тикета
        const updateData: TicketUpdateData = {
            status: status,
            updated_at: now
        };

        // Если тикет закрывается, добавляем время закрытия и причину
        if (status === 'closed') {
            updateData.closed_at = now;
            updateData.closed_by = session.user.id;
            if (reason) updateData.closed_reason = sanitize.text(reason);
        }

        // Если тикет открывается заново, очищаем информацию о закрытии
        if (status === 'open' && existingTicket.status === 'closed') {
            updateData.closed_at = null;
            updateData.closed_by = null;
            updateData.closed_reason = null;
        }

        // Если тикет переходит в работу
        if (status === 'in_progress' && existingTicket.status === 'open') {
            updateData.started_at = now;
            updateData.started_by = session.user.id;
        }

        const { data: updatedTicket, error: updateError } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', id)
            .select('id, status')
            .single();

        if (updateError) {
            logError('Error updating ticket status', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(`support_ticket_${id}`);
        invalidateCache(/^admin_support_tickets/);

        // Логируем действие администратора
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'TICKET_STATUS_CHANGED',
                entity_type: 'support_ticket',
                entity_id: id,
                old_values: { status: existingTicket.status },
                new_values: { status: status, reason: reason || null },
                created_at: now
            });

        // Отправляем уведомление пользователю
        const safeSubject = sanitize.text(existingTicket.subject || '');
        
        const notificationMessages: Record<string, { title: string; message: string }> = {
            'open': {
                title: '🔄 Обращение открыто заново',
                message: `Ваше обращение "${safeSubject.substring(0, 50)}" снова открыто.`
            },
            'in_progress': {
                title: '👨‍💻 Обращение взято в работу',
                message: `Ваше обращение "${safeSubject.substring(0, 50)}" взято в работу. Скоро вы получите ответ.`
            },
            'closed': {
                title: '✅ Обращение закрыто',
                message: reason 
                    ? `Ваше обращение "${safeSubject.substring(0, 50)}" закрыто. Причина: ${reason}`
                    : `Ваше обращение "${safeSubject.substring(0, 50)}" закрыто. Спасибо, что обратились к нам!`
            }
        };

        const config = notificationMessages[status];
        if (config && existingTicket.user_id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: existingTicket.user_id,
                    title: config.title,
                    message: config.message,
                    type: 'support_ticket',
                    metadata: { 
                        ticket_id: id, 
                        old_status: existingTicket.status, 
                        new_status: status,
                        reason: reason || null
                    },
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('PUT', `/api/admin/support/${id}/status`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin updated ticket status`, { 
            ticketId: id, 
            adminId: session.user.id,
            oldStatus: existingTicket.status,
            newStatus: status,
            reason: reason || null
        });

        return NextResponse.json({ 
            success: true, 
            message: `Статус тикета изменён с "${statusText[existingTicket.status]}" на "${statusText[status]}"`,
            status: status,
            status_text: statusText[status],
            status_color: statusColor[status],
            old_status: existingTicket.status,
            old_status_text: statusText[existingTicket.status],
            reason: reason || null
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating ticket status', error);
        return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
    }
}

// GET - получить текущий статус тикета
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

        const { id } = await params;
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        const { data: ticket, error: fetchError } = await supabase
            .from('support_tickets')
            .select('status, closed_at, closed_reason, started_at')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket status', fetchError);
            return NextResponse.json({ error: 'Ошибка загрузки статуса' }, { status: 500 });
        }

        // Получаем возможные следующие статусы
        const nextStatuses = allowedTransitions[ticket.status] || [];

        logApiRequest('GET', `/api/admin/support/${id}/status`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            status: ticket.status,
            status_text: statusText[ticket.status],
            status_color: statusColor[ticket.status],
            next_statuses: nextStatuses.map(s => ({
                value: s,
                text: statusText[s],
                color: statusColor[s]
            })),
            closed_at: ticket.closed_at,
            closed_reason: ticket.closed_reason,
            started_at: ticket.started_at
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching ticket status', error);
        return NextResponse.json({ error: 'Ошибка загрузки статуса' }, { status: 500 });
    }
}