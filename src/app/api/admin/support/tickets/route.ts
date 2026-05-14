import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery } from "@/lib/db-optimized";
import { z } from "zod";

// Исправленная схема - все параметры опциональные
const querySchema = z.object({
    status: z.enum(['open', 'in_progress', 'closed', 'all']).optional().default('all'),
    priority: z.enum(['low', 'medium', 'high', 'all']).optional().default('all'),
    search: z.string().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    page: z.coerce.number().int().min(1).optional().default(1)
});

const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

const priorityOrder = { high: 1, medium: 2, low: 3 };

export async function GET(request: Request) {
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

        const { searchParams } = new URL(request.url);
        
        // Получаем параметры с проверкой на null
        const statusParam = searchParams.get('status');
        const priorityParam = searchParams.get('priority');
        const searchParam = searchParams.get('search');
        const limitParam = searchParams.get('limit');
        const pageParam = searchParams.get('page');
        
        // Валидируем
        const validatedParams = querySchema.parse({
            status: statusParam === 'null' ? undefined : statusParam,
            priority: priorityParam === 'null' ? undefined : priorityParam,
            search: searchParam === 'null' ? undefined : searchParam,
            limit: limitParam === 'null' ? undefined : limitParam,
            page: pageParam === 'null' ? undefined : pageParam
        });
        
        const { status, priority, search, limit, page } = validatedParams;
        const offset = (page - 1) * limit;

        const cacheKey = `admin_tickets_${status}_${priority}_${search || 'none'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
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
                    closed_reason,
                    started_at,
                    started_by,
                    users!inner (
                        id,
                        email,
                        is_active,
                        profiles!left (
                            full_name,
                            avatar_url,
                            phone,
                            city
                        )
                    )
                `, { count: 'exact' });

            if (status && status !== 'all') {
                query = query.eq('status', status);
            }

            if (priority && priority !== 'all') {
                query = query.eq('priority', priority);
            }

            const { data: tickets, error, count } = await query
                .order('priority', { ascending: true })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Supabase error in admin tickets GET', error);
                throw new Error('DATABASE_ERROR');
            }

            const ticketIds = tickets?.map(t => t.id) || [];
            const lastMessageMap = new Map();
            const unreadCountMap = new Map();

            if (ticketIds.length > 0) {
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

                const { data: unreadMessages } = await supabase
                    .from('messages')
                    .select('chat_id')
                    .in('chat_id', tickets.map(t => t.chat_id))
                    .eq('is_read', false)
                    .neq('sender_id', session.user.id);

                unreadMessages?.forEach(msg => {
                    unreadCountMap.set(msg.chat_id, (unreadCountMap.get(msg.chat_id) || 0) + 1);
                });
            }

            const formattedTickets = tickets?.map(ticket => {
                const lastMessage = lastMessageMap.get(ticket.chat_id);
                const profile = ticket.users?.[0]?.profiles?.[0];
                
                return {
                    id: ticket.id,
                    chat_id: ticket.chat_id,
                    user_id: ticket.user_id,
                    subject: sanitize.text(ticket.subject || 'Без темы'),
                    status: ticket.status,
                    priority: ticket.priority,
                    category: ticket.category,
                    created_at: ticket.created_at,
                    updated_at: ticket.updated_at,
                    closed_at: ticket.closed_at,
                    closed_reason: ticket.closed_reason,
                    started_at: ticket.started_at,
                    user_name: sanitize.text(profile?.full_name || ticket.users?.[0]?.email),
                    user_email: sanitize.email(ticket.users?.[0]?.email || ''),
                    user_avatar: profile?.avatar_url,
                    user_phone: profile?.phone || '',
                    user_city: profile?.city || '',
                    last_message: lastMessage?.content || 'Нет сообщений',
                    last_message_time: lastMessage?.created_at,
                    unread_count: unreadCountMap.get(ticket.chat_id) || 0
                };
            }) || [];

            formattedTickets.sort((a, b) => {
                const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
                                    (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
                if (priorityDiff !== 0) return priorityDiff;
                if (a.unread_count > 0 && b.unread_count === 0) return -1;
                if (a.unread_count === 0 && b.unread_count > 0) return 1;
                const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
                const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
                return timeB - timeA;
            });

            let filteredTickets = formattedTickets;
            if (search && search.trim()) {
                const query = search.toLowerCase();
                filteredTickets = formattedTickets.filter(t => 
                    t.user_name?.toLowerCase().includes(query) ||
                    t.user_email?.toLowerCase().includes(query) ||
                    t.subject?.toLowerCase().includes(query)
                );
            }

            const allTickets = tickets || [];
            const stats = {
                total: count || 0,
                filtered: filteredTickets.length,
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
                tickets: filteredTickets,
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
        }, 10);

        logApiRequest('GET', '/api/admin/support/tickets', 200, Date.now() - startTime, session.user.id);

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
            console.error('Validation error:', error.issues);
            return NextResponse.json({ 
                error: 'Неверные параметры запроса',
                details: error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`)
            }, { status: 400 });
        }
        logError('Error fetching support tickets', error);
        return NextResponse.json({ error: 'Ошибка загрузки тикетов' }, { status: 500 });
    }
}