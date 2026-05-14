import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        // Получаем тикет
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        // Получаем сообщения
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select(`
                id,
                chat_id,
                sender_id,
                content,
                is_read,
                is_edited,
                attachments,
                created_at
            `)
            .eq('chat_id', ticket.chat_id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        if (!messages || messages.length === 0) {
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        // Получаем информацию об отправителях
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        
        const { data: users } = await supabase
            .from('users')
            .select('id, email, role')
            .in('id', senderIds);

        const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', senderIds);

        const userMap = new Map();
        users?.forEach(u => userMap.set(u.id, { email: u.email, role: u.role }));
        
        const profileMap = new Map();
        profiles?.forEach(p => profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }));

        const formattedMessages = messages.map(msg => {
            const userInfo = userMap.get(msg.sender_id);
            const profileInfo = profileMap.get(msg.sender_id);
            
            return {
                id: msg.id,
                chat_id: msg.chat_id,
                sender_id: msg.sender_id,
                content: msg.content || '',
                is_read: msg.is_read,
                is_edited: msg.is_edited,
                attachments: msg.attachments || [],
                created_at: msg.created_at,
                sender_name: profileInfo?.full_name || userInfo?.email || 'Пользователь',
                sender_avatar: profileInfo?.avatar_url || null,
                sender_role: userInfo?.role || 'user'
            };
        });

        return NextResponse.json(formattedMessages, { status: 200 });
        
    } catch (error) {
        console.error('Error in messages API:', error);
        return NextResponse.json({ messages: [] }, { status: 200 });
    }
}