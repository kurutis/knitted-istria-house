import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Получаем все чаты пользователя
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
            console.error('Error fetching participants:', participantsError);
            return NextResponse.json({ chats: [] }, { status: 200 });
        }

        if (!participants || participants.length === 0) {
            return NextResponse.json({ chats: [] }, { status: 200 });
        }

        const chatIds = participants.map(p => p.chat_id);
        const chats = [];

        for (const participant of participants) {
            const chat = participant.chats?.[0];
            if (!chat) continue;

            // Получаем последнее сообщение
            const { data: lastMsg } = await supabase
                .from('messages')
                .select('content, created_at')
                .eq('chat_id', chat.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Для чата поддержки
            if (chat.type === 'support') {
                const { data: ticket } = await supabase
                    .from('support_tickets')
                    .select('status')
                    .eq('chat_id', chat.id)
                    .single();

                chats.push({
                    id: chat.id,
                    type: 'support',
                    participant_id: 'support',
                    participant_name: 'Поддержка',
                    participant_avatar: null,
                    last_message: lastMsg?.content?.substring(0, 100) || chat.last_message_preview || 'Нет сообщений',
                    last_message_time: lastMsg?.created_at || chat.last_message_at,
                    unread_count: participant.unread_count || 0,
                    ticket_status: ticket?.status
                });
                continue;
            }

            // Получаем другого участника для обычных чатов
            const { data: otherParticipant } = await supabase
                .from('chat_participants')
                .select('user_id')
                .eq('chat_id', chat.id)
                .neq('user_id', session.user.id)
                .single();

            if (otherParticipant) {
                // Получаем профиль
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('user_id', otherParticipant.user_id)
                    .single();

                // Получаем роль
                const { data: user } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', otherParticipant.user_id)
                    .single();

                chats.push({
                    id: chat.id,
                    type: user?.role === 'master' ? 'master' : 'buyer',
                    participant_id: otherParticipant.user_id,
                    participant_name: profile?.full_name || 'Пользователь',
                    participant_avatar: profile?.avatar_url || null,
                    last_message: lastMsg?.content?.substring(0, 100) || chat.last_message_preview || 'Нет сообщений',
                    last_message_time: lastMsg?.created_at || chat.last_message_at,
                    unread_count: participant.unread_count || 0
                });
            }
        }

        return NextResponse.json({ chats }, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json({ chats: [] }, { status: 200 });
    }
}