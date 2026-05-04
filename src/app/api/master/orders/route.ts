// app/api/master/orders/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface OrderStatusUpdateData {
    status: string;
    updated_at: string;
    tracking_number?: string;
    master_notes?: string;
    delivered_at?: string;
    cancelled_at?: string;
}

// Rate limiting
const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 запросов в минуту

// GET - получить заказы мастера
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }
        
        if (session.user.role !== 'master' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                orders: [],
                pagination: {}
            }, { status: 429 });
        }

        // Параметры фильтрации и пагинации
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Кэшируем заказы
        const cacheKey = `master_orders_${session.user.id}_${status || 'all'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // 1. Получаем ID всех товаров мастера
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('id')
                .eq('master_id', session.user.id);

            if (productsError) {
                logError('Error fetching master products', productsError);
                throw new Error('DATABASE_ERROR');
            }

            if (!products || products.length === 0) {
                return {
                    orders: [],
                    pagination: { total: 0, page, limit, totalPages: 0 },
                    stats: { total_orders: 0, total_amount: 0, status_counts: {} }
                };
            }

            const productIds = products.map(p => p.id);

            // 2. Получаем заказы через order_items с оптимизированным запросом
            let query = supabase
                .from('order_items')
                .select(`
                    id,
                    quantity,
                    price,
                    product_id,
                    order_id,
                    orders!inner (
                        id,
                        order_number,
                        status,
                        total_amount,
                        shipping_address,
                        shipping_city,
                        shipping_postal_code,
                        payment_method,
                        payment_status,
                        notes,
                        created_at,
                        updated_at,
                        buyer_id,
                        users!inner (
                            id,
                            email,
                            profiles!left (
                                full_name,
                                phone,
                                avatar_url,
                                city
                            )
                        )
                    )
                `, { count: 'exact' })
                .in('product_id', productIds);

            // Фильтр по статусу заказа
            const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'completed'];
            if (status && validStatuses.includes(status)) {
                query = query.eq('orders.status', status);
            }

            const { data: orderItems, error, count } = await query
                .order('orders.created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching order items', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!orderItems || orderItems.length === 0) {
                return {
                    orders: [],
                    pagination: { total: 0, page, limit, totalPages: 0 },
                    stats: { total_orders: 0, total_amount: 0, status_counts: {} }
                };
            }

            // 3. Группируем по заказам и собираем детали
            const ordersMap = new Map();
            const productDetailsMap = new Map();
            
            // Сначала соберем все product_id для получения деталей
            const uniqueProductIds = [...new Set(orderItems.map(item => item.product_id))];
            
            // Получаем информацию о товарах одним запросом
            if (uniqueProductIds.length > 0) {
                const { data: productDetails } = await supabase
                    .from('products')
                    .select('id, title, main_image_url')
                    .in('id', uniqueProductIds);
                
                productDetails?.forEach(product => {
                    productDetailsMap.set(product.id, {
                        title: product.title,
                        image: product.main_image_url
                    });
                });
            }
            
            // Группируем заказы
            orderItems.forEach(item => {
                const order = item.orders?.[0];
                if (!order) return;
                
                if (!ordersMap.has(order.id)) {
                    ordersMap.set(order.id, {
                        id: order.id,
                        order_number: order.order_number,
                        status: order.status,
                        total_amount: parseFloat(order.total_amount),
                        payment_status: order.payment_status,
                        payment_method: order.payment_method,
                        shipping_address: order.shipping_address,
                        shipping_city: order.shipping_city,
                        shipping_postal_code: order.shipping_postal_code,
                        notes: order.notes,
                        created_at: order.created_at,
                        updated_at: order.updated_at,
                        buyer_id: order.buyer_id,
                        buyer_name: order.users?.[0]?.profiles?.[0]?.full_name || order.users?.[0]?.email,
                        buyer_email: order.users?.[0]?.email,
                        buyer_phone: order.users?.[0]?.profiles?.[0]?.phone,
                        buyer_city: order.users?.[0]?.profiles?.[0]?.city,
                        buyer_avatar: order.users?.[0]?.profiles?.[0]?.avatar_url,
                        items: [],
                        items_count: 0
                    });
                }
                
                const productInfo = productDetailsMap.get(item.product_id);
                ordersMap.get(order.id).items.push({
                    id: item.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    subtotal: parseFloat(item.price) * item.quantity,
                    title: productInfo?.title || 'Товар',
                    image: productInfo?.image || null
                });
                ordersMap.get(order.id).items_count += item.quantity;
            });
            
            // Конвертируем Map в массив и сортируем
            const orders = Array.from(ordersMap.values());
            
            // 4. Подсчет статистики
            // Получаем все заказы мастера для статистики (без пагинации)
            const { data: allOrderItems } = await supabase
                .from('order_items')
                .select(`
                    quantity,
                    price,
                    order_id,
                    orders!inner (
                        status,
                        total_amount
                    )
                `)
                .in('product_id', productIds);
            
            let totalOrders = 0;
            let totalAmount = 0;
            const statusCounts: Record<string, number> = {};
            const uniqueOrderIds = new Set();
            
            allOrderItems?.forEach(item => {
                const orderIdItem = item.order_id;
                const orderStatus = item.orders?.[0]?.status;
                const orderTotal = item.orders?.[0]?.total_amount;
                
                if (orderIdItem && !uniqueOrderIds.has(orderIdItem)) {
                    uniqueOrderIds.add(orderIdItem);
                    totalOrders++;
                    totalAmount += parseFloat(orderTotal || 0);
                    if (orderStatus) {
                        statusCounts[orderStatus] = (statusCounts[orderStatus] || 0) + 1;
                    }
                }
            });

            return {
                orders,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                stats: {
                    total_orders: totalOrders,
                    total_amount: totalAmount,
                    status_counts: statusCounts
                }
            };
        });

        return NextResponse.json({
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching master orders', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки заказов',
            orders: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            stats: { total_orders: 0, total_amount: 0, status_counts: {} }
        }, { status: 500 });
    }
}

// PATCH - обновить статус заказа
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user || (session.user.role !== 'master' && session.user.role !== 'admin')) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const body = await request.json();
        const { orderId, status, tracking_number, notes } = body;

        if (!orderId || !status) {
            return NextResponse.json({ error: 'ID заказа и статус обязательны' }, { status: 400 });
        }

        const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Неверный статус заказа' }, { status: 400 });
        }

        // Проверяем, что заказ содержит товары мастера
        const { data: orderItems, error: checkError } = await supabase
            .from('order_items')
            .select(`
                product_id,
                products!inner (
                    master_id
                )
            `)
            .eq('order_id', orderId);

        if (checkError) {
            logError('Error checking order', checkError);
            return NextResponse.json({ error: 'Ошибка проверки заказа' }, { status: 500 });
        }

        const hasAccess = orderItems?.some(item => item.products?.[0]?.master_id === session.user.id);
        if (!hasAccess && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обновляем статус заказа
        const updateData: OrderStatusUpdateData = {
            status,
            updated_at: new Date().toISOString()
        };

        if (tracking_number) {
            updateData.tracking_number = tracking_number;
        }
        if (notes) {
            updateData.master_notes = notes;
        }

        if (status === 'delivered') {
            updateData.delivered_at = new Date().toISOString();
        }
        if (status === 'cancelled') {
            updateData.cancelled_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId);

        if (updateError) {
            logError('Error updating order status', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
        }

        // Создаем уведомление для покупателя
        const statusMessages: Record<string, string> = {
            'processing': 'Ваш заказ передан в обработку',
            'shipped': 'Ваш заказ отправлен',
            'delivered': 'Ваш заказ доставлен',
            'completed': 'Заказ выполнен',
            'cancelled': 'Заказ отменен'
        };

        if (statusMessages[status]) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: orderItems?.[0]?.products?.[0]?.master_id === session.user.id
                        ? await getBuyerId(orderId) 
                        : null,
                    title: 'Статус заказа обновлен',
                    message: statusMessages[status],
                    type: 'order',
                    metadata: { order_id: orderId, status },
                    created_at: new Date().toISOString()
                });
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`master_orders_${session.user.id}`));

        logInfo('Order status updated', {
            orderId,
            masterId: session.user.id,
            newStatus: status,
            hasTracking: !!tracking_number
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Статус заказа обновлен',
            status
        }, { status: 200 });
        
    } catch (error) {
        logError('Error updating order', error);
        return NextResponse.json({ error: 'Ошибка обновления заказа' }, { status: 500 });
    }
}

// Вспомогательная функция
async function getBuyerId(orderId: string): Promise<string | null> {
    const { data: order } = await supabase
        .from('orders')
        .select('buyer_id')
        .eq('id', orderId)
        .single();
    
    return order?.buyer_id || null;
}