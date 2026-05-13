import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

// Типы данных
type OrderItem = {
    id: number;
    order_id: string;
    product_id: string;
    quantity: number;
    price: number;
    product_title: string;
    total: number;
    created_at: string;
};

type Order = {
    id: string;
    order_number: string;
    buyer_id: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
    shipping_full_name: string;
    shipping_phone: string;
    shipping_city: string;
    shipping_address: string;
    buyer_comment: string | null;
    tracking_number?: string;
};

type User = {
    id: string;
    email: string;
};

type Profile = {
    user_id: string;
    full_name: string;
};

// GET - получить детали заказа для мастера
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
        
        // Проверяем роль пользователя
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role, is_banned')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'Ошибка проверки прав пользователя' }, { status: 500 });
        }

        if (!user || user.is_banned) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        if (user.role !== 'master' && user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ только для мастеров' }, { status: 403 });
        }

        // Получаем товары мастера
        const { data: masterProducts, error: productsError } = await supabase
            .from('products')
            .select('id')
            .eq('master_id', session.user.id);

        if (productsError) {
            console.error('Error fetching master products:', productsError);
            return NextResponse.json({ error: 'Ошибка получения товаров' }, { status: 500 });
        }

        const productIds = masterProducts?.map(p => p.id) || [];

        // Проверяем, что заказ содержит товары мастера
        const { data: orderItemsCheck, error: checkError } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', id)
            .in('product_id', productIds)
            .limit(1);

        if (checkError) {
            console.error('Error checking order items:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки заказа' }, { status: 500 });
        }

        if (!orderItemsCheck || orderItemsCheck.length === 0) {
            return NextResponse.json({ error: 'Заказ не найден или не содержит ваших товаров' }, { status: 404 });
        }

        // Получаем заказ
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single() as { data: Order | null; error: PostgrestError | null };

        if (orderError || !order) {
            console.error('Error fetching order:', orderError);
            return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
        }

        // Получаем позиции заказа
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', id) as { data: OrderItem[] | null; error: PostgrestError | null };

        if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            return NextResponse.json({ error: 'Ошибка загрузки позиций заказа' }, { status: 500 });
        }

        // Получаем информацию о покупателе
        const { data: buyerUser, error: buyerUserError } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', order.buyer_id)
            .single() as { data: User | null; error: PostgrestError | null };

        const { data: buyerProfile, error: buyerProfileError } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .eq('user_id', order.buyer_id)
            .single() as { data: Profile | null; error: PostgrestError | null };

        // Формируем ответ
        const orderDetails = {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            payment_status: order.payment_status,
            total_amount: order.total_amount,
            created_at: order.created_at,
            buyer_name: buyerProfile?.full_name || 'Покупатель',
            buyer_email: buyerUser?.email || '',
            shipping_full_name: order.shipping_full_name || '',
            shipping_phone: order.shipping_phone || '',
            shipping_city: order.shipping_city || '',
            shipping_address: order.shipping_address || '',
            buyer_comment: order.buyer_comment,
            tracking_number: order.tracking_number,
            items: items?.map(item => ({
                id: item.id,
                product_id: item.product_id,
                product_title: item.product_title || 'Товар',
                quantity: item.quantity,
                price: item.price,
                total: item.total || item.price * item.quantity
            })) || []
        };

        return NextResponse.json({ order: orderDetails });
        
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ 
            error: 'Внутренняя ошибка сервера'
        }, { status: 500 });
    }
}

// PATCH - обновить статус заказа
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, tracking_number } = body;

        // Маппинг статусов из UI в статусы БД
        const STATUS_MAP: Record<string, string> = {
            'new': 'new',
            'confirmed': 'processing',
            'processing': 'processing',
            'shipped': 'shipped',
            'delivered': 'delivered',
            'cancelled': 'cancelled'
        };

        const dbStatus = STATUS_MAP[status];
        
        if (!dbStatus) {
            return NextResponse.json({ 
                error: `Недопустимый статус: ${status}` 
            }, { status: 400 });
        }

        // Проверяем роль пользователя
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role, is_banned')
            .eq('id', session.user.id)
            .single();

        if (userError || !user || user.is_banned) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        if (user.role !== 'master' && user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ только для мастеров' }, { status: 403 });
        }

        // Проверяем, что заказ содержит товары мастера
        const { data: masterProducts } = await supabase
            .from('products')
            .select('id')
            .eq('master_id', session.user.id);

        const productIds = masterProducts?.map(p => p.id) || [];

        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', id)
            .in('product_id', productIds)
            .limit(1);

        if (itemsError || !orderItems || orderItems.length === 0) {
            return NextResponse.json({ error: 'Заказ не найден или не содержит ваших товаров' }, { status: 404 });
        }

        // Обновляем статус заказа
        const updateData: Record<string, string | null> = { 
            status: dbStatus,
            updated_at: new Date().toISOString() 
        };
        
        if (dbStatus === 'shipped' && tracking_number) {
            updateData.tracking_number = tracking_number;
        }

        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating order:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления заказа: ' + updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            order: updatedOrder
        });
        
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Ошибка обновления заказа' }, { status: 500 });
    }
}