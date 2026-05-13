// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";
import { z } from "zod";

// Схема валидации для создания заказа
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

const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

function generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}-${random}`;
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json();
        const validatedData = createOrderSchema.parse(body);
        const { shippingAddress, promoCode, discount, comment } = validatedData;

        // Получаем корзину пользователя
        const { data: cartItems, error: cartError } = await supabase
            .from('cart')
            .select(`
                product_id,
                quantity,
                products!inner (
                    id,
                    title,
                    price,
                    master_id
                )
            `)
            .eq('user_id', session.user.id);

        if (cartError) {
            logError('Error fetching cart for order', cartError);
            return NextResponse.json({ error: 'Ошибка получения корзины' }, { status: 500 });
        }

        if (!cartItems || cartItems.length === 0) {
            return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 });
        }

        // Получаем данные о продуктах (products приходит как массив)
        let subtotal = 0;
        const orderItemsData = [];
        
        for (const item of cartItems) {
            const product = item.products?.[0]; // products - это массив, берем первый элемент
            
            if (!product) {
                return NextResponse.json({ 
                    error: `Товар не найден` 
                }, { status: 400 });
            }
            
            const price = parseFloat(product.price);
            const quantity = item.quantity;
            const total = price * quantity;
            subtotal += total;
            
            orderItemsData.push({
                product_id: item.product_id,
                product_title: product.title,
                product_price: price,
                quantity: quantity,
                total: total
            });
        }

        const tax = subtotal * 0.07;
        const shipping = subtotal > 5000 ? 0 : 350;
        const totalAmount = subtotal + tax + shipping - discount;

        const now = new Date().toISOString();
        const orderNumber = generateOrderNumber();

        // Создаем заказ
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
                promo_code: promoCode || null,
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
            logError('Error creating order', orderError);
            return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 });
        }

        // Создаем позиции заказа
        const orderItemsInsert = orderItemsData.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.product_price,
            total: item.total,
            product_title: item.product_title,
            created_at: now
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsInsert);

        if (itemsError) {
            logError('Error creating order items', itemsError);
            // Откатываем создание заказа
            await supabase.from('orders').delete().eq('id', order.id);
            return NextResponse.json({ error: 'Ошибка создания позиций заказа' }, { status: 500 });
        }

        // Очищаем корзину
        await supabase
            .from('cart')
            .delete()
            .eq('user_id', session.user.id);

        // Инвалидируем кэш
        invalidateCache(`cart_${session.user.id}`);

        // Создаем уведомление для пользователя
        await supabase
            .from('notifications')
            .insert({
                user_id: session.user.id,
                title: '✅ Заказ оформлен',
                message: `Ваш заказ №${orderNumber} успешно оформлен и передан в обработку.`,
                type: 'order_created',
                metadata: { order_id: order.id, order_number: orderNumber },
                created_at: now,
                is_read: false
            });

        logInfo('Order created', {
            orderId: order.id,
            userId: session.user.id,
            orderNumber,
            totalAmount,
            itemsCount: orderItemsData.length,
            duration: Date.now() - startTime
        });

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                order_number: orderNumber,
                total_amount: totalAmount,
                status: 'new',
                payment_status: 'pending'
            },
            message: 'Заказ успешно оформлен'
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
        }
        logError('Error creating order', error);
        return NextResponse.json({ error: 'Ошибка оформления заказа' }, { status: 500 });
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
            logError('Error fetching orders', error);
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
        logError('Error fetching orders', error);
        return NextResponse.json({ error: 'Ошибка загрузки заказов' }, { status: 500 });
    }
}