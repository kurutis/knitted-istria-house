import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    try {
        // Получаем все чаты, где участвует пользователь
        const { data: participants, error: participantsError } = await supabase
            .from('chat_participants')
            .select(`
                chat_id,
                chats!inner (
                    id,
                    type,
                    created_at
                )
            `)
            .eq('user_id', session.user.id)

        if (participantsError) {
            console.error('Error fetching participants:', participantsError);
            return NextResponse.json([], { status: 500 });
        }

        if (!participants || participants.length === 0) {
            // Создаем чат с поддержкой, если нет ни одного чата
            const supportChat = await createSupportChat(session.user.id)
            return NextResponse.json(supportChat ? [supportChat] : [])
        }

        const chatIds = participants.map(p => p.chat_id)

        // Получаем последние сообщения для каждого чата
        const { data: lastMessages, error: messagesError } = await supabase
            .from('messages')
            .select('chat_id, content, created_at, sender_id')
            .in('chat_id', chatIds)
            .order('created_at', { ascending: false })

        if (messagesError) {
            console.error('Error fetching last messages:', messagesError);
        }

        // Создаем Map последних сообщений
        const lastMessageMap = new Map()
        lastMessages?.forEach(msg => {
            if (!lastMessageMap.has(msg.chat_id)) {
                lastMessageMap.set(msg.chat_id, {
                    last_message: msg.content || 'Нет сообщений',
                    last_message_time: msg.created_at,
                    last_sender_id: msg.sender_id
                })
            }
        })

        // Получаем количество непрочитанных сообщений
        const { data: unreadCounts, error: unreadError } = await supabase
            .from('messages')
            .select('chat_id', { count: 'exact', head: false })
            .in('chat_id', chatIds)
            .eq('is_read', false)
            .neq('sender_id', session.user.id)

        if (unreadError) {
            console.error('Error fetching unread counts:', unreadError);
        }

        const unreadMap = new Map()
        unreadCounts?.forEach(msg => {
            unreadMap.set(msg.chat_id, (unreadMap.get(msg.chat_id) || 0) + 1)
        })

        // Получаем информацию о других участниках
        const { data: otherParticipants, error: otherError } = await supabase
            .from('chat_participants')
            .select(`
                chat_id,
                user_id,
                users!inner (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                )
            `)
            .in('chat_id', chatIds)
            .neq('user_id', session.user.id)

        if (otherError) {
            console.error('Error fetching other participants:', otherError);
        }

        const participantMap = new Map()
        otherParticipants?.forEach(p => {
            participantMap.set(p.chat_id, {
                participant_id: p.user_id,
                participant_name: p.users?.profiles?.full_name || p.users?.email,
                participant_avatar: p.users?.profiles?.avatar_url
            })
        })

        // Получаем информацию о чатах
        const { data: chatsData, error: chatsError } = await supabase
            .from('chats')
            .select('*')
            .in('id', chatIds)

        if (chatsError) {
            console.error('Error fetching chats:', chatsError);
            return NextResponse.json([], { status: 500 });
        }

        const chatsMap = new Map()
        chatsData?.forEach(chat => {
            chatsMap.set(chat.id, chat)
        })

        // Форматируем чаты
        let chats = participants.map(participant => {
            const chat = chatsMap.get(participant.chat_id)
            const lastMsg = lastMessageMap.get(participant.chat_id)
            const otherParticipant = participantMap.get(participant.chat_id)
            const unreadCount = unreadMap.get(participant.chat_id) || 0

            return {
                id: participant.chat_id,
                type: chat?.type || 'direct',
                participant_id: otherParticipant?.participant_id || null,
                participant_name: otherParticipant?.participant_name || 'Пользователь',
                participant_avatar: otherParticipant?.participant_avatar || null,
                last_message: lastMsg?.last_message || 'Нет сообщений',
                last_message_time: lastMsg?.last_message_time || null,
                unread_count: unreadCount
            }
        })

        // Сортируем по времени последнего сообщения
        chats.sort((a, b) => {
            const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0
            const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0
            return timeB - timeA
        })

        // Проверяем, есть ли чат с поддержкой
        const hasSupport = chats.some(chat => chat.type === 'support')
        
        if (!hasSupport) {
            const supportChat = await createSupportChat(session.user.id)
            if (supportChat) {
                chats.unshift(supportChat)
            }
        }

        return NextResponse.json(chats)
        
    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json([], { status: 500 });
    }
}

// Вспомогательная функция для создания чата с поддержкой
async function createSupportChat(userId: string) {
    try {
        const now = new Date().toISOString()

        // Создаем чат
        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert({ type: 'support', created_at: now })
            .select()
            .single()

        if (chatError) {
            console.error('Error creating support chat:', chatError);
            return null;
        }

        // Добавляем пользователя
        await supabase
            .from('chat_participants')
            .insert({ chat_id: chat.id, user_id: userId })

        // Находим администратора
        const { data: admin } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .limit(1)
            .maybeSingle()

        if (admin) {
            await supabase
                .from('chat_participants')
                .insert({ chat_id: chat.id, user_id: admin.id })
        }

        // Создаем тикет
        await supabase
            .from('support_tickets')
            .insert({
                user_id: userId,
                chat_id: chat.id,
                status: 'open',
                created_at: now,
                updated_at: now
            })

        // Отправляем приветственное сообщение
        const welcomeMessage = 'Здравствуйте! Чем могу помочь? Опишите вашу проблему, и мы постараемся решить её в ближайшее время.'
        
        await supabase
            .from('messages')
            .insert({
                chat_id: chat.id,
                sender_id: admin?.id || null,
                content: welcomeMessage,
                created_at: now
            })

        return {
            id: chat.id,
            type: 'support',
            participant_id: 'support',
            participant_name: 'Поддержка',
            participant_avatar: null,
            last_message: welcomeMessage,
            last_message_time: now,
            unread_count: 1
        }
        
    } catch (error) {
        console.error('Error creating support chat:', error);
        return null;
    }
}