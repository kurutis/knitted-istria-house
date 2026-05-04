// app/api/master/stats/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 запросов в минуту

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
                ...getDefaultStats()
            }, { status: 429 });
        }

        // Кэшируем статистику на 5 минут
        const cacheKey = `master_stats_${session.user.id}`;
        
        const stats = await cachedQuery(cacheKey, async () => {
            // 1. Получаем товары мастера (только нужные поля)
            const { data: products, error: productsError } = await supabase
                .from('products')
                .select('id, views, status, created_at')
                .eq('master_id', session.user.id);

            if (productsError) {
                logError('Error fetching products for stats', productsError);
                throw new Error('DATABASE_ERROR');
            }

            const productIds = products?.map(p => p.id) || [];
            
            // Статистика по товарам
            const totalProducts = productIds.length;
            const totalViews = products?.reduce((sum, product) => sum + (product.views || 0), 0) || 0;
            const activeProducts = products?.filter(p => p.status === 'active').length || 0;
            const moderationProducts = products?.filter(p => p.status === 'moderation').length || 0;
            
            // Новые товары за последние 30 дней
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const newProductsLastMonth = products?.filter(p => 
                p.created_at && new Date(p.created_at) > thirtyDaysAgo
            ).length || 0;

            // 2. Статистика по заказам
            let totalOrders = 0;
            let newOrders = 0;
            let completedOrders = 0;
            let cancelledOrders = 0;
            let totalRevenue = 0;
            let monthlyRevenue = 0;

            if (productIds.length > 0) {
                // Получаем все order_items для товаров мастера
                const { data: orderItems, error: itemsError } = await supabase
                    .from('order_items')
                    .select(`
                        id,
                        quantity,
                        price,
                        order_id,
                        orders!inner (
                            id,
                            status,
                            total_amount,
                            created_at
                        )
                    `)
                    .in('product_id', productIds);

                if (!itemsError && orderItems) {
                    const uniqueOrders = new Map();
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    
                    orderItems.forEach(item => {
                        const order = item.orders?.[0];
                        if (order && order.id && !uniqueOrders.has(order.id)) {
                            uniqueOrders.set(order.id, {
                                status: order.status,
                                total_amount: parseFloat(order.total_amount || 0),
                                created_at: order.created_at
                            });
                        }
                    });
                    
                    const orders = Array.from(uniqueOrders.values());
                    totalOrders = orders.length;
                    newOrders = orders.filter(o => o.status === 'new').length;
                    completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
                    cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
                    totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                    
                    // Выручка за текущий месяц
                    monthlyRevenue = orders
                        .filter(o => {
                            const date = new Date(o.created_at);
                            return date.getMonth() === currentMonth && 
                                   date.getFullYear() === currentYear &&
                                   (o.status === 'completed' || o.status === 'delivered');
                        })
                        .reduce((sum, o) => sum + (o.total_amount || 0), 0);
                }
            }

            // 3. Статистика по мастер-классам
            const { data: masterClasses, error: classesError } = await supabase
                .from('master_classes')
                .select(`
                    id,
                    status,
                    current_participants,
                    max_participants,
                    price,
                    created_at,
                    date_time
                `)
                .eq('master_id', session.user.id);

            let totalMasterClasses = 0;
            let totalParticipants = 0;
            let upcomingClasses = 0;
            let completedClasses = 0;
            let masterClassRevenue = 0;

            if (!classesError && masterClasses) {
                totalMasterClasses = masterClasses.length;
                upcomingClasses = masterClasses.filter(mc => 
                    mc.status === 'published' && new Date(mc.date_time) > new Date()
                ).length;
                completedClasses = masterClasses.filter(mc => mc.status === 'completed').length;
                totalParticipants = masterClasses.reduce((sum, mc) => sum + (mc.current_participants || 0), 0);
                masterClassRevenue = masterClasses
                    .filter(mc => mc.status === 'completed')
                    .reduce((sum, mc) => sum + ((mc.current_participants || 0) * (mc.price || 0)), 0);
            }

            // 4. Подписчики (из таблицы followers)
            const { count: followersCount, error: followersError } = await supabase
                .from('followers')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', session.user.id);

            if (followersError) {
                logError('Error fetching followers count', followersError, 'warning');
            }

            // 5. Рейтинг и отзывы
            const { data: reviews, error: reviewsError } = await supabase
                .from('reviews')
                .select('rating')
                .eq('master_id', session.user.id)
                .eq('target_type', 'master');

            let averageRating = 0;
            let totalReviews = 0;

            if (!reviewsError && reviews) {
                totalReviews = reviews.length;
                if (totalReviews > 0) {
                    averageRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews;
                }
            }

            // 6. Статистика по индивидуальным заказам
            const { data: customRequests, error: customError } = await supabase
                .from('custom_requests')
                .select('status')
                .eq('master_id', session.user.id);

            let pendingRequests = 0;
            let acceptedRequests = 0;

            if (!customError && customRequests) {
                pendingRequests = customRequests.filter(r => r.status === 'pending').length;
                acceptedRequests = customRequests.filter(r => r.status === 'accepted').length;
            }

            return {
                // Общая статистика
                total_products: totalProducts,
                active_products: activeProducts,
                moderation_products: moderationProducts,
                new_products_last_month: newProductsLastMonth,
                total_views: totalViews,
                
                // Заказы
                new_orders: newOrders,
                total_orders: totalOrders,
                completed_orders: completedOrders,
                cancelled_orders: cancelledOrders,
                total_revenue: Math.round(totalRevenue),
                monthly_revenue: Math.round(monthlyRevenue),
                
                // Мастер-классы
                total_master_classes: totalMasterClasses,
                upcoming_classes: upcomingClasses,
                completed_classes: completedClasses,
                total_participants: totalParticipants,
                master_class_revenue: Math.round(masterClassRevenue),
                
                // Сообщество
                total_followers: followersCount || 0,
                average_rating: parseFloat(averageRating.toFixed(1)),
                total_reviews: totalReviews,
                
                // Индивидуальные заказы
                pending_custom_requests: pendingRequests,
                accepted_custom_requests: acceptedRequests
            };
        });

        logInfo('Master stats fetched', {
            userId: session.user.id,
            duration: Date.now() - startTime
        });

        return NextResponse.json({
            success: true,
            ...stats,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching master stats', error);
        return NextResponse.json({
            success: false,
            error: 'Ошибка загрузки статистики',
            ...getDefaultStats()
        }, { status: 500 });
    }
}

// Функция для получения дефолтной статистики
function getDefaultStats() {
    return {
        total_products: 0,
        active_products: 0,
        moderation_products: 0,
        new_products_last_month: 0,
        total_views: 0,
        new_orders: 0,
        total_orders: 0,
        completed_orders: 0,
        cancelled_orders: 0,
        total_revenue: 0,
        monthly_revenue: 0,
        total_master_classes: 0,
        upcoming_classes: 0,
        completed_classes: 0,
        total_participants: 0,
        master_class_revenue: 0,
        total_followers: 0,
        average_rating: 0,
        total_reviews: 0,
        pending_custom_requests: 0,
        accepted_custom_requests: 0
    };
}