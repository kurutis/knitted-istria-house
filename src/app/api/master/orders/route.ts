import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PostgrestError } from "@supabase/supabase-js";

// Определяем типы для данных
type OrderItemWithOrder = {
    id: string;
    quantity: number;
    price: number;
    total: number;
    product_title: string;
    product_id: string;
    order_id: string;
    orders: {
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
        profiles: {
            full_name: string;
            email: string;
        } | null;
    };
};

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
        id: string;
        product_id: string;
        product_title: string;
        quantity: number;
        price: number;
        total: number;
    }>;
};

// GET - получить заказы мастера
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        console.log("Session in master/orders:", session); // Для отладки
        
        if (!session?.user) {
            console.log("No session found");
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        console.log("User ID:", session.user.id);
        console.log("User role:", session.user.role);

        // Проверяем, что пользователь - мастер
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        console.log("Profile data:", profile);
        console.log("Profile error:", profileError);

        if (profileError) {
            console.error("Profile fetch error:", profileError);
            return NextResponse.json({ error: 'Ошибка получения профиля' }, { status: 500 });
        }

        if (profile?.role !== 'master') {
            console.log("User is not a master. Role:", profile?.role);
            return NextResponse.json({ error: 'Доступ только для мастеров' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Получаем товары мастера
        const { data: masterProducts, error: productsError } = await supabase
            .from('products')
            .select('id, title')
            .eq('master_id', session.user.id);

        console.log("Master products:", masterProducts);
        
        if (productsError) {
            console.error('Error fetching master products:', productsError);
            return NextResponse.json({ error: 'Ошибка получения товаров' }, { status: 500 });
        }

        const productIds = masterProducts?.map(p => p.id) || [];
        
        if (productIds.length === 0) {
            return NextResponse.json({
                orders: [],
                pagination: { total: 0, page, limit, totalPages: 0 }
            });
        }

        // Получаем заказы, содержащие товары мастера
        let query = supabase
            .from('order_items')
            .select(`
                id,
                quantity,
                price,
                total,
                product_title,
                product_id,
                order_id,
                orders!inner (
                    id,
                    order_number,
                    status,
                    payment_status,
                    total_amount,
                    created_at,
                    shipping_full_name,
                    shipping_phone,
                    shipping_city,
                    shipping_address,
                    buyer_comment,
                    buyer_id,
                    profiles!orders_buyer_id_fkey (
                        full_name,
                        email
                    )
                )
            `)
            .in('product_id', productIds)
            .order('created_at', { ascending: false, referencedTable: 'orders' })
            .range(offset, offset + limit - 1);

        if (status && status !== 'all') {
            query = query.eq('orders.status', status);
        }

        const { data: orderItems, error } = await query as { 
            data: OrderItemWithOrder[] | null; 
            error: PostgrestError | null 
        };

        if (error) {
            console.error('Error fetching master orders:', error);
            return NextResponse.json({ error: 'Ошибка загрузки заказов' }, { status: 500 });
        }

        // Группируем по заказам
        const ordersMap = new Map<string, MasterOrder>();
        
        orderItems?.forEach(item => {
            const order = item.orders;
            if (!ordersMap.has(order.id)) {
                ordersMap.set(order.id, {
                    id: order.id,
                    order_number: order.order_number,
                    status: order.status,
                    payment_status: order.payment_status,
                    total_amount: order.total_amount,
                    created_at: order.created_at,
                    buyer_name: order.profiles?.full_name || 'Покупатель',
                    buyer_email: order.profiles?.email || '',
                    shipping_full_name: order.shipping_full_name,
                    shipping_phone: order.shipping_phone,
                    shipping_city: order.shipping_city,
                    shipping_address: order.shipping_address,
                    buyer_comment: order.buyer_comment,
                    items: []
                });
            }
            
            const currentOrder = ordersMap.get(order.id);
            if (currentOrder) {
                currentOrder.items.push({
                    id: item.id,
                    product_id: item.product_id,
                    product_title: item.product_title,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total
                });
            }
        });

        const orders = Array.from(ordersMap.values());

        return NextResponse.json({
            orders,
            pagination: {
                total: orders.length,
                page,
                limit,
                totalPages: Math.ceil(orders.length / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching master orders:', error);
        return NextResponse.json({ error: 'Ошибка загрузки заказов' }, { status: 500 });
    }
}