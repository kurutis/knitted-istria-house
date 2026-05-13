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
        // 1. Проверяем сессию
        const session = await getServerSession(authOptions);
        console.log('Session user:', session?.user?.id, session?.user?.email);
        
        if (!session?.user) {
            console.log('No session found');
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // 2. Получаем тело запроса
        const body = await request.json();
        console.log('Request body:', body);
        
        const { shippingAddress, discount, comment } = body;
        
        // 3. Получаем корзину пользователя
        console.log('Fetching cart for user:', session.user.id);
        const { data: cartItems, error: cartError } = await supabase
            .from('cart')
            .select('product_id, quantity')
            .eq('user_id', session.user.id);

        if (cartError) {
            console.error('Cart error:', cartError);
            return NextResponse.json({ error: 'Ошибка получения корзины: ' + cartError.message }, { status: 500 });
        }

        console.log('Cart items:', cartItems?.length || 0);

        if (!cartItems || cartItems.length === 0) {
            return NextResponse.json({ error: 'Корзина пуста' }, { status: 400 });
        }

        // 4. Получаем товары
        const productIds = cartItems.map(item => item.product_id);
        console.log('Product IDs:', productIds);
        
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, title, price')
            .in('id', productIds);

        if (productsError) {
            console.error('Products error:', productsError);
            return NextResponse.json({ error: 'Ошибка получения товаров: ' + productsError.message }, { status: 500 });
        }

        console.log('Products found:', products?.length || 0);

        // Создаем Map для быстрого доступа
        const productsMap = new Map();
        products?.forEach(p => productsMap.set(p.id, p));

        // 5. Рассчитываем суммы
        let totalAmount = 0;
        const orderItems = [];

        for (const item of cartItems) {
            const product = productsMap.get(item.product_id);
            if (!product) {
                console.error('Product not found:', item.product_id);
                return NextResponse.json({ error: `Товар не найден: ${item.product_id}` }, { status: 400 });
            }
            
            const price = parseFloat(product.price);
            const total = price * item.quantity;
            totalAmount += total;
            
            orderItems.push({
                product_id: item.product_id,
                product_title: product.title,
                price: price,
                quantity: item.quantity,
                total: total
            });
        }

        console.log('Total amount:', totalAmount);

        const now = new Date().toISOString();
        const orderNumber = generateOrderNumber();

        // 6. Создаем заказ (только с существующими полями)
        console.log('Creating order...');
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                buyer_id: session.user.id,
                status: 'new',
                total_amount: totalAmount,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (orderError) {
            console.error('Order creation error:', orderError);
            return NextResponse.json({ error: 'Ошибка создания заказа: ' + orderError.message }, { status: 500 });
        }

        console.log('Order created:', order.id);

        // 7. Создаем позиции заказа
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

        // 8. Очищаем корзину
        await supabase.from('cart').delete().eq('user_id', session.user.id);

        console.log('Order completed successfully');

        return NextResponse.json({
            success: true,
            order: {
                id: order.id,
                order_number: orderNumber,
                total_amount: totalAmount,
                status: 'new'
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