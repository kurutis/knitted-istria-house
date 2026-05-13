// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const createOrderSchema = z.object({
    shippingAddress: z.object({
        full_name: z.string().min(2, 'Имя обязательно'),
        phone: z.string().min(10, 'Телефон обязателен'),
        city: z.string().min(2, 'Город обязателен'),
        address: z.string().min(5, 'Адрес обязателен'),
        postal_code: z.string().optional(),
    }),
    promoCode: z.string().optional(),
    discount: z.number().min(0).default(0),
    comment: z.string().max(500).optional(),
});

function generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}-${random}`;
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        const validatedData = createOrderSchema.parse(body);
        const { shippingAddress, promoCode, discount, comment } = validatedData;

        // 1. Получаем корзину пользователя
        const { data: cartItems, error: cartError } = await supabase
            .from('cart')
            .select('product_id, quantity')
            .eq('user_id', session.user.id);

        if (cartError) {
            console.error('Cart error:', cartError);
            return NextResponse.json({ error: 'Ошибка получения корзины' }, { status: 500 });
        }

        if (!cartItems || cartItems.length === 0) {
            return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 });
        }

        // 2. Получаем товары
        const productIds = cartItems.map(item => item.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, title, price')
            .in('id', productIds);

        if (productsError) {
            console.error('Products error:', productsError);
            return NextResponse.json({ error: 'Ошибка получения товаров' }, { status: 500 });
        }

        // Создаем Map для быстрого доступа
        const productsMap = new Map();
        products?.forEach(p => productsMap.set(p.id, p));

        // 3. Рассчитываем суммы
        let subtotal = 0;
        const orderItems = [];

        for (const item of cartItems) {
            const product = productsMap.get(item.product_id);
            if (!product) {
                return NextResponse.json({ error: `Товар не найден: ${item.product_id}` }, { status: 400 });
            }
            
            const price = parseFloat(product.price);
            const total = price * item.quantity;
            subtotal += total;
            
            orderItems.push({
                product_id: item.product_id,
                product_title: product.title,
                price: price,
                quantity: item.quantity,
                total: total
            });
        }

        const tax = subtotal * 0.07; // 7% налог
        const shipping = subtotal > 5000 ? 0 : 350;
        const totalAmount = subtotal + tax + shipping - discount;

        const now = new Date().toISOString();
        const orderNumber = generateOrderNumber();

        // 4. Создаем заказ со всеми полями
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                buyer_id: session.user.id,
                subtotal: subtotal,
                tax: tax,
                shipping_cost: shipping,
                discount: discount,
                total_amount: totalAmount,
                status: 'new',
                payment_status: 'pending',
                buyer_comment: comment || null,
                shipping_full_name: shippingAddress.full_name,
                shipping_phone: shippingAddress.phone,
                shipping_city: shippingAddress.city,
                shipping_address: shippingAddress.address,
                shipping_postal_code: shippingAddress.postal_code || null,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (orderError) {
            console.error('Order creation error:', orderError);
            return NextResponse.json({ error: 'Ошибка создания заказа: ' + orderError.message }, { status: 500 });
        }

        // 5. Создаем позиции заказа
        const orderItemsData = orderItems.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            product_title: item.product_title,
            created_at: now
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsData);

        if (itemsError) {
            console.error('Order items error:', itemsError);
            // Откат: удаляем созданный заказ
            await supabase.from('orders').delete().eq('id', order.id);
            return NextResponse.json({ error: 'Ошибка создания позиций заказа' }, { status: 500 });
        }

        // 6. Очищаем корзину
        await supabase.from('cart').delete().eq('user_id', session.user.id);

        // 7. Уведомление
        await supabase.from('notifications').insert({
            user_id: session.user.id,
            title: '✅ Заказ оформлен',
            message: `Ваш заказ №${orderNumber} успешно оформлен на сумму ${totalAmount.toLocaleString()} ₽`,
            type: 'order_created',
            metadata: { order_id: order.id, order_number: orderNumber },
            created_at: now,
            is_read: false
        });

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                order_number: orderNumber,
                total_amount: totalAmount,
                status: 'new',
                payment_status: 'pending'
            }
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
        }
        console.error('Order creation error:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}

// GET - получить заказы пользователя
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        const { data: orders, error, count } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                total_amount,
                status,
                payment_status,
                created_at
            `, { count: 'exact' })
            .eq('buyer_id', session.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching orders:', error);
            return NextResponse.json({ error: 'Ошибка загрузки заказов' }, { status: 500 });
        }

        // Получаем количество товаров для каждого заказа
        const orderIds = orders?.map(o => o.id) || [];
        const itemsCountMap = new Map();
        
        if (orderIds.length > 0) {
            const { data: orderItems } = await supabase
                .from('order_items')
                .select('order_id, quantity')
                .in('order_id', orderIds);
            
            orderItems?.forEach(item => {
                const current = itemsCountMap.get(item.order_id) || 0;
                itemsCountMap.set(item.order_id, current + (item.quantity || 0));
            });
        }

        const formattedOrders = orders?.map(order => ({
            id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            status: order.status,
            payment_status: order.payment_status,
            created_at: order.created_at,
            items_count: itemsCountMap.get(order.id) || 0
        })) || [];

        return NextResponse.json({
            orders: formattedOrders,
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'Ошибка загрузки заказов' }, { status: 500 });
    }
}