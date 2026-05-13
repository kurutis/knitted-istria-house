import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

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
};

type Product = {
    id: string;
    title: string;
};

type User = {
    id: string;
    email: string;
};

type Profile = {
    user_id: string;
    full_name: string;
};

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        console.log("=== MASTER ORDERS API ===");
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Проверяем роль из таблицы users
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role, is_banned')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'Ошибка проверки прав пользователя' }, { status: 500 });
        }

        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        if (user.is_banned) {
            return NextResponse.json({ error: 'Ваш аккаунт заблокирован' }, { status: 403 });
        }

        if (user.role !== 'master' && user.role !== 'admin') {
            console.log(`User role is ${user.role}, not master/admin`);
            return NextResponse.json({ error: 'Доступ только для мастеров' }, { status: 403 });
        }

        // Получаем товары мастера
        const { data: masterProducts, error: productsError } = await supabase
            .from('products')
            .select('id, title')
            .eq('master_id', session.user.id) as { data: Product[] | null; error: PostgrestError | null };

        if (productsError) {
            console.error('Error fetching master products:', productsError);
            return NextResponse.json({ error: 'Ошибка получения товаров' }, { status: 500 });
        }

        const productIds = masterProducts?.map(p => p.id) || [];
        
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
            .in('product_id', productIds) as { data: OrderItem[] | null; error: PostgrestError | null };

        if (orderItemsError) {
            console.error('Error fetching order items:', orderItemsError);
            return NextResponse.json({ error: 'Ошибка загрузки позиций заказов' }, { status: 500 });
        }

        if (!orderItems || orderItems.length === 0) {
            return NextResponse.json({
                orders: [],
                pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
            });
        }

        // Получаем уникальные ID заказов
        const orderIds = [...new Set(orderItems.map((item: OrderItem) => item.order_id))];

        // Получаем информацию о заказах
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .in('id', orderIds) as { data: Order[] | null; error: PostgrestError | null };

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

        // Получаем информацию о покупателях
        const buyerIds = [...new Set(orders.map((order: Order) => order.buyer_id))];

        // Получаем emails из таблицы users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', buyerIds) as { data: User[] | null; error: PostgrestError | null };

        const userMap = new Map<string, { email: string }>();
        if (!usersError && users) {
            users.forEach((user: User) => {
                userMap.set(user.id, { email: user.email });
            });
        }

        // Получаем имена из profiles
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', buyerIds) as { data: Profile[] | null; error: PostgrestError | null };

        const profileMap = new Map<string, { full_name: string }>();
        if (!profilesError && profiles) {
            profiles.forEach((profile: Profile) => {
                profileMap.set(profile.user_id, { full_name: profile.full_name });
            });
        }

        // Создаем карту заказов
        const ordersMap = new Map<string, Order>();
        orders.forEach((order: Order) => {
            ordersMap.set(order.id, order);
        });

        // Группируем items по заказам
        const itemsByOrder = new Map<string, OrderItem[]>();
        orderItems.forEach((item: OrderItem) => {
            if (!itemsByOrder.has(item.order_id)) {
                itemsByOrder.set(item.order_id, []);
            }
            const existingItems = itemsByOrder.get(item.order_id);
            if (existingItems) {
                existingItems.push(item);
            }
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
                items: items.map((item: OrderItem) => ({
                    id: item.id,
                    product_id: item.product_id,
                    product_title: item.product_title || 'Товар',
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total || item.price * item.quantity
                }))
            });
        }

        // Сортируем по дате
        resultOrders.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

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
        console.error('Unexpected error:', error);
        return NextResponse.json({ 
            error: 'Внутренняя ошибка сервера'
        }, { status: 500 });
    }
}