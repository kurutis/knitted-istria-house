import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { logError, logApiRequest } from "@/lib/error-logger";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {return NextResponse.json({ error: 'Слишком много запросов. Попробуйте через минуту.'}, { status: 429 })}

        const userId = session.user.id;

        const { data: chats, error: chatsError } = await supabase.from('chats').select(`id, type, created_at, updated_at, participants!inner (user_id)`).eq('participants.user_id', userId);

        if (chatsError) {
            logError('Error fetching chats', chatsError);
            return NextResponse.json({ chats: [] }, { status: 200 });
        }

        if (!chats || chats.length === 0) {return NextResponse.json({ chats: [] }, { status: 200 })}

        const chatIds = chats.map(chat => chat.id);

        const { data: lastMessages } = await supabase.from('messages').select('chat_id, content, created_at').in('chat_id', chatIds).order('created_at', { ascending: false });
        const { data: unreadCounts } = await supabase.from('messages').select('chat_id, id', { count: 'exact' }).in('chat_id', chatIds).eq('is_read', false).neq('sender_id', userId);

        const unreadMap = new Map<string, number>();
        unreadCounts?.forEach(msg => {unreadMap.set(msg.chat_id, (unreadMap.get(msg.chat_id) || 0) + 1)});

        const lastMessageMap = new Map<string, { content: string; created_at: string }>();
        lastMessages?.forEach(msg => {if (!lastMessageMap.has(msg.chat_id)) {lastMessageMap.set(msg.chat_id, {content: msg.content || '', created_at: msg.created_at})}});

        const formattedChats = await Promise.all(chats.map(async (chat) => {
            let participantName = '';
            let participantAvatar = null;
            let participantId = '';

            if (chat.type === 'support') {
                participantName = 'Поддержка';
                participantId = 'support';
            } else {
                const { data: participants } = await supabase.from('participants').select('user_id').eq('chat_id', chat.id).neq('user_id', userId);

                const otherUserId = participants?.[0]?.user_id;
                if (otherUserId) {
                    participantId = otherUserId;
                    const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', otherUserId).single();
                    
                    if (profile) {
                        participantName = profile.full_name || 'Пользователь';
                        participantAvatar = profile.avatar_url;
                    } else {
                        const { data: user } = await supabase.from('users').select('email').eq('id', otherUserId).single();
                        participantName = user?.email?.split('@')[0] || 'Пользователь';
                    }
                }
            }

            const lastMessage = lastMessageMap.get(chat.id);
            const lastMessageTime = lastMessage?.created_at || chat.created_at;
            const lastMessageContent = lastMessage?.content || 'Нет сообщений';

            return {id: chat.id, type: chat.type, participant_id: participantId, participant_name: participantName, participant_avatar: participantAvatar, last_message: lastMessageContent, last_message_time: lastMessageTime, unread_count: unreadMap.get(chat.id) || 0, ticket_status: chat.type === 'support' ? 'open' : undefined};
        }));

        formattedChats.sort((a, b) => {return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()});

        logApiRequest('GET', '/api/chats', 200, Date.now() - startTime, userId);

        return NextResponse.json({ chats: formattedChats }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching chats', error);
        return NextResponse.json({ chats: [] }, { status: 500 });
    }
}