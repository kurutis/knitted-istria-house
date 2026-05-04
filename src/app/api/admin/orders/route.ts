// app/api/admin/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Интерфейсы для типов
interface OrderProfile {
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    city: string | null
    address: string | null
}

interface OrderUser {
    email: string
    profiles: OrderProfile[] | null
}

interface OrderItemProduct {
    id: string
    title: string
    main_image_url: string
}

interface OrderItem {
    id: string
    quantity: number
    price: number
    products: OrderItemProduct | null
}

interface OrderWithRelations {
    id: string
    order_number: string
    status: string
    created_at: string
    updated_at: string
    total_amount: number
    buyer_id: string
    users: OrderUser | null
    order_items: OrderItem[] | null
}

// Схема валидации для PATCH запроса
const updateOrderSchema = z.object({
    orderId: z.string().uuid('Неверный формат ID заказа'),
    status: z.enum(['new', 'confirmed', 'shipped', 'delivered', 'cancelled']),
    trackingNumber: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
});

// Схема для GET запроса с пагинацией
const ordersQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['new', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
    search: z.string().max(100).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
});

// Тип для обновления заказа
interface OrderUpdateData {
    status: string
    updated_at: string
    tracking_number?: string
    admin_notes?: string
}

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const patchLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Карта статусов
const statusMap: Record<string, { text: string; order: number; color: string }> = {
    'new': { text: 'Новый', order: 1, color: 'blue' },
    'confirmed': { text: 'Подтверждён', order: 2, color: 'green' },
    'shipped': { text: 'Отправлен', order: 3, color: 'orange' },
    'delivered': { text: 'Доставлен', order: 4, color: 'green' },
    'cancelled': { text: 'Отменён', order: 5, color: 'red' }
};

// Возможные переходы статусов
const allowedTransitions: Record<string, string[]> = {
    'new': ['confirmed', 'cancelled'],
    'confirmed': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': [],
    'cancelled': []
};

function getStatusText(status: string): string {
    return statusMap[status]?.text || status;
}

function getStatusColor(status: string): string {
    return statusMap[status]?.color || 'gray';
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized admin orders access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: "Неавторизован" }, { status: 401 })
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Парсим query параметры
        const { searchParams } = new URL(request.url);
        const validatedQuery = ordersQuerySchema.parse({
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
            status: searchParams.get('status'),
            search: searchParams.get('search'),
            dateFrom: searchParams.get('dateFrom'),
            dateTo: searchParams.get('dateTo'),
        });

        const { page, limit, status, search, dateFrom, dateTo } = validatedQuery;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Ключ кэша
        const cacheKey = `admin_orders_${page}_${limit}_${status || 'all'}_${search || 'none'}_${dateFrom || 'none'}_${dateTo || 'none'}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Строим запрос
            let query = supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    status,
                    created_at,
                    updated_at,
                    total_amount,
                    buyer_id,
                    users!inner (
                        email,
                        profiles!left (
                            full_name,
                            phone,
                            avatar_url,
                            city,
                            address
                        )
                    ),
                    order_items (
                        id,
                        quantity,
                        price,
                        products!inner (
                            id,
                            title,
                            main_image_url
                        )
                    )
                `, { count: 'exact' });

            // Фильтр по статусу
            if (status) {
                query = query.eq('status', status);
            }

            // Фильтр по дате
            if (dateFrom) {
                query = query.gte('created_at', dateFrom);
            }
            if (dateTo) {
                query = query.lte('created_at', dateTo);
            }

            // Поиск по номеру заказа или имени покупателя
            if (search) {
                const safeSearch = sanitize.text(search);
                query = query.or(`order_number.ilike.%${safeSearch}%,users.profiles.full_name.ilike.%${safeSearch}%,users.email.ilike.%${safeSearch}%`);
            }

            // Пагинация и сортировка
            const { data: orders, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                logError('Supabase error in admin orders GET', error);
                throw new Error('DATABASE_ERROR');
            }

            // Форматируем данные с санитизацией
            const formattedOrders = (orders as unknown as OrderWithRelations[] | null)?.map(order => ({
                id: order.id,
                order_number: order.order_number,
                status: order.status,
                status_text: getStatusText(order.status),
                status_color: getStatusColor(order.status),
                created_at: order.created_at,
                updated_at: order.updated_at,
                items_count: order.order_items?.length || 0,
                total_amount: order.total_amount,
                buyer_id: order.buyer_id,
                buyer_name: sanitize.text(order.users?.profiles?.[0]?.full_name || order.users?.email || 'Неизвестно'),
                buyer_email: sanitize.email(order.users?.email || ''),
                buyer_phone: sanitize.phone(order.users?.profiles?.[0]?.phone || ''),
                buyer_avatar: order.users?.profiles?.[0]?.avatar_url,
                buyer_city: sanitize.text(order.users?.profiles?.[0]?.city || ''),
                buyer_address: sanitize.text(order.users?.profiles?.[0]?.address || ''),
                items: order.order_items?.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    product_id: item.products?.id,
                    product_title: sanitize.text(item.products?.title || ''),
                    product_image: item.products?.main_image_url
                })) || [],
                // Доступные действия
                can_cancel: allowedTransitions[order.status]?.includes('cancelled') || false,
                can_confirm: allowedTransitions[order.status]?.includes('confirmed') || false,
                can_ship: allowedTransitions[order.status]?.includes('shipped') || false,
                can_deliver: allowedTransitions[order.status]?.includes('delivered') || false
            })) || [];

            // Статистика по статусам
            const { data: statusStats } = await supabase
                .from('orders')
                .select('status')
                .not('status', 'is', null);

            const statsMap = new Map<string, number>();
            statusStats?.forEach(order => {
                statsMap.set(order.status, (statsMap.get(order.status) || 0) + 1);
            });

            const statusStatsArray = Object.entries(statusMap).map(([key, value]) => ({
                status: key,
                label: value.text,
                count: statsMap.get(key) || 0,
                color: value.color
            }));

            return {
                orders: formattedOrders,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: to + 1 < (count || 0)
                },
                stats: {
                    total: count || 0,
                    by_status: statusStatsArray,
                    total_revenue: orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
                },
                lastUpdated: new Date().toISOString()
            };
        }, 15); // TTL 15 секунд

        logApiRequest('GET', '/api/admin/orders', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(result, {
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=15',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30',
                'X-Total-Count': result.pagination.total.toString()
            }
        });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error fetching orders', error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}

