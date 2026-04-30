import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Получаем chat_id тикета
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id')
            .eq('id', id)
            .single()

        if (ticketError) {
            if (ticketError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            console.error('Error finding ticket:', ticketError);
            return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
        }

        // Отмечаем все сообщения от пользователей (не от админа) как прочитанные
        const { error: updateError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('chat_id', ticket.chat_id)
            .neq('sender_id', session.user.id)
            .eq('is_read', false)

        if (updateError) {
            console.error('Error marking messages as read:', updateError);
            return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
    }
}