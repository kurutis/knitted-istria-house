import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";


// Rate limiting
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                chats: []
            }, { status: 429 });
        }

        // Кэшируем список чатов
        const cacheKey = `user_chats_${session.user.id}`;
        
        const chats = await cachedQuery(cacheKey, async () => {
            // 1. Получаем все чаты пользователя с оптимизированным запросом
            const { data: participants, error: participantsError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    last_read_at,
                    unread_count,
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
                // Создаем чат с поддержкой автоматически
                const supportChat = await createSupportChat(session.user.id);
                return supportChat ? [supportChat] : [];
            }

            const chatIds = participants.map(p => p.chat_id);
            
            // 2. Получаем последние сообщения для каждого чата (оптимизированный запрос)
            const { data: lastMessages, error: messagesError } = await supabase
                .from('messages')
                .select('chat_id, content, created_at, sender_id')
                .in('chat_id', chatIds)
                .order('created_at', { ascending: false })
                .limit(chatIds.length); // Ограничиваем количество

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

            // 3. Получаем количество непрочитанных сообщений (один запрос)
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

            // 4. Получаем информацию о других участниках (один запрос)
            const { data: otherParticipants, error: otherError } = await supabase
                .from('chat_participants')
                .select(`
                    chat_id,
                    user_id,
                    users!inner (
                        id,
                        email,
                        is_active,
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
                        participant_avatar: p.users?.[0]?.profiles?.[0]?.avatar_url
                    });
                }
            });

            // 5. Форматируем чаты
            let formattedChats = participants.map(participant => {
                const chat = participant.chats?.[0];
                const lastMsg = lastMessageMap.get(participant.chat_id);
                const otherParticipant = participantMap.get(participant.chat_id);
                const unreadCount = unreadMap.get(participant.chat_id) || 0;

                // Для чатов с поддержкой
                if (chat?.type === 'support') {
                    return {
                        id: chat.id,
                        type: 'support',
                        participant_id: 'support',
                        participant_name: 'Поддержка',
                        participant_avatar: null,
                        last_message: lastMsg?.last_message || chat.last_message_preview || 'Нет сообщений',
                        last_message_time: lastMsg?.last_message_time || chat.last_message_at,
                        unread_count: unreadCount,
                        created_at: chat.created_at
                    };
                }

                // Обычные чаты
                return {
                    id: chat.id,
                    type: chat?.type || 'direct',
                    participant_id: otherParticipant?.participant_id || null,
                    participant_name: otherParticipant?.participant_name || 'Пользователь',
                    participant_avatar: otherParticipant?.participant_avatar || null,
                    last_message: lastMsg?.last_message || chat.last_message_preview || 'Нет сообщений',
                    last_message_time: lastMsg?.last_message_time || chat.last_message_at,
                    unread_count: unreadCount,
                    created_at: chat.created_at
                };
            });

            // 6. Фильтруем и сортируем
            formattedChats = formattedChats
                .filter(chat => chat.participant_id !== null || chat.type === 'support')
                .sort((a, b) => {
                    const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
                    const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
                    return timeB - timeA;
                });

            // 7. Проверяем наличие чата с поддержкой
            const hasSupport = formattedChats.some(chat => chat.type === 'support');
            
            if (!hasSupport) {
                const supportChat = await createSupportChat(session.user.id);
                if (supportChat) {
                    formattedChats.unshift(supportChat);
                }
            }

            return formattedChats;
        });

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

// Оптимизированная функция создания чата с поддержкой
async function createSupportChat(userId: string) {
    try {
        const now = new Date().toISOString();

        // Проверяем, не создавался ли уже чат с поддержкой
        const { data: existingTicket } = await supabase
            .from('support_tickets')
            .select('chat_id, status')
            .eq('user_id', userId)
            .in('status', ['open', 'in_progress'])
            .maybeSingle();

        if (existingTicket) {
            const { data: chat } = await supabase
                .from('chats')
                .select('*')
                .eq('id', existingTicket.chat_id)
                .single();
            
            if (chat) {
                return {
                    id: chat.id,
                    type: 'support',
                    participant_id: 'support',
                    participant_name: 'Поддержка',
                    participant_avatar: null,
                    last_message: chat.last_message_preview || 'Чат поддержки',
                    last_message_time: chat.last_message_at || chat.created_at,
                    unread_count: 0,
                    created_at: chat.created_at  // <-- добавьте эту строку
                };
            }
        }

        // Создаем новый чат
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
            return null;
        }

        // Добавляем пользователя
        const { error: userParticipantError } = await supabase
            .from('chat_participants')
            .insert({ 
                chat_id: chat.id, 
                user_id: userId,
                joined_at: now,
                last_read_at: now
            });

        if (userParticipantError) {
            logError('Error adding user to support chat', userParticipantError);
            await supabase.from('chats').delete().eq('id', chat.id);
            return null;
        }

        // Находим администратора
        const { data: admin } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        let adminId = null;
        if (admin) {
            adminId = admin.id;
            await supabase
                .from('chat_participants')
                .insert({ 
                    chat_id: chat.id, 
                    user_id: admin.id,
                    joined_at: now,
                    role: 'admin'
                });
        }

        // Создаем тикет
        await supabase
            .from('support_tickets')
            .insert({
                user_id: userId,
                chat_id: chat.id,
                status: 'open',
                priority: 'normal',
                created_at: now,
                updated_at: now,
                source: 'auto_created'
            });

        // Отправляем приветственное сообщение
        const welcomeMessage = 'Здравствуйте! Чем могу помочь? Опишите вашу проблему, и мы постараемся решить её в ближайшее время.';
        
        await supabase
            .from('messages')
            .insert({
                chat_id: chat.id,
                sender_id: adminId,
                content: welcomeMessage,
                is_read: false,
                created_at: now
            });

        // Обновляем последнее сообщение в чате
        await supabase
            .from('chats')
            .update({
                last_message_preview: welcomeMessage.substring(0, 100),
                last_message_at: now
            })
            .eq('id', chat.id);

        // Инвалидируем кэш
        invalidateCache(`user_chats_${userId}`);

        return {
            id: chat.id,
            type: 'support',
            participant_id: 'support',
            participant_name: 'Поддержка',
            participant_avatar: null,
            last_message: welcomeMessage,
            last_message_time: now,
            unread_count: 1,
            created_at: now
        };
        
    } catch (error) {
        logError('Error creating support chat', error);
        return null;
    }
}