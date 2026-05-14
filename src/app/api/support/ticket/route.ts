import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/db-optimized";

const limiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });
const MAX_TICKETS_PER_USER = 10;
const WELCOME_MESSAGE = 'Здравствуйте! Чем могу помочь? Опишите вашу проблему, и мы постараемся решить её в ближайшее время.';

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for ticket creation', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через час.' 
            }, { status: 429 });
        }

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
            const { data: chat } = await supabase
                .from('chats')
                .select('*')
                .eq('id', existingTicket.chat_id)
                .single();

            return NextResponse.json({
                id: chat?.id,
                type: 'support',
                participant_id: 'support',
                participant_name: 'Поддержка',
                participant_avatar: null,
                last_message: chat?.last_message_preview || 'Чат поддержки',
                last_message_time: chat?.last_message_at || chat?.created_at,
                unread_count: 0,
                ticket_status: existingTicket.status
            });
        }

        const { count: ticketsCount } = await supabase
            .from('support_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (ticketsCount && ticketsCount >= MAX_TICKETS_PER_USER) {
            return NextResponse.json({ 
                error: `Превышен лимит тикетов (${MAX_TICKETS_PER_USER} в месяц)`
            }, { status: 400 });
        }

        const now = new Date().toISOString();

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

        const { data: admin } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

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

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({
                user_id: session.user.id,
                chat_id: chat.id,
                status: 'open',
                priority: 'medium',
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (ticketError) {
            logError('Error creating support ticket', ticketError);
            await supabase.from('chats').delete().eq('id', chat.id);
            return NextResponse.json({ error: 'Ошибка создания тикета' }, { status: 500 });
        }

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
                await supabase
                    .from('chats')
                    .update({
                        last_message_preview: WELCOME_MESSAGE.substring(0, 100),
                        last_message_at: now
                    })
                    .eq('id', chat.id);
            } else {
                logError('Error sending welcome message', messageError, 'warning');
            }
        }

        logInfo('Support ticket created', {
            ticketId: ticket.id,
            chatId: chat.id,
            userId: session.user.id,
            adminAdded,
            welcomeMessageSent,
            duration: Date.now() - startTime
        });

        invalidateCache(new RegExp(`user_chats_${session.user.id}`));
        invalidateCache(new RegExp(`chat_messages_${chat.id}`));

        logApiRequest('POST', '/api/support/ticket', 201, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            id: chat.id,
            type: 'support',
            participant_id: 'support',
            participant_name: 'Поддержка',
            participant_avatar: null,
            last_message: welcomeMessageSent ? WELCOME_MESSAGE : 'Чат поддержки создан',
            last_message_time: now,
            unread_count: welcomeMessageSent ? 1 : 0,
            ticket_status: ticket.status,
            created_at: now
        }, { status: 201 });
        
    } catch (error) {
        logError('Error creating support ticket', error);
        return NextResponse.json({ 
            error: 'Ошибка создания тикета поддержки' 
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const ticketId = searchParams.get('ticketId');

        if (ticketId && ticketId !== 'null') {
            const { data: ticket, error } = await supabase
                .from('support_tickets')
                .select('id, status, priority, created_at, updated_at, closed_at, chat_id')
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
                ticket
            });
        } else {
            const { data: ticket, error } = await supabase
                .from('support_tickets')
                .select('id, status, priority, created_at, updated_at, closed_at, chat_id')
                .eq('user_id', session.user.id)
                .eq('status', 'open')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                logError('Error fetching open ticket', error);
                return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 });
            }

            return NextResponse.json({
                has_active_ticket: !!ticket,
                ticket: ticket || null
            });
        }
        
    } catch (error) {
        logError('Error getting ticket status', error);
        return NextResponse.json({ error: 'Ошибка получения статуса' }, { status: 500 });
    }
}