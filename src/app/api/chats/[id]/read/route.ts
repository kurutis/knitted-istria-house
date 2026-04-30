import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Проверяем, является ли пользователь участником чата
        const { data: participant, error: participantError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('chat_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (participantError || !participant) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Отмечаем все сообщения от других пользователей как прочитанные
        const { error: updateError } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('chat_id', id)
            .neq('sender_id', session.user.id)
            .eq('is_read', false)

        if (updateError) {
            console.error('Error marking messages as read:', updateError);
            return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
        }

        return NextResponse.json({ success: true })
        
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
    }
}