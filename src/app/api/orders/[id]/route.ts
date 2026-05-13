// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Получаем заказ
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .eq('buyer_id', session.user.id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
        }

        // Получаем позиции заказа
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', id);

        if (itemsError) {
            console.error('Error fetching order items:', itemsError);
        }

        return NextResponse.json({
            order,
            items: items || []
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching order:', error);
        return NextResponse.json({ error: 'Ошибка загрузки заказа' }, { status: 500 });
    }
}