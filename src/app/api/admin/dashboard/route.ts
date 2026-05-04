// app/api/admin/dashboard/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";

interface UserProfile {
    full_name: string | null
    avatar_url: string | null
}

interface UserWithProfile {
    id: string
    role: string
    created_at: string
    profiles: UserProfile[] | null
}

interface OrderWithUser {
    id: string
    order_number: string
    total_amount: number
    status: string
    created_at: string
    buyer_id: string
    users: {
        email: string
        profiles: UserProfile[] | null
    } | null
}

// Rate limiting
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 }); // 20 запросов в минуту

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin dashboard access attempt', { ip: getClientIP(request) });
            return NextResponse.json(
                { error: 'Доступ запрещен. Требуются права администратора.' }, 
                { status: 401 }
            )
        }

        // Rate limiting
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Кэшируем статистику на 30 секунд
        const cacheKey = 'admin_dashboard_stats';
        
        const stats = await cachedQuery(cacheKey, async () => {
            // Получаем все статистики параллельно
            const [
                usersCountResult,
                mastersCountResult,
                productsCountResult,
                ordersCountResult,
                pendingMastersResult,
                pendingProductsResult,
                recentUsersResult,
                recentOrdersResult,
                totalRevenueResult,
                monthlyStatsResult,
                previousMonthStatsResult
            ] = await Promise.all([
                // Общее количество пользователей (не админов)
                supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .neq('role', 'admin'),
                
                // Количество верифицированных мастеров
                supabase
                    .from('masters')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_verified', true),
                
                // Количество активных товаров
                supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'active'),
                
                // Общее количество заказов
                supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true }),
                
                // Мастера на верификации
                supabase
                    .from('masters')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_verified', false),
                
                // Товары на модерации
                supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'moderation'),
                
                // Последние 5 пользователей
                supabase
                    .from('users')
                    .select(`
                        id,
                        role,
                        created_at,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    `)
                    .neq('role', 'admin')
                    .order('created_at', { ascending: false })
                    .limit(5),
                
                // Последние 5 заказов
                supabase
                    .from('orders')
                    .select(`
                        id,
                        order_number,
                        total_amount,
                        status,
                        created_at,
                        buyer_id,
                        users!inner (
                            email,
                            profiles!left (
                                full_name,
                                avatar_url
                            )
                        )
                    `)
                    .order('created_at', { ascending: false })
                    .limit(5),
                
                // Общая выручка
                supabase
                    .from('orders')
                    .select('total_amount')
                    .eq('status', 'delivered'),
                
                // Статистика за текущий месяц
                supabase
                    .from('orders')
                    .select('total_amount, created_at')
                    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
                
                // Статистика за предыдущий месяц (для сравнения)
                supabase
                    .from('orders')
                    .select('total_amount, created_at')
                    .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
                    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            ]);

            // Логируем ошибки (но не прерываем выполнение)
            if (usersCountResult.error) logError('Users count error', usersCountResult.error, 'warning');
            if (mastersCountResult.error) logError('Masters count error', mastersCountResult.error, 'warning');
            if (productsCountResult.error) logError('Products count error', productsCountResult.error, 'warning');
            if (ordersCountResult.error) logError('Orders count error', ordersCountResult.error, 'warning');

            // Вычисляем общую выручку
            const totalRevenue = totalRevenueResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

            // Вычисляем статистику за месяц
            const monthlyRevenue = monthlyStatsResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
            const monthlyOrdersCount = monthlyStatsResult.data?.length || 0;

            // Вычисляем статистику за предыдущий месяц
            const previousRevenue = previousMonthStatsResult.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
            const previousOrdersCount = previousMonthStatsResult.data?.length || 0;

            // Форматируем последних пользователей с санитизацией
            const recentUsers = (recentUsersResult.data as UserWithProfile[] | null)?.map(user => ({
                id: user.id,
                role: user.role === 'master' ? 'Мастер' : user.role === 'buyer' ? 'Покупатель' : user.role,
                created_at: user.created_at,
                name: sanitize.text(user.profiles?.[0]?.full_name || 'Не указано'),
                avatar: user.profiles?.[0]?.avatar_url || null,
            })) || [];

            // Форматируем последние заказы
            const recentOrders = (recentOrdersResult.data as OrderWithUser[] | null)?.map(order => {
                const statusMap: Record<string, string> = {
                    new: 'Новый',
                    confirmed: 'Подтверждён',
                    processing: 'В обработке',
                    shipped: 'Отправлен',
                    delivered: 'Доставлен',
                    cancelled: 'Отменён',
                    completed: 'Завершён'
                };
                
                return {
                    id: order.id,
                    order_number: order.order_number,
                    total_amount: order.total_amount,
                    status: statusMap[order.status] || order.status,
                    status_code: order.status,
                    created_at: order.created_at,
                    buyer_name: sanitize.text(order.users?.profiles?.[0]?.full_name || order.users?.email || 'Неизвестно'),
                    buyer_avatar: order.users?.profiles?.[0]?.avatar_url || null
                };
            }) || [];

            // Функция для вычисления процента изменений
            const calculateGrowth = (current: number, previous: number): number => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            // Статистика по категориям товаров (топ 5)
            const { data: categoryStats } = await supabase
                .from('products')
                .select('category')
                .eq('status', 'active')
                .not('category', 'is', null);
            
            const categoryMap = new Map<string, number>();
            categoryStats?.forEach(p => {
                if (p.category) {
                    categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
                }
            });
            
            const topCategories = Array.from(categoryMap.entries())
                .map(([name, count]) => ({ name: sanitize.text(name), count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            return {
                totalUsers: usersCountResult.count || 0,
                totalMasters: mastersCountResult.count || 0,
                totalProducts: productsCountResult.count || 0,
                totalOrders: ordersCountResult.count || 0,
                totalRevenue: totalRevenue,
                monthlyRevenue: monthlyRevenue,
                monthlyOrders: monthlyOrdersCount,
                pendingModeration: {
                    masters: pendingMastersResult.count || 0,
                    products: pendingProductsResult.count || 0
                },
                recentUsers,
                recentOrders,
                topCategories,
                trends: {
                    users: calculateGrowth(usersCountResult.count || 0, (usersCountResult.count || 0) - 5),
                    orders: calculateGrowth(ordersCountResult.count || 0, previousOrdersCount),
                    revenue: calculateGrowth(totalRevenue, previousRevenue)
                },
                lastUpdated: new Date().toISOString()
            };
        }, 30); // TTL 30 секунд

        logApiRequest('GET', '/api/admin/dashboard', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(stats, { 
            status: 200,
            headers: { 
                'Cache-Control': 'private, max-age=30',
                'X-Content-Type-Options': 'nosniff',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '20',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '20'
            }
        });
        
    } catch(error) {
        logError('Dashboard API error', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        
        return NextResponse.json(
            { 
                error: 'Ошибка загрузки статистики. Попробуйте позже.',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            }, 
            { status: 500 }
        );
    }
}

// Опционально: эндпоинт для принудительного обновления кэша
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        // Инвалидируем кэш
        invalidateCache('admin_dashboard_stats');
        
        logInfo('Dashboard cache manually refreshed', { adminId: session.user.id });
        
        return NextResponse.json({ 
            success: true, 
            message: 'Кэш статистики обновлен' 
        }, { status: 200 });
        
    } catch (error) {
        logError('Dashboard cache refresh error', error);
        return NextResponse.json({ error: 'Ошибка обновления кэша' }, { status: 500 });
    }
}