// app/api/masters/top/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 120, windowMs: 60 * 1000 });

// Типы данных
type MasterProfile = {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
    address: string | null;
};

type MasterData = {
    total_sales: number | null;
    rating: number | null;
    reviews_count: number | null;
    is_verified: boolean;
    is_partner: boolean;
    custom_orders_enabled: boolean;
    master_since: string | null;
};

type MasterUser = {
    id: string;
    email: string;
    created_at: string;
    profiles: MasterProfile | null;
    masters: MasterData | null;
};

type FormattedMaster = {
    id: string;
    email: string;
    name: string;
    avatar_url: string | null;
    city: string;
    address: string | null;
    member_since: string;
    total_sales: number;
    rating: number;
    reviews_count: number;
    is_verified: boolean;
    is_partner: boolean;
    custom_orders_enabled: boolean;
    followers_count: number;
    products_count: number;
    badge: string | null;
};

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                masters: []
            }, { status: 429 });
        }

        // Параметры запроса
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 20);
        const sortBy = searchParams.get('sortBy') || 'sales';
        const city = searchParams.get('city');
        const category = searchParams.get('category');

        // Кэшируем результат на 10 минут
        const cacheKey = `top_masters_${limit}_${sortBy}_${city || 'all'}_${category || 'all'}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Базовый запрос
            let query = supabase
                .from('users')
                .select(`
                    id,
                    email,
                    created_at,
                    profiles!left (
                        full_name,
                        avatar_url,
                        city,
                        address
                    ),
                    masters!inner (
                        total_sales,
                        rating,
                        reviews_count,
                        is_verified,
                        is_partner,
                        custom_orders_enabled,
                        created_at as master_since
                    )
                `)
                .eq('role', 'master')
                .eq('masters.is_verified', true)
                .eq('masters.is_banned', false);

            // Фильтр по городу
            if (city) {
                query = query.eq('profiles.city', city);
            }

            // Сортировка
            switch (sortBy) {
                case 'rating':
                    query = query.order('rating', { 
                        ascending: false, 
                        nullsFirst: false, 
                        referencedTable: 'masters' 
                    });
                    break;
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'sales':
                default:
                    query = query.order('total_sales', { 
                        ascending: false, 
                        nullsFirst: false, 
                        referencedTable: 'masters' 
                    });
                    break;
            }

            const { data: masters, error } = await query.limit(limit);

            if (error) {
                logError('Error fetching top masters', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!masters || !Array.isArray(masters) || masters.length === 0) {
                return { masters: [], filters: { cities: [], categories: [] }, meta: { total: 0, sort_by: sortBy, limit } };
            }

            // Приводим данные к нужному типу
            const typedMasters = masters as unknown as MasterUser[];
            const masterIds = typedMasters.map(m => m.id);
            
            // Подсчет подписчиков для каждого мастера
            const { data: followersData } = await supabase
                .from('master_followers')
                .select('master_id')
                .in('master_id', masterIds);
            
            const followersCount = new Map<string, number>();
            followersData?.forEach((item: { master_id: string }) => {
                followersCount.set(item.master_id, (followersCount.get(item.master_id) || 0) + 1);
            });

            // Получаем количество товаров для каждого мастера
            const { data: productsData } = await supabase
                .from('products')
                .select('master_id')
                .in('master_id', masterIds)
                .eq('status', 'active');
            
            const productsCount = new Map<string, number>();
            productsData?.forEach((item: { master_id: string }) => {
                productsCount.set(item.master_id, (productsCount.get(item.master_id) || 0) + 1);
            });

            // Форматируем результат
            const formattedMasters: FormattedMaster[] = typedMasters.map((master: MasterUser) => ({
                id: master.id,
                email: master.email,
                name: master.profiles?.full_name || master.email?.split('@')[0] || 'Мастер',
                avatar_url: master.profiles?.avatar_url || null,
                city: master.profiles?.city || '',
                address: master.profiles?.address || null,
                member_since: master.masters?.master_since || master.created_at,
                total_sales: master.masters?.total_sales || 0,
                rating: parseFloat((master.masters?.rating || 0).toFixed(1)),
                reviews_count: master.masters?.reviews_count || 0,
                is_verified: master.masters?.is_verified || false,
                is_partner: master.masters?.is_partner || false,
                custom_orders_enabled: master.masters?.custom_orders_enabled || false,
                followers_count: followersCount.get(master.id) || 0,
                products_count: productsCount.get(master.id) || 0,
                badge: getMasterBadge(master.masters)
            }));

            // Получаем список городов для фильтрации
            const { data: citiesData } = await supabase
                .from('profiles')
                .select('city')
                .not('city', 'is', null)
                .not('city', 'eq', '');
            
            const uniqueCities = [...new Set((citiesData || []).map(c => c.city).filter(Boolean))] as string[];

            // Получаем популярные категории товаров у топ-мастеров
            const { data: productsCategories } = await supabase
                .from('products')
                .select('category')
                .in('master_id', masterIds)
                .eq('status', 'active')
                .not('category', 'is', null);
            
            const categoryCount = new Map<string, number>();
            productsCategories?.forEach(p => {
                if (p.category) {
                    categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
                }
            });
            
            const topCategories = Array.from(categoryCount.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            return {
                masters: formattedMasters,
                filters: {
                    cities: uniqueCities.sort(),
                    categories: topCategories
                },
                meta: {
                    total: formattedMasters.length,
                    sort_by: sortBy,
                    limit
                }
            };
        });

        logInfo('Top masters fetched', {
            count: result.masters.length,
            sortBy: result.meta.sort_by,
            citiesCount: result.filters.cities.length,
            duration: Date.now() - startTime
        });

        return NextResponse.json({
            success: true,
            ...result,
            meta: {
                ...result.meta,
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching top masters', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки топ-мастеров',
            masters: [],
            filters: { cities: [], categories: [] },
            meta: { total: 0, sort_by: 'sales', limit: 6 }
        }, { status: 200 });
    }
}

// Вспомогательная функция для определения бейджа мастера
function getMasterBadge(master: MasterData | null): string | null {
    if (!master) return null;
    if (master.is_partner) {
        return 'partner';
    }
    if (master.is_verified) {
        return 'verified';
    }
    if ((master.total_sales || 0) > 100) {
        return 'top_seller';
    }
    if ((master.rating || 0) >= 4.8) {
        return 'high_rated';
    }
    return null;
}