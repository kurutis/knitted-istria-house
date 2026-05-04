import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting для создания тикетов
const limiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 }); // 5 тикетов в час

// Приветственное сообщение
const WELCOME_MESSAGE = 'Здравствуйте! Чем могу помочь? Опишите вашу проблему, и мы постараемся решить её в ближайшее время.';
const MAX_TICKETS_PER_USER = 10; // Максимум открытых тикетов

// Функция для получения IP (без request в POST)
function getClientIP(headers: Headers): string {
    return headers.get('x-forwarded-for') || 
           headers.get('x-real-ip') || 
           'unknown';
}

export async function POST(request: Request) {  // <-- Добавили request
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting - используем request
        const ip = getClientIP(request.headers);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через час.' 
            }, { status: 429 });
        }

        // Проверяем, нет ли уже открытого тикета у пользователя
        const { data: existingTicket, error: checkError } = await supabase
            .from('support_tickets')
            .select('id, status, chat_id')
            .eq('user_id', session.user.id)
            .in('status', ['open', 'in_progress'])
            .maybeSingle();

        if (checkError) {
            logError('Error checking existing ticket', checkError);
        }

        if (existingTicket) {
            return NextResponse.json({ 
                error: 'У вас уже есть открытый тикет. Пожалуйста, дождитесь ответа поддержки.',
                ticket_id: existingTicket.id,
                status: existingTicket.status
            }, { status: 400 });
        }

        // Проверяем количество тикетов пользователя
        const { count: ticketsCount, error: countError } = await supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (!countError && ticketsCount && ticketsCount >= MAX_TICKETS_PER_USER) {
            return NextResponse.json({ 
                error: `Превышен лимит тикетов (${MAX_TICKETS_PER_USER} в месяц)`
            }, { status: 400 });
        }

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
            return NextResponse.json({ error: 'Ошибка создания чата поддержки' }, { status: 500 });
        }

        // 2. Добавляем пользователя в участники
        const { error: participantError } = await supabase
            .from('chat_participants')
            .insert({ 
                chat_id: chat.id, 
                user_id: session.user.id,
                joined_at: now,
                last_read_at: now,
                unread_count: 0
            });

        if (participantError) {
            logError('Error adding participant', participantError);
            await supabase.from('chats').delete().eq('id', chat.id);
            return NextResponse.json({ error: 'Ошибка добавления участника' }, { status: 500 });
        }

        // 3. Находим администратора
        const { data: admin, error: adminError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (adminError) {
            logError('Error finding admin', adminError, 'warning');
        }

        let adminId = null;
        let adminAdded = false;

        if (admin) {
            adminId = admin.id;
            const { error: addAdminError } = await supabase
                .from('chat_participants')
                .insert({ 
                    chat_id: chat.id, 
                    user_id: admin.id,
                    joined_at: now,
                    role: 'admin'
                });
            
            if (!addAdminError) {
                adminAdded = true;
            }
        }

        // 4. Создаем тикет
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({
                user_id: session.user.id,
                chat_id: chat.id,
                status: 'open',
                priority: 'normal',
                created_at: now,
                updated_at: now,
                source: 'api'
            })
            .select()
            .single();

        if (ticketError) {
            logError('Error creating support ticket', ticketError);
            await supabase.from('chats').delete().eq('id', chat.id);
            return NextResponse.json({ error: 'Ошибка создания тикета' }, { status: 500 });
        }

        // 5. Отправляем приветственное сообщение
        let welcomeMessageSent = false;
        
        if (adminId) {
            const { error: messageError } = await supabase
                .from('messages')
                .insert({
                    chat_id: chat.id,
                    sender_id: adminId,
                    content: WELCOME_MESSAGE,
                    is_read: false,
                    created_at: now
                });

            if (!messageError) {
                welcomeMessageSent = true;
            } else {
                logError('Error sending welcome message', messageError, 'warning');
            }
        }

        // Логируем создание тикета
        logInfo('Support ticket created', {
            ticketId: ticket.id,
            chatId: chat.id,
            userId: session.user.id,
            adminAdded,
            welcomeMessageSent,
            duration: Date.now() - startTime,
            ip: ip.substring(0, 15) // логируем только часть IP для безопасности
        });

        // Инвалидируем кэш
        invalidateCache(new RegExp(`user_tickets_${session.user.id}`));
        invalidateCache(new RegExp(`chat_messages_${chat.id}`));

        // Формируем ответ
        const response = {
            success: true,
            id: chat.id,
            ticket_id: ticket.id,
            type: 'support',
            participant_id: adminId || 'support',
            participant_name: adminId ? 'Поддержка' : 'Ожидание администратора',
            participant_avatar: null,
            last_message: welcomeMessageSent ? WELCOME_MESSAGE : null,
            last_message_time: now,
            unread_count: welcomeMessageSent ? 1 : 0,
            ticket_status: ticket.status,
            ticket_priority: ticket.priority,
            created_at: now
        };

        return NextResponse.json(response, { status: 201 });
        
    } catch (error) {
        logError('Error creating support ticket', error);
        return NextResponse.json({ 
            error: 'Ошибка создания тикета поддержки' 
        }, { status: 500 });
    }
}

// GET эндпоинт для получения статуса тикета
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticketId');

        // Разделяем запросы на два отдельных
        if (ticketId && ticketId !== 'null') {
            // Получаем конкретный тикет
            const { data: ticket, error } = await supabase
                .from('support_tickets')
                .select(`
                    id,
                    status,
                    priority,
                    created_at,
                    updated_at,
                    resolved_at,
                    chat_id
                `)
                .eq('id', ticketId)
                .eq('user_id', session.user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return NextResponse.json({ 
                        has_active_ticket: false,
                        ticket: null 
                    });
                }
                logError('Error fetching ticket status', error);
                return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 });
            }

            return NextResponse.json({
                has_active_ticket: ticket.status === 'open' || ticket.status === 'in_progress',
                ticket: {
                    id: ticket.id,
                    status: ticket.status,
                    priority: ticket.priority,
                    created_at: ticket.created_at,
                    updated_at: ticket.updated_at,
                    chat_id: ticket.chat_id
                }
            });
        } else {
            // Получаем открытый тикет
            const { data: ticket, error } = await supabase
                .from('support_tickets')
                .select(`
                    id,
                    status,
                    priority,
                    created_at,
                    updated_at,
                    resolved_at,
                    chat_id
                `)
                .eq('user_id', session.user.id)
                .eq('status', 'open')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                logError('Error fetching open ticket', error);
                return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 });
            }

            if (!ticket) {
                return NextResponse.json({ 
                    has_active_ticket: false,
                    ticket: null 
                });
            }

            return NextResponse.json({
                has_active_ticket: true,
                ticket: {
                    id: ticket.id,
                    status: ticket.status,
                    priority: ticket.priority,
                    created_at: ticket.created_at,
                    updated_at: ticket.updated_at,
                    chat_id: ticket.chat_id
                }
            });
        }
        
    } catch (error) {
        logError('Error getting ticket status', error);
        return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 });
    }
}