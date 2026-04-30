import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    try {
        // Получаем все тикеты с необходимой информацией
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
                users!inner (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                ),
                messages!left (
                    id,
                    content,
                    created_at,
                    sender_id,
                    is_read
                )
            `)

        // Фильтр по статусу
        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        // Поиск по имени пользователя, email или теме
        if (search) {
            query = query.or(`users.email.ilike.%${search}%,users.profiles.full_name.ilike.%${search}%,subject.ilike.%${search}%`)
        }

        const { data: tickets, error } = await query

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json([], { status: 500 })
        }

        // Форматируем данные
        const formattedTickets = tickets?.map(ticket => {
            // Находим последнее сообщение
            const messages = ticket.messages || []
            const lastMessage = messages.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]

            // Считаем непрочитанные сообщения (не от администратора)
            const unreadCount = messages.filter(msg => 
                !msg.is_read && msg.sender_id !== session.user.id
            ).length

            return {
                id: ticket.id,
                chat_id: ticket.chat_id,
                user_id: ticket.user_id,
                subject: ticket.subject,
                status: ticket.status,
                priority: ticket.priority,
                category: ticket.category,
                created_at: ticket.created_at,
                updated_at: ticket.updated_at,
                user_name: ticket.users?.profiles?.full_name || ticket.users?.email,
                user_email: ticket.users?.email,
                user_avatar: ticket.users?.profiles?.avatar_url,
                last_message: lastMessage?.content || 'Нет сообщений',
                last_message_time: lastMessage?.created_at || null,
                unread_count: unreadCount
            }
        }) || []

        // Сортировка: по приоритету, затем по времени последнего сообщения
        const priorityOrder = { high: 1, medium: 2, low: 3 }
        formattedTickets.sort((a, b) => {
            const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
                                (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
            if (priorityDiff !== 0) return priorityDiff
            const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0
            const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0
            return timeB - timeA
        })

        return NextResponse.json(formattedTickets)
        
    } catch (error) {
        console.error('Error fetching tickets:', error)
        return NextResponse.json([], { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { subject, category, priority = 'medium', message } = await request.json();

    if (!subject || !message) {
        return NextResponse.json({ error: 'Тема и сообщение обязательны' }, { status: 400 });
    }

    try {
        // 1. Создаем чат
        const { data: chat, error: chatError } = await supabase
            .from('chats')
            .insert({
                type: 'support',
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (chatError) {
            console.error('Error creating chat:', chatError)
            return NextResponse.json({ error: 'Ошибка создания чата' }, { status: 500 })
        }

        // 2. Добавляем пользователя в участники чата
        const { error: participantError } = await supabase
            .from('chat_participants')
            .insert({
                chat_id: chat.id,
                user_id: session.user.id
            })

        if (participantError) {
            console.error('Error adding participant:', participantError)
            return NextResponse.json({ error: 'Ошибка добавления участника' }, { status: 500 })
        }

        // 3. Находим администратора и добавляем его в чат
        const { data: admin, error: adminError } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin')
            .limit(1)
            .single()

        if (admin && !adminError) {
            const { error: adminParticipantError } = await supabase
                .from('chat_participants')
                .insert({
                    chat_id: chat.id,
                    user_id: admin.id
                })

            if (adminParticipantError) {
                console.error('Error adding admin participant:', adminParticipantError)
            }
        }

        // 4. Создаем тикет
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({
                user_id: session.user.id,
                chat_id: chat.id,
                subject,
                category: category || null,
                priority,
                status: 'open',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (ticketError) {
            console.error('Error creating ticket:', ticketError)
            return NextResponse.json({ error: 'Ошибка создания обращения' }, { status: 500 })
        }

        // 5. Создаем первое сообщение
        const { error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: chat.id,
                sender_id: session.user.id,
                content: message,
                created_at: new Date().toISOString()
            })

        if (messageError) {
            console.error('Error creating message:', messageError)
            return NextResponse.json({ error: 'Ошибка создания сообщения' }, { status: 500 })
        }

        return NextResponse.json({
            id: ticket.id,
            chat_id: chat.id,
            status: 'open'
        })
        
    } catch (error) {
        console.error('Error creating ticket:', error)
        return NextResponse.json({ error: 'Ошибка создания обращения' }, { status: 500 })
    }
}