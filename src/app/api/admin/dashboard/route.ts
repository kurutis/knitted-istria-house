// app/api/admin/dashboard/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";

// Определяем типы
interface UserProfile {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
}

interface UserWithProfile {
    id: string;
    email: string;
    role: string;
    created_at: string;
    profiles: UserProfile[] | null;
}

interface OrderUser {
    email: string;
    profiles: UserProfile[] | null;
}

interface OrderWithUser {
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    created_at: string;
    buyer_id: string;
    users: OrderUser | null;
}

interface CategoryStat {
    category: string | null;
}

// Rate limiting
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

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
                
                // Количество мастеров
                supabase
                    .from('masters')
                    .select('*', { count: 'exact', head: true }),
                
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
                
                // Последние 10 пользователей (не админов)
                supabase
                    .from('users')
                    .select(`
                        id,
                        email,
                        role,
                        created_at,
                        profiles (
                            full_name,
                            avatar_url,
                            phone
                        )
                    `)
                    .neq('role', 'admin')
                    .order('created_at', { ascending: false })
                    .limit(10),
                
                // Последние 10 заказов
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
                            profiles (
                                full_name
                            )
                        )
                    `)
                    .order('created_at', { ascending: false })
                    .limit(10),
                
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

            // Форматируем последних пользователей
            const recentUsersData = (recentUsersResult.data as UserWithProfile[] | null) || [];
            const recentUsers = recentUsersData.map((user) => {
                // Получаем имя из профиля
                let userName: string | null = null;
                let userPhone: string | null = null;
                let userAvatar: string | null = null;
                
                if (user.profiles && Array.isArray(user.profiles) && user.profiles.length > 0) {
                    userName = user.profiles[0]?.full_name;
                    userPhone = user.profiles[0]?.phone;
                    userAvatar = user.profiles[0]?.avatar_url;
                }
                
                return {
                    id: user.id,
                    name: userName || user.email?.split('@')[0] || 'Пользователь',
                    email: user.email,
                    role: user.role === 'master' ? 'Мастер' : user.role === 'buyer' ? 'Покупатель' : user.role,
                    created_at: user.created_at,
                    phone: userPhone,
                    avatar: userAvatar
                };
            });

            // Форматируем последние заказы
            const recentOrdersData = (recentOrdersResult.data as OrderWithUser[] | null) || [];
            const recentOrders = recentOrdersData.map((order) => {
                const statusMap: Record<string, string> = {
                    new: 'Новый',
                    confirmed: 'Подтверждён',
                    processing: 'В обработке',
                    shipped: 'Отправлен',
                    delivered: 'Доставлен',
                    cancelled: 'Отменён',
                    completed: 'Завершён'
                };
                
                // Получаем имя покупателя
                let buyerName: string | null = null;
                if (order.users && order.users.profiles && Array.isArray(order.users.profiles) && order.users.profiles.length > 0) {
                    buyerName = order.users.profiles[0]?.full_name;
                }
                
                return {
                    id: order.id,
                    order_number: order.order_number,
                    total_amount: order.total_amount,
                    status: statusMap[order.status] || order.status,
                    status_code: order.status,
                    created_at: order.created_at,
                    buyer_name: buyerName || order.users?.email?.split('@')[0] || 'Покупатель',
                    buyer_email: order.users?.email
                };
            });

            // Вычисляем общую выручку
            const revenueData = totalRevenueResult.data as { total_amount: number }[] | null;
            const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

            // Вычисляем статистику за месяц
            const monthlyData = monthlyStatsResult.data as { total_amount: number }[] | null;
            const monthlyRevenue = monthlyData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
            const monthlyOrdersCount = monthlyData?.length || 0;

            // Вычисляем статистику за предыдущий месяц
            const previousData = previousMonthStatsResult.data as { total_amount: number }[] | null;
            const previousRevenue = previousData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
            const previousOrdersCount = previousData?.length || 0;

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
            (categoryStats as CategoryStat[] | null)?.forEach(p => {
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
                totalRevenue,
                monthlyRevenue,
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
        }, 30);

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