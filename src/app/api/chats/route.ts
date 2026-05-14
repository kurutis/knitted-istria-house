import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery } from "@/lib/db-optimized";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                chats: []
            }, { status: 429 });
        }

        const cacheKey = `user_chats_${session.user.id}`;
        
        const chats = await cachedQuery(cacheKey, async () => {
            // Убраны поля last_read_at и unread_count, так как их нет в таблице
            const { data: participants, error: participantsError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    chats!inner (
                        id,
                        type,
                        created_at,
                        updated_at,
                        last_message_preview,
                        last_message_at
                    )
                `)
                .eq('user_id', session.user.id)
                .order('chats(last_message_at)', { ascending: false, nullsFirst: false });

            if (participantsError) {
                logError('Error fetching participants', participantsError);
                throw new Error('DATABASE_ERROR');
            }

            if (!participants || participants.length === 0) {
                return [];
            }

            const chatIds = participants.map(p => p.chat_id);
            
            // Получаем последние сообщения
            const { data: lastMessages, error: messagesError } = await supabase
                .from('messages')
                .select('chat_id, content, created_at, sender_id')
                .in('chat_id', chatIds)
                .order('created_at', { ascending: false });

            if (messagesError) {
                logError('Error fetching last messages', messagesError, 'warning');
            }

            const lastMessageMap = new Map();
            lastMessages?.forEach(msg => {
                if (!lastMessageMap.has(msg.chat_id)) {
                    lastMessageMap.set(msg.chat_id, {
                        last_message: msg.content?.substring(0, 200) || 'Вложение',
                        last_message_time: msg.created_at,
                        last_sender_id: msg.sender_id
                    });
                }
            });

            // Получаем количество непрочитанных сообщений
            const { data: unreadData, error: unreadError } = await supabase
                .from('messages')
                .select('chat_id', { count: 'exact', head: false })
                .in('chat_id', chatIds)
                .eq('is_read', false)
                .neq('sender_id', session.user.id);

            if (unreadError) {
                logError('Error fetching unread counts', unreadError, 'warning');
            }

            const unreadMap = new Map();
            unreadData?.forEach(msg => {
                unreadMap.set(msg.chat_id, (unreadMap.get(msg.chat_id) || 0) + 1);
            });

            // Получаем других участников
            const { data: otherParticipants, error: otherError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    user_id,
                    users!inner (
                        id,
                        email,
                        is_active,
                        role,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                `)
                .in('chat_id', chatIds)
                .neq('user_id', session.user.id);

            if (otherError) {
                logError('Error fetching other participants', otherError, 'warning');
            }

            const participantMap = new Map();
            otherParticipants?.forEach(p => {
                if (p.users?.[0]?.is_active !== false) {
                    participantMap.set(p.chat_id, {
                        participant_id: p.user_id,
                        participant_name: p.users?.[0]?.profiles?.[0]?.full_name || p.users?.[0]?.email,
                        participant_avatar: p.users?.[0]?.profiles?.[0]?.avatar_url,
                        participant_role: p.users?.[0]?.role
                    });
                }
            });

            const formattedChats = [];
            
            for (const participant of participants) {
                const chat = participant.chats?.[0];
                const lastMsg = lastMessageMap.get(participant.chat_id);
                const otherParticipant = participantMap.get(participant.chat_id);
                const unreadCount = unreadMap.get(participant.chat_id) || 0;

                if (chat?.type === 'support') {
                    const { data: ticket } = await supabase
                        .from('support_tickets')
                        .select('status')
                        .eq('chat_id', chat.id)
                        .single();

                    formattedChats.push({
                        id: chat.id,
                        type: 'support',
                        participant_id: 'support',
                        participant_name: 'Поддержка',
                        participant_avatar: null,
                        last_message: sanitize.text(lastMsg?.last_message || chat.last_message_preview || 'Нет сообщений'),
                        last_message_time: lastMsg?.last_message_time || chat.last_message_at,
                        unread_count: unreadCount,
                        created_at: chat.created_at,
                        ticket_status: ticket?.status
                    });
                } else if (otherParticipant) {
                    formattedChats.push({
                        id: chat.id,
                        type: otherParticipant.participant_role === 'master' ? 'master' : 'buyer',
                        participant_id: otherParticipant.participant_id,
                        participant_name: sanitize.text(otherParticipant.participant_name || 'Пользователь'),
                        participant_avatar: otherParticipant.participant_avatar,
                        last_message: sanitize.text(lastMsg?.last_message || chat.last_message_preview || 'Нет сообщений'),
                        last_message_time: lastMsg?.last_message_time || chat.last_message_at,
                        unread_count: unreadCount,
                        created_at: chat.created_at
                    });
                }
            }

            formattedChats.sort((a, b) => {
                const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
                const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
                return timeB - timeA;
            });

            return formattedChats;
        }, 10);

        logApiRequest('GET', '/api/chats', 200, Date.now() - startTime, session.user.id);
        logInfo('Chats fetched', {
            userId: session.user.id,
            count: chats.length,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true,
            chats,
            meta: {
                total: chats.length,
                cached: Date.now() - startTime < 100
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching chats', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки чатов',
            chats: []
        }, { status: 500 });
    }
}