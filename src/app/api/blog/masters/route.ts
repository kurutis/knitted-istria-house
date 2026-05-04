import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

interface MasterData {
    id: string
    name: string
    avatar_url: string | null
    city: string | null
    rating: number
    total_sales: number
    is_verified: boolean
    products_count: number
    posts_count: number
    is_following: boolean
}

interface CachedMastersData {
    data: MasterData[]
    expires: number
}

// Rate limiting для публичных запросов
const limiter = rateLimit({ limit: 100, windowMs: 60 * 1000 });

// Кэширование для публичных данных
const cacheStore = new Map<string, CachedMastersData>();

async function getCachedMasters() {
    const cached = cacheStore.get('blog_masters_recommended');
    if (cached && cached.expires > Date.now()) {
        return cached.data;
    }
    return null;
}

async function setCachedMasters(data: MasterData[]) {
    cacheStore.set('blog_masters_recommended', {
        data,
        expires: Date.now() + 300 * 1000 // 5 минут
    });
}

export async function GET(request: Request) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        
        let following: MasterData[] = []
        
        // Если пользователь авторизован, получаем мастеров на которых он подписан
        if (session?.user) {
            // Сначала получаем ID мастеров, на которых подписан пользователь
            const { data: followingIds, error: followError } = await supabase
                .from('master_followers')
                .select('master_id')
                .eq('follower_id', session.user.id)
                .limit(10);

            if (!followError && followingIds && followingIds.length > 0) {
                const masterIds = followingIds.map(f => f.master_id);
                
                // Получаем данные мастеров
                const { data: mastersData, error: mastersError } = await supabase
                    .from('users')
                    .select(`
                        id,
                        email,
                        created_at,
                        profiles!left (
                            full_name,
                            avatar_url,
                            city
                        ),
                        masters!left (
                            rating,
                            total_sales,
                            is_verified
                        )
                    `)
                    .in('id', masterIds)
                    .eq('role', 'master');

                if (!mastersError && mastersData) {
                    following = mastersData.map(user => ({
                        id: user.id,
                        name: escapeHtml(user.profiles?.[0]?.full_name || user.email),
                        avatar_url: user.profiles?.[0]?.avatar_url,
                        city: user.profiles?.[0]?.city,
                        rating: user.masters?.[0]?.rating || 0,
                        total_sales: user.masters?.[0]?.total_sales || 0,
                        is_verified: user.masters?.[0]?.is_verified || false,
                        products_count: 0,
                        posts_count: 0,
                        is_following: true
                    }));
                }
            }
        }

        // Проверяем кэш для рекомендуемых мастеров
        const cachedRecommended = await getCachedMasters();
        if (cachedRecommended) {
            return NextResponse.json({ 
                following, 
                recommended: cachedRecommended 
            }, {
                status: 200,
                headers: { 'Cache-Control': 'public, max-age=300' }
            });
        }

        // Получаем рекомендуемых мастеров (сортировка по рейтингу и продажам)
        const { data: recommendedData, error: recommendedError } = await supabase
            .from('users')
            .select(`
                id,
                email,
                created_at,
                profiles!left (
                    full_name,
                    avatar_url,
                    city
                ),
                masters!left (
                    rating,
                    total_sales,
                    is_verified
                )
            `)
            .eq('role', 'master')
            .order('total_sales', { ascending: false, nullsFirst: false })
            .order('rating', { ascending: false, nullsFirst: false })
            .limit(10);

        if (recommendedError) {
            console.error('Error fetching recommended masters:', recommendedError);
            return NextResponse.json({ following: [], recommended: [] });
        }

        // Получаем ID мастеров, на которых подписан пользователь (для проверки is_following)
        let followingSet = new Set();
        if (session?.user?.id) {
            const { data: followingIds } = await supabase
                .from('master_followers')
                .select('master_id')
                .eq('follower_id', session.user.id);

            if (followingIds) {
                followingSet = new Set(followingIds.map(f => f.master_id));
            }
        }

        const recommended = recommendedData?.map(user => ({
            id: user.id,
            name: escapeHtml(user.profiles?.[0]?.full_name || user.email),
            avatar_url: user.profiles?.[0]?.avatar_url,
            city: user.profiles?.[0]?.city,
            rating: user.masters?.[0]?.rating || 0,
            total_sales: user.masters?.[0]?.total_sales || 0,
            is_verified: user.masters?.[0]?.is_verified || false,
            products_count: 0,
            posts_count: 0,
            is_following: followingSet.has(user.id)
        })) || [];

        // Сохраняем в кэш
        await setCachedMasters(recommended);

        return NextResponse.json({ 
            following, 
            recommended,
            lastUpdated: new Date().toISOString()
        }, {
            status: 200,
            headers: { 'Cache-Control': 'public, max-age=300' }
        });
        
    } catch (error) {
        console.error('Error fetching masters:', error);
        return NextResponse.json({ following: [], recommended: [] }, { status: 500 });
    }
}

// Вспомогательная функция для экранирования HTML
function escapeHtml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}