// PATCH - обновление статуса заказа
export async function PATCH(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = patchLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json();
        
        // Валидация
        const validatedData = updateOrderSchema.parse({
            orderId: body.orderId,
            status: body.status,
            trackingNumber: body.trackingNumber,
            notes: body.notes ? sanitize.text(body.notes) : undefined
        });

        const { orderId, status, trackingNumber, notes } = validatedData;

        // Проверяем существование заказа
        const { data: existingOrder, error: checkError } = await supabase
            .from('orders')
            .select('id, status, total_amount, buyer_id, order_number')
            .eq('id', orderId)
            .single();

        if (checkError || !existingOrder) {
            logInfo('Order not found for admin action', { orderId });
            return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
        }

        // Проверяем возможность перехода по статусам
        if (!allowedTransitions[existingOrder.status]?.includes(status)) {
            return NextResponse.json({ 
                error: `Невозможно изменить статус с "${getStatusText(existingOrder.status)}" на "${getStatusText(status)}"` 
            }, { status: 400 });
        }

        // Обновляем статус заказа
        const updateData: OrderUpdateData = {
            status: status,
            updated_at: new Date().toISOString()
        };

        if (trackingNumber) {
            updateData.tracking_number = trackingNumber;
        }
        if (notes) {
            updateData.admin_notes = notes;
        }

        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId)
            .select()
            .single();

        if (updateError) {
            logError('Error updating order', updateError);
            return NextResponse.json({ error: "Ошибка обновления заказа" }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(/^admin_orders/);
        invalidateCache(`order_${orderId}`);

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'ORDER_STATUS_UPDATE',
                entity_type: 'order',
                entity_id: orderId,
                old_values: { status: existingOrder.status },
                new_values: { status: status, tracking_number: trackingNumber, notes: notes },
                created_at: new Date().toISOString()
            });

        // Отправляем уведомление покупателю
        const notificationMessages: Record<string, { title: string; message: string }> = {
            'confirmed': {
                title: `Заказ #${existingOrder.order_number} подтверждён`,
                message: 'Ваш заказ подтверждён и передан в обработку.'
            },
            'shipped': {
                title: `Заказ #${existingOrder.order_number} отправлен`,
                message: trackingNumber 
                    ? `Ваш заказ отправлен. Трек-номер: ${trackingNumber}`
                    : 'Ваш заказ отправлен. Следите за статусом доставки.'
            },
            'delivered': {
                title: `Заказ #${existingOrder.order_number} доставлен`,
                message: 'Ваш заказ доставлен! Спасибо за покупку!'
            },
            'cancelled': {
                title: `Заказ #${existingOrder.order_number} отменён`,
                message: notes || 'Ваш заказ был отменён. Средства будут возвращены в ближайшее время.'
            }
        };

        const notification = notificationMessages[status];
        if (notification) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: existingOrder.buyer_id,
                    title: notification.title,
                    message: notification.message,
                    type: 'order_status',
                    metadata: { order_id: orderId, status: status, tracking_number: trackingNumber },
                    created_at: new Date().toISOString(),
                    is_read: false
                });
        }

        logApiRequest('PATCH', '/api/admin/orders', 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin updated order status`, { 
            orderId, 
            adminId: session.user.id,
            oldStatus: existingOrder.status,
            newStatus: status,
            hasTracking: !!trackingNumber
        });

        return NextResponse.json({ 
            success: true, 
            message: `Статус заказа изменён на "${getStatusText(status)}"`,
            order: {
                id: updatedOrder.id,
                status: updatedOrder.status,
                status_text: getStatusText(updatedOrder.status),
                status_color: getStatusColor(updatedOrder.status),
                updated_at: updatedOrder.updated_at
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating order', error);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
}