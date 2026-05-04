// app/api/admin/support/[id]/priority/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации
const updatePrioritySchema = z.object({
    priority: z.enum(['low', 'medium', 'high']),
});

// Rate limiting
const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Текстовое описание приоритетов
const priorityText: Record<string, string> = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий'
};

// Цвета для приоритетов (для UI)
const priorityColor: Record<string, string> = {
    low: 'green',
    medium: 'yellow',
    high: 'red'
};

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
            logInfo('Rate limit exceeded for ticket priority update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized ticket priority update attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID тикета
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = updatePrioritySchema.parse({
            priority: body.priority
        });

        const { priority } = validatedData;

        // Получаем старый приоритет для аудита
        const { data: oldTicket, error: fetchError } = await supabase
            .from('support_tickets')
            .select('id, priority, status, subject, user_id')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                logInfo('Support ticket not found for priority update', { ticketId: id });
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket for priority update', fetchError);
            return NextResponse.json({ error: 'Ошибка поиска тикета' }, { status: 500 });
        }

        // Предотвращение повторного обновления (если приоритет не изменился)
        if (oldTicket.priority === priority) {
            logInfo('Priority already set, skipping update', { ticketId: id, priority });
            return NextResponse.json({ 
                success: true, 
                message: 'Приоритет уже установлен',
                priority: priority,
                priority_text: priorityText[priority]
            }, { status: 200 });
        }

        const now = new Date().toISOString();

        // Обновляем приоритет
        const { data: updatedTicket, error: updateError } = await supabase
            .from('support_tickets')
            .update({
                priority: priority,
                updated_at: now
            })
            .eq('id', id)
            .select('id, priority')
            .single();

        if (updateError) {
            logError('Error updating ticket priority', updateError);
            return NextResponse.json({ error: 'Ошибка обновления приоритета' }, { status: 500 });
        }

        // Инвалидируем кэш тикета и списка тикетов
        invalidateCache(`support_ticket_${id}`);
        invalidateCache(/^admin_support_tickets/);

        // Логируем действие администратора
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

        // Отправляем уведомление пользователю (если приоритет повышен до high)
        if (priority === 'high' && oldTicket.priority !== 'high') {
            await supabase
                .from('notifications')
                .insert({
                    user_id: oldTicket.user_id,
                    title: '🔔 Приоритет вашего обращения повышен',
                    message: `Приоритет вашего обращения "${sanitize.text(oldTicket.subject?.substring(0, 50) || '')}" изменён на "Высокий". Мы уделим ему особое внимание.`,
                    type: 'support_ticket',
                    metadata: { 
                        ticket_id: id, 
                        priority: priority,
                        old_priority: oldTicket.priority
                    },
                    created_at: now,
                    is_read: false
                });
        } else if (priority !== oldTicket.priority) {
            // Уведомление о любом изменении приоритета
            await supabase
                .from('notifications')
                .insert({
                    user_id: oldTicket.user_id,
                    title: 'Приоритет обращения изменён',
                    message: `Приоритет вашего обращения "${sanitize.text(oldTicket.subject?.substring(0, 50) || '')}" изменён с "${priorityText[oldTicket.priority]}" на "${priorityText[priority]}"`,
                    type: 'support_ticket',
                    metadata: { 
                        ticket_id: id, 
                        priority: priority,
                        old_priority: oldTicket.priority
                    },
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('PUT', `/api/admin/support/${id}/priority`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin updated ticket priority`, { 
            ticketId: id, 
            adminId: session.user.id,
            oldPriority: oldTicket.priority,
            newPriority: priority,
            ticketStatus: oldTicket.status
        });

        return NextResponse.json({ 
            success: true, 
            message: `Приоритет тикета изменён на "${priorityText[priority]}"`,
            priority: priority,
            priority_text: priorityText[priority],
            priority_color: priorityColor[priority]
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating ticket priority', error);
        return NextResponse.json({ error: 'Ошибка обновления приоритета' }, { status: 500 });
    }
}

// GET - получить текущий приоритет тикета
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
            .select('priority')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket priority', fetchError);
            return NextResponse.json({ error: 'Ошибка загрузки приоритета' }, { status: 500 });
        }

        logApiRequest('GET', `/api/admin/support/${id}/priority`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            priority: ticket.priority,
            priority_text: priorityText[ticket.priority],
            priority_color: priorityColor[ticket.priority]
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching ticket priority', error);
        return NextResponse.json({ error: 'Ошибка загрузки приоритета' }, { status: 500 });
    }
}

// PATCH - быстрое изменение приоритета (альтернативный метод)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const priority = searchParams.get('priority');

        if (!priority || !['low', 'medium', 'high'].includes(priority)) {
            return NextResponse.json({ error: 'Неверное значение приоритета' }, { status: 400 });
        }

        // Используем ту же логику, что и в PUT
        const requestBody = { priority };
        const newRequest = new Request(request.url, {
            method: 'PUT',
            body: JSON.stringify(requestBody),
            headers: request.headers
        });

        // Вызываем PUT метод
        return await PUT(newRequest, { params });
        
    } catch (error) {
        logError('Error in PATCH priority', error);
        return NextResponse.json({ error: 'Ошибка изменения приоритета' }, { status: 500 });
    }
}