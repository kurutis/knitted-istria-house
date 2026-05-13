import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Тип для элемента заказа из базы данных
type OrderItemFromDB = {
    id: number;
    quantity: number;
    price: number;
    total: number;
    product_title: string;
    product_id: string;
    order_id: string;
};

// Тип для заказа из базы данных
type OrderFromDB = {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
    shipping_full_name: string;
    shipping_phone: string;
    shipping_city: string;
    shipping_address: string;
    buyer_comment: string | null;
    buyer_id: string;
};

// Тип для заказа мастера (возвращаемый)
type MasterOrder = {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
    buyer_name: string;
    buyer_email: string;
    shipping_full_name: string;
    shipping_phone: string;
    shipping_city: string;
    shipping_address: string;
    buyer_comment: string | null;
    items: Array<{
        id: number;
        product_id: string;
        product_title: string;
        quantity: number;
        price: number;
        total: number;
    }>;
};

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        console.log("=== MASTER ORDERS API ===");
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        console.log("User ID:", session.user.id);

        // Получаем товары мастера
        const { data: masterProducts, error: productsError } = await supabase
            .from('products')
            .select('id, title')
            .eq('master_id', session.user.id);

        if (productsError) {
            console.error('Error fetching master products:', productsError);
            return NextResponse.json({ error: 'Ошибка получения товаров' }, { status: 500 });
        }

        const productIds = masterProducts?.map(p => p.id) || [];
        console.log("Master products found:", productIds.length);
        
        if (productIds.length === 0) {
            return NextResponse.json({
                orders: [],
                pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
            });
        }

        // Получаем order_items для товаров мастера
        const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select('*')
            .in('product_id', productIds);

        if (orderItemsError) {
            console.error('Error fetching order items:', orderItemsError);
            return NextResponse.json({ error: 'Ошибка загрузки позиций заказов' }, { status: 500 });
        }

        if (!orderItems || orderItems.length === 0) {
            console.log("No order items found");
            return NextResponse.json({
                orders: [],
                pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
            });
        }

        // Получаем уникальные ID заказов
        const orderIds = [...new Set(orderItems.map(item => item.order_id))];
        console.log("Order IDs found:", orderIds.length);

        // Получаем информацию о заказах
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .in('id', orderIds);

        if (ordersError) {
            console.error('Error fetching orders:', ordersError);
            return NextResponse.json({ error: 'Ошибка загрузки заказов' }, { status: 500 });
        }

        if (!orders || orders.length === 0) {
            return NextResponse.json({
                orders: [],
                pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
            });
        }

        // Получаем информацию о покупателях из таблицы users
        const buyerIds = [...new Set(orders.map(order => order.buyer_id))];
        console.log("Buyer IDs found:", buyerIds.length);

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', buyerIds);

        const userMap = new Map();
        if (!usersError && users) {
            users.forEach(user => {
                userMap.set(user.id, {
                    email: user.email
                });
            });
        }

        // Получаем имена покупателей из profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', buyerIds);

        const profileMap = new Map();
        if (!profilesError && profiles) {
            profiles.forEach(profile => {
                profileMap.set(profile.user_id, {
                    full_name: profile.full_name
                });
            });
        }

        // Создаем карту заказов для быстрого доступа
        const ordersMap = new Map<string, OrderFromDB>();
        orders.forEach(order => {
            ordersMap.set(order.id, order as OrderFromDB);
        });

        // Группируем order_items по заказам
        const itemsByOrder = new Map<string, typeof orderItems>();
        orderItems.forEach(item => {
            if (!itemsByOrder.has(item.order_id)) {
                itemsByOrder.set(item.order_id, []);
            }
            itemsByOrder.get(item.order_id)!.push(item);
        });

        // Формируем результат
        const resultOrders: MasterOrder[] = [];
        
        for (const [orderId, items] of itemsByOrder) {
            const order = ordersMap.get(orderId);
            if (!order) continue;
            
            const userInfo = userMap.get(order.buyer_id);
            const profileInfo = profileMap.get(order.buyer_id);
            
            resultOrders.push({
                id: order.id,
                order_number: order.order_number,
                status: order.status,
                payment_status: order.payment_status,
                total_amount: order.total_amount,
                created_at: order.created_at,
                buyer_name: profileInfo?.full_name || 'Покупатель',
                buyer_email: userInfo?.email || '',
                shipping_full_name: order.shipping_full_name || '',
                shipping_phone: order.shipping_phone || '',
                shipping_city: order.shipping_city || '',
                shipping_address: order.shipping_address || '',
                buyer_comment: order.buyer_comment,
                items: items.map(item => ({
                    id: item.id,
                    product_id: item.product_id,
                    product_title: item.product_title || 'Товар',
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total || item.price * item.quantity
                }))
            });
        }

        // Сортируем по дате создания (новые сверху)
        resultOrders.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        console.log(`Returning ${resultOrders.length} orders`);

        return NextResponse.json({
            orders: resultOrders,
            pagination: {
                total: resultOrders.length,
                page: 1,
                limit: 50,
                totalPages: 1
            }
        });
        
    } catch (error) {
        console.error('Unexpected error in master orders API:', error);
        return NextResponse.json({ 
            error: 'Внутренняя ошибка сервера: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
    }
}