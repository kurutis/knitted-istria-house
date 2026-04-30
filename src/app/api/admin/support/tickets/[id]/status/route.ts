import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!['open', 'in_progress', 'closed'].includes(status)) {
        return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
    }

    try {
        // Обновляем статус тикета
        const { data: ticket, error: updateError } = await supabase
            .from('support_tickets')
            .update({
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('id')
            .single()

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            console.error('Supabase error:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
        }

        if (!ticket) {
            return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error updating ticket status:', error);
        return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
    }
}