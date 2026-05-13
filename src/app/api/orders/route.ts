// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${year}${month}${day}-${random}`;
}

export async function POST(request: Request) {
    console.log('=== ORDER API CALLED ===');
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        console.log('Request body:', body);
        
        const { shippingAddress, discount, comment } = body;
        
        // Проверяем обязательные поля
        if (!shippingAddress?.full_name) {
            return NextResponse.json({ error: 'Укажите ФИО' }, { status: 400 });
        }
        if (!shippingAddress?.phone) {
            return NextResponse.json({ error: 'Укажите телефон' }, { status: 400 });
        }
        if (!shippingAddress?.city) {
            return NextResponse.json({ error: 'Укажите город' }, { status: 400 });
        }
        if (!shippingAddress?.address) {
            return NextResponse.json({ error: 'Укажите адрес' }, { status: 400 });
        }
        
        // Получаем корзину
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

        // Получаем товары
        const productIds = cartItems.map(item => item.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, title, price')
            .in('id', productIds);

        if (productsError) {
            console.error('Products error:', productsError);
            return NextResponse.json({ error: 'Ошибка получения товаров' }, { status: 500 });
        }

        const productsMap = new Map();
        products?.forEach(p => productsMap.set(p.id, p));

        // Рассчитываем суммы
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
        const totalAmount = subtotal + tax + shipping - (discount || 0);

        const now = new Date().toISOString();
        const orderNumber = generateOrderNumber();

        // Создаем заказ СО ВСЕМИ ПОЛЯМИ
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                buyer_id: session.user.id,
                status: 'new',
                payment_status: 'pending',
                total_amount: totalAmount,
                subtotal: subtotal,
                tax: tax,
                shipping_cost: shipping,
                discount: discount || 0,
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

        console.log('Order created:', order);

        // Создаем позиции заказа
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
            await supabase.from('orders').delete().eq('id', order.id);
            return NextResponse.json({ error: 'Ошибка создания позиций заказа: ' + itemsError.message }, { status: 500 });
        }

        console.log('Order items created:', orderItemsData.length);

        // Очищаем корзину
        await supabase.from('cart').delete().eq('user_id', session.user.id);

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
        console.error('Order creation error:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера: ' + String(error) }, { status: 500 });
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
            .select('*', { count: 'exact' })
            .eq('buyer_id', session.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching orders:', error);
            return NextResponse.json({ error: 'Ошибка загрузки заказов' }, { status: 500 });
        }

        return NextResponse.json({
            orders: orders || [],
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