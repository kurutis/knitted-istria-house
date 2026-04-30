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
    const { priority } = await request.json();

    if (!['low', 'medium', 'high'].includes(priority)) {
        return NextResponse.json({ error: 'Неверный приоритет' }, { status: 400 });
    }

    try {
        const { data: ticket, error: updateError } = await supabase
            .from('support_tickets')
            .update({
                priority: priority,
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
            return NextResponse.json({ error: 'Ошибка обновления приоритета' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error updating ticket priority:', error);
        return NextResponse.json({ error: 'Ошибка обновления приоритета' }, { status: 500 });
    }
}