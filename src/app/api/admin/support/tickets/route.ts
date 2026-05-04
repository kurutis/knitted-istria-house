// app/api/admin/support/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации
const createTicketSchema = z.object({
    subject: z.string().min(3, 'Тема должна содержать минимум 3 символа').max(200),
    category: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    message: z.string().min(1, 'Сообщение не может быть пустым').max(5000),
});

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

// Вспомогательные функции
function getStatusText(status: string): string {
    const statuses: Record<string, string> = {
        'open': 'Открыт',
        'in_progress': 'В обработке',
        'closed': 'Закрыт'
    };
    return statuses[status] || status;
}

function getPriorityText(priority: string): string {
    const priorities: Record<string, string> = {
        'low': 'Низкий',
        'medium': 'Средний',
        'high': 'Высокий'
    };
    return priorities[priority] || priority;
}

function getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
        'low': 'green',
        'medium': 'yellow',
        'high': 'red'
    };
    return colors[priority] || 'gray';
}

function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        'open': 'yellow',
        'in_progress': 'blue',
        'closed': 'green'
    };
    return colors[status] || 'gray';
}

const priorityOrder = { high: 1, medium: 2, low: 3 };

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized admin support tickets access', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const search = searchParams.get('search');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Ключ кэша
        const cacheKey = `admin_tickets_${status || 'all'}_${priority || 'all'}_${search || 'none'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Строим запрос
            let query = supabase
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
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url,
                            phone
                        )
                    )
                `, { count: 'exact' });

            // Фильтр по статусу
            if (status && status !== 'all') {
                query = query.eq('status', status);
            }

            // Фильтр по приоритету
            if (priority && priority !== 'all') {
                query = query.eq('priority', priority);
            }

            // Поиск
            if (search && search.trim()) {
                const safeSearch = sanitize.text(search);
                query = query.or(`users.email.ilike.%${safeSearch}%,users.profiles.full_name.ilike.%${safeSearch}%,subject.ilike.%${safeSearch}%`);
            }

            // Пагинация и сортировка
            const { data: tickets, error, count } = await query
                .order('priority', { ascending: true })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Supabase error in admin tickets GET', error);
                throw new Error('DATABASE_ERROR');
            }

            // Получаем последние сообщения и счетчики непрочитанных
            const ticketIds = tickets?.map(t => t.id) || [];
            const lastMessageMap = new Map();
            const unreadCountMap = new Map();

            if (ticketIds.length > 0) {
                // Получаем последние сообщения
                const { data: lastMessages } = await supabase
                    .from('messages')
                    .select('chat_id, content, created_at, sender_id')
                    .in('chat_id', tickets.map(t => t.chat_id))
                    .order('created_at', { ascending: false });

                lastMessages?.forEach(msg => {
                    if (!lastMessageMap.has(msg.chat_id)) {
                        lastMessageMap.set(msg.chat_id, {
                            content: sanitize.text(msg.content?.substring(0, 100) || ''),
                            created_at: msg.created_at,
                            sender_id: msg.sender_id
                        });
                    }
                });

                // Получаем количество непрочитанных
                const { data: unreadMessages } = await supabase
                    .from('messages')
                    .select('chat_id, sender_id')
                    .in('chat_id', tickets.map(t => t.chat_id))
                    .eq('is_read', false)
                    .neq('sender_id', session.user.id);

                unreadMessages?.forEach(msg => {
                    unreadCountMap.set(msg.chat_id, (unreadCountMap.get(msg.chat_id) || 0) + 1);
                });
            }

            // Форматируем данные
            const formattedTickets = tickets?.map(ticket => {
                const lastMessage = lastMessageMap.get(ticket.chat_id);
                
                return {
                    id: ticket.id,
                    chat_id: ticket.chat_id,
                    user_id: ticket.user_id,
                    subject: sanitize.text(ticket.subject),
                    status: ticket.status,
                    status_text: getStatusText(ticket.status),
                    status_color: getStatusColor(ticket.status),
                    priority: ticket.priority,
                    priority_text: getPriorityText(ticket.priority),
                    priority_color: getPriorityColor(ticket.priority),
                    category: ticket.category,
                    created_at: ticket.created_at,
                    updated_at: ticket.updated_at,
                    closed_at: ticket.closed_at,
                    user_name: sanitize.text(ticket.users?.[0]?.profiles?.[0]?.full_name || ticket.users?.[0]?.email),
                    user_email: sanitize.email(ticket.users?.[0]?.email || ''),
                    user_avatar: ticket.users?.[0]?.profiles?.[0]?.avatar_url,
                    user_phone: sanitize.phone(ticket.users?.[0]?.profiles?.[0]?.phone || ''),
                    last_message: lastMessage?.content || 'Нет сообщений',
                    last_message_time: lastMessage?.created_at || null,
                    last_message_sender: lastMessage?.sender_id,
                    unread_count: unreadCountMap.get(ticket.chat_id) || 0
                };
            }) || [];

            // Сортировка по приоритету и времени
            formattedTickets.sort((a, b) => {
                const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
                                    (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
                if (priorityDiff !== 0) return priorityDiff;
                const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
                const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
                return timeB - timeA;
            });

            // Статистика по статусам и приоритетам
            const allTickets = tickets || [];
            const stats = {
                total: allTickets.length,
                by_status: {
                    open: allTickets.filter(t => t.status === 'open').length,
                    in_progress: allTickets.filter(t => t.status === 'in_progress').length,
                    closed: allTickets.filter(t => t.status === 'closed').length
                },
                by_priority: {
                    high: allTickets.filter(t => t.priority === 'high').length,
                    medium: allTickets.filter(t => t.priority === 'medium').length,
                    low: allTickets.filter(t => t.priority === 'low').length
                }
            };

            return {
                tickets: formattedTickets,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                stats,
                lastUpdated: new Date().toISOString()
            };
        }, 10); // TTL 10 секунд

        logApiRequest('GET', '/api/admin/support', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(result, {
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=10',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30',
                'X-Total-Count': result.pagination.total.toString()
            }
        });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error fetching support tickets', error);
        return NextResponse.json({ error: 'Ошибка загрузки тикетов' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting (только для администраторов)
        const ip = getClientIP(request);
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin ticket creation', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized ticket creation attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = createTicketSchema.parse({
            subject: body.subject,
            category: body.category,
            priority: body.priority,
            message: body.message
        });

        const { subject, category, priority, message } = validatedData;
        const sanitizedSubject = sanitize.text(subject.trim());
        const sanitizedMessage = sanitize.text(message.trim());

        const now = new Date().toISOString();

        // 1. Создаем чат
        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert({
                type: 'support',
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (chatError) {
            logError('Error creating support chat', chatError);
            return NextResponse.json({ error: 'Ошибка создания чата' }, { status: 500 });
        }

        // 2. Добавляем администратора в участники чата
        const { error: participantError } = await supabase
            .from('chat_participants')
            .insert({
                chat_id: chat.id,
                user_id: session.user.id,
                joined_at: now,
                role: 'admin'
            });

        if (participantError) {
            logError('Error adding participant', participantError);
            await supabase.from('chats').delete().eq('id', chat.id);
            return NextResponse.json({ error: 'Ошибка добавления участника' }, { status: 500 });
        }

        // 3. Создаем тикет
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({
                user_id: session.user.id,
                chat_id: chat.id,
                subject: sanitizedSubject,
                category: category || null,
                priority: priority,
                status: 'open',
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (ticketError) {
            logError('Error creating support ticket', ticketError);
            await supabase.from('chats').delete().eq('id', chat.id);
            return NextResponse.json({ error: 'Ошибка создания обращения' }, { status: 500 });
        }

        // 4. Создаем первое сообщение
        const { error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: chat.id,
                sender_id: session.user.id,
                content: sanitizedMessage,
                created_at: now,
                is_read: false
            });

        if (messageError) {
            logError('Error creating message', messageError);
            return NextResponse.json({ error: 'Ошибка создания сообщения' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(/^admin_tickets/);
        invalidateCache(/^user_tickets_/);

        logApiRequest('POST', '/api/admin/support', 201, Date.now() - startTime, session.user.id);
        logInfo(`Admin created support ticket`, { 
            ticketId: ticket.id,
            adminId: session.user.id,
            priority,
            subject: sanitizedSubject.substring(0, 50)
        });

        return NextResponse.json({
            success: true,
            message: 'Обращение успешно создано',
            ticket: {
                id: ticket.id,
                chat_id: chat.id,
                status: 'open',
                status_text: getStatusText('open'),
                priority: priority,
                priority_text: getPriorityText(priority),
                subject: sanitizedSubject
            }
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error creating support ticket', error);
        return NextResponse.json({ error: 'Ошибка создания обращения' }, { status: 500 });
    }
}