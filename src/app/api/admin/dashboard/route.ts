import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery } from "@/lib/db-optimized";

const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

const ORDER_STATUS_MAP: Record<string, string> = {'new': 'Новый', 'processing': 'В обработке', 'shipped': 'Отправлен', 'delivered': 'Доставлен', 'cancelled': 'Отменён'};

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin dashboard access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Доступ запрещен. Требуются права администратора.' }, { status: 401 })
        }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {return NextResponse.json({error: 'Слишком много запросов. Попробуйте через минуту.'}, { status: 429 })}

        const cacheKey = 'admin_dashboard_stats';
        
        const stats = await cachedQuery(cacheKey, async () => {
            const [usersCountResult, mastersCountResult, productsCountResult, ordersCountResult, pendingMastersResult, pendingProductsResult, totalRevenueResult, monthlyStatsResult, previousMonthStatsResult] = await Promise.all([supabase.from('users').select('*', { count: 'exact', head: true }), supabase.from('masters').select('*', { count: 'exact', head: true }), supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'), supabase.from('orders').select('*', { count: 'exact', head: true }), supabase.from('masters').select('*', { count: 'exact', head: true }).eq('is_verified', false), supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'moderation'), supabase.from('orders').select('total_amount').eq('status', 'delivered'), supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()), supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()).lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())]);

            const { data: users } = await supabase.from('users').select('id, email, role, created_at').order('created_at', { ascending: false }).limit(10);

            const userIds = users?.map(u => u.id) || []
            const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url, phone, city, address').in('user_id', userIds);

            const profileMap = new Map()
            profiles?.forEach(p => {profileMap.set(p.user_id, p)})

            const recentUsers = users?.map(user => {
                const profile = profileMap.get(user.id);
                const userName = profile?.full_name || user.email?.split('@')[0] || 'Пользователь';
                
                let displayRole = 'Пользователь';
                if (user.role === 'master') {
                    displayRole = 'Мастер';
                } else if (user.role === 'admin') {
                    displayRole = 'Администратор';
                } else if (user.role === 'buyer') {
                    displayRole = 'Покупатель';
                }
                
                return {id: user.id, name: sanitize.text(userName), email: user.email, role: displayRole, role_code: user.role, created_at: user.created_at, phone: profile?.phone || null, avatar: profile?.avatar_url || null, city: profile?.city || null};
            }) || [];

            const { data: orders } = await supabase.from('orders').select(`id, order_number, total_amount, status, created_at, buyer_id`).order('created_at', { ascending: false }).limit(10);
            const buyerIds = orders?.map(o => o.buyer_id) || [];
            const { data: buyers } = await supabase.from('users').select('id, email').in('id', buyerIds);
            const { data: buyerProfiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', buyerIds);

            const buyerMap = new Map();
            buyers?.forEach(b => {buyerMap.set(b.id, { email: b.email });});
            
            const buyerProfileMap = new Map();
            buyerProfiles?.forEach(p => {
                buyerProfileMap.set(p.user_id, p);
            });

            const recentOrders = orders?.map(order => {
                const buyer = buyerMap.get(order.buyer_id);
                const buyerProfile = buyerProfileMap.get(order.buyer_id);
                const buyerName = buyerProfile?.full_name || buyer?.email?.split('@')[0] || 'Покупатель';
                
                return {id: order.id, order_number: order.order_number, total_amount: order.total_amount, status: ORDER_STATUS_MAP[order.status] || order.status, status_code: order.status, created_at: order.created_at, buyer_name: sanitize.text(buyerName), buyer_email: buyer?.email};
            }) || [];

            const revenueData = totalRevenueResult.data as { total_amount: number }[] | null;
            const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

            const monthlyData = monthlyStatsResult.data as { total_amount: number }[] | null;
            const monthlyRevenue = monthlyData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
            const monthlyOrdersCount = monthlyData?.length || 0;

            const previousData = previousMonthStatsResult.data as { total_amount: number }[] | null;
            const previousRevenue = previousData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
            const previousOrdersCount = previousData?.length || 0;

            const calculateGrowth = (current: number, previous: number): number => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Math.round(((current - previous) / previous) * 100);
            };

            const { data: categoryStats } = await supabase.from('products').select('category').eq('status', 'active').not('category', 'is', null);
            
            const categoryMap = new Map<string, number>();
            categoryStats?.forEach(p => {if (p.category) {categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1)}});
            
            const topCategories = Array.from(categoryMap.entries()).map(([name, count]) => ({ name: sanitize.text(name), count })).sort((a, b) => b.count - a.count).slice(0, 5);

            return {totalUsers: usersCountResult.count || 0, totalMasters: mastersCountResult.count || 0, totalProducts: productsCountResult.count || 0, totalOrders: ordersCountResult.count || 0, totalRevenue, monthlyRevenue, monthlyOrders: monthlyOrdersCount, pendingModeration: {masters: pendingMastersResult.count || 0, products: pendingProductsResult.count || 0}, recentUsers, recentOrders, topCategories, trends: {users: calculateGrowth(usersCountResult.count || 0, (usersCountResult.count || 0) - 5), orders: calculateGrowth(ordersCountResult.count || 0, previousOrdersCount), revenue: calculateGrowth(totalRevenue, previousRevenue)}, lastUpdated: new Date().toISOString()};
        }, 30);

        logApiRequest('GET', '/api/admin/dashboard', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(stats, { status: 200 });
        
    } catch(error) {
        logError('Dashboard API error', error);
        return NextResponse.json({ error: 'Ошибка загрузки статистики' }, { status: 500 });
    }
}