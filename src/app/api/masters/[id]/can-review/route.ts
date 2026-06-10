import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

interface OrderItemWithOrder {
    order_id: string;
    orders: {
        id: string;
        order_number: string;
        buyer_id: string;
        status: string;
        created_at: string;
    };
}

interface OrderInfo {
    id: string;
    order_number: string;
    created_at: string;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;
        
        if (!session?.user) return NextResponse.json({ canReview: false, error: 'Неавторизован' }, { status: 401 })

        if (!id) return NextResponse.json({ canReview: false, error: 'ID мастера обязателен' }, { status: 400 })

        if (session.user.id === id) return NextResponse.json({ canReview: false, reason: 'Нельзя оставить отзыв самому себе' })

        const { data: existingReview } = await supabase.from('reviews').select('id').eq('target_type', 'master').eq('target_id', id).eq('author_id', session.user.id).maybeSingle();

        if (existingReview) return NextResponse.json({ canReview: false, reason: 'Вы уже оставляли отзыв этому мастеру' })

        const { data: masterProducts } = await supabase.from('products').select('id').eq('master_id', id);

        const productIds = masterProducts?.map(p => p.id) || [];

        if (productIds.length === 0) return NextResponse.json({ canReview: false, reason: 'У мастера пока нет товаров' })

        const { data: orderItems, error } = await supabase.from('order_items').select(`order_id, orders!inner (id, order_number, buyer_id, status, created_at)`).in('product_id', productIds).eq('orders.buyer_id', session.user.id).in('orders.status', ['delivered', 'completed']) as { data: OrderItemWithOrder[] | null; error: PostgrestError | null };

        if (error) {
            console.error('Error checking orders:', error);
            return NextResponse.json({ canReview: false, error: 'Ошибка проверки' }, { status: 500 });
        }

        const uniqueOrders = new Map<string, OrderInfo>();
        orderItems?.forEach((item: OrderItemWithOrder) => {
            const order = item.orders;
            if (order && !uniqueOrders.has(order.id)) uniqueOrders.set(order.id, {id: order.id, order_number: order.order_number, created_at: order.created_at});
        });

        const canReview = uniqueOrders.size > 0;
        const ordersList = Array.from(uniqueOrders.values());

        return NextResponse.json({canReview, orders: ordersList});
        
    } catch (error) {
        console.error('Error checking review eligibility:', error);
        return NextResponse.json({ canReview: false, error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}