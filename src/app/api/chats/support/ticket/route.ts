import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    try {
        const now = new Date().toISOString()

        // 1. Создаем чат
        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert({ type: 'support', created_at: now })
            .select()
            .single()

        if (chatError) {
            console.error('Error creating chat:', chatError);
            return NextResponse.json({ error: 'Ошибка создания чата' }, { status: 500 });
        }

        // 2. Добавляем пользователя в участники
        const { error: participantError } = await supabase
            .from('chat_participants')
            .insert({ chat_id: chat.id, user_id: session.user.id })

        if (participantError) {
            console.error('Error adding participant:', participantError);
            return NextResponse.json({ error: 'Ошибка добавления участника' }, { status: 500 });
        }

        // 3. Находим администратора
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

        // 4. Создаем тикет
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({
                user_id: session.user.id,
                chat_id: chat.id,
                status: 'open',
                created_at: now,
                updated_at: now
            })
            .select()
            .single()

        if (ticketError) {
            console.error('Error creating ticket:', ticketError);
            return NextResponse.json({ error: 'Ошибка создания тикета' }, { status: 500 });
        }

        // 5. Отправляем приветственное сообщение
        const welcomeMessage = 'Здравствуйте! Чем могу помочь? Опишите вашу проблему, и мы постараемся решить её в ближайшее время.'
        
        await supabase
            .from('messages')
            .insert({
                chat_id: chat.id,
                sender_id: admin?.id || null,
                content: welcomeMessage,
                created_at: now
            })

        return NextResponse.json({
            id: chat.id,
            type: 'support',
            participant_id: 'support',
            participant_name: 'Поддержка',
            participant_avatar: null,
            last_message: welcomeMessage,
            last_message_time: now,
            unread_count: 1,
            ticket_status: 'open'
        })
        
    } catch (error) {
        console.error('Error creating support ticket:', error);
        return NextResponse.json({ error: 'Ошибка создания тикета' }, { status: 500 });
    }
}