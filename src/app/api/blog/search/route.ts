// app/api/search/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery } from "@/lib/db-optimized";

// Rate limiting для поиска (20 запросов в минуту)
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Минимальная длина поискового запроса
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

// Расчёт релевантности
function calculateRelevance(text: string, searchQuery: string): number {
    if (!text) return 0;
    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    
    if (lowerText === lowerQuery) return 100;
    if (lowerText.startsWith(lowerQuery)) return 90;
    if (lowerText.includes(lowerQuery)) return 70;
    if (lowerText.split(' ').some(word => word === lowerQuery)) return 80;
    
    return 0;
}

// Подсветка поискового запроса
function highlightText(text: string, query: string): string {
    if (!text || !query) return sanitize.text(text);
    
    const sanitizedText = sanitize.text(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    return sanitizedText.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for search', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                masters: [],
                posts: [],
                query: ''
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const rawQuery = searchParams.get('q') || '';
        const session = await getServerSession(authOptions);
        
        // Валидация поискового запроса
        const query = sanitize.text(rawQuery);
        
        if (!query || query.length < MIN_QUERY_LENGTH) {
            return NextResponse.json({ 
                masters: [], 
                posts: [], 
                query: query,
                message: `Минимальная длина запроса - ${MIN_QUERY_LENGTH} символа`
            });
        }
        
        if (query.length > MAX_QUERY_LENGTH) {
            return NextResponse.json({ 
                masters: [], 
                posts: [], 
                query: query.substring(0, MAX_QUERY_LENGTH),
                message: 'Запрос слишком длинный'
            });
        }

        // Ключ кэша
        const cacheKey = `search_${query.toLowerCase()}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            const searchTerm = `%${query}%`;
            
            // ========================
            // ПОИСК МАСТЕРОВ
            // ========================
            let mastersQuery = supabase
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
                    masters!left (
                        rating,
                        total_sales,
                        is_verified,
                        is_partner,
                        custom_orders_enabled
                    )
                `)
                .eq('role', 'master')
                .eq('masters.is_banned', false)
                .limit(10);

            mastersQuery = mastersQuery.or(
                `profiles.full_name.ilike.${searchTerm},` +
                `email.ilike.${searchTerm},` +
                `profiles.city.ilike.${searchTerm},` +
                `profiles.address.ilike.${searchTerm}`
            );

            const { data: mastersData, error: mastersError } = await mastersQuery;

            if (mastersError) {
                logError('Error searching masters', mastersError, 'warning');
            }

            // Получаем подписки пользователя
            let followingSet = new Set();
            if (session?.user?.id) {
                const { data: following } = await supabase
                    .from('master_followers')
                    .select('master_id')
                    .eq('follower_id', session.user.id);

                if (following) {
                    followingSet = new Set(following.map(f => f.master_id));
                }
            }

            // Форматируем мастеров
            const masters = mastersData?.map(master => ({
                id: master.id,
                name: sanitize.text(master.profiles?.[0]?.full_name || master.email?.split('@')[0] || 'Мастер'),
                email: sanitize.email(master.email),
                avatar_url: master.profiles?.[0]?.avatar_url,
                city: sanitize.text(master.profiles?.[0]?.city || ''),
                address: sanitize.text(master.profiles?.[0]?.address || ''),
                rating: master.masters?.[0]?.rating || 0,
                total_sales: master.masters?.[0]?.total_sales || 0,
                is_verified: master.masters?.[0]?.is_verified || false,
                is_partner: master.masters?.[0]?.is_partner || false,
                custom_orders_enabled: master.masters?.[0]?.custom_orders_enabled || false,
                is_following: followingSet.has(master.id),
                relevance: calculateRelevance(
                    master.profiles?.[0]?.full_name || master.email,
                    query
                ),
                highlighted_name: highlightText(master.profiles?.[0]?.full_name || master.email, query)
            })).sort((a, b) => b.relevance - a.relevance) || [];

            // ========================
            // ПОИСК ПОСТОВ
            // ========================
            let postsQuery = supabase
                .from('blog_posts')
                .select(`
                    id,
                    title,
                    content,
                    excerpt,
                    main_image_url,
                    created_at,
                    published_at,
                    master_id,
                    views_count,
                    likes_count,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                `)
                .eq('status', 'published')
                .limit(20);

            postsQuery = postsQuery.or(`title.ilike.${searchTerm},content.ilike.${searchTerm},excerpt.ilike.${searchTerm}`);

            const { data: postsData, error: postsError } = await postsQuery
                .order('published_at', { ascending: false, nullsFirst: false })
                .order('created_at', { ascending: false });

            if (postsError) {
                logError('Error searching posts', postsError, 'warning');
            }

            // Получаем лайки пользователя
            let userLikes = new Set();
            if (session?.user?.id && postsData && postsData.length > 0) {
                const postIds = postsData.map(p => p.id);
                const { data: likes } = await supabase
                    .from('blog_likes')
                    .select('post_id')
                    .in('post_id', postIds)
                    .eq('user_id', session.user.id);

                if (likes) {
                    userLikes = new Set(likes.map(l => l.post_id));
                }
            }

            // Получаем количество комментариев для постов
            const commentsMap = new Map();
            if (postsData && postsData.length > 0) {
                const postIds = postsData.map(p => p.id);
                const { data: comments } = await supabase
                    .from('blog_comments')
                    .select('post_id')
                    .in('post_id', postIds);

                if (comments) {
                    comments.forEach(c => {
                        commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1);
                    });
                }
            }

            // Форматируем посты с подсветкой
            const posts = postsData?.map(post => ({
                id: post.id,
                title: sanitize.text(post.title),
                content: post.content,
                excerpt: sanitize.text(post.excerpt || post.content?.substring(0, 500)),
                main_image_url: post.main_image_url,
                created_at: post.created_at,
                published_at: post.published_at,
                master_id: post.master_id,
                master_name: sanitize.text(post.users?.[0]?.profiles?.[0]?.full_name || post.users?.[0]?.email?.split('@')[0] || 'Мастер'),
                master_avatar: post.users?.[0]?.profiles?.[0]?.avatar_url,
                views_count: post.views_count || 0,
                likes_count: post.likes_count || 0,
                comments_count: commentsMap.get(post.id) || 0,
                is_liked: session?.user?.id ? userLikes.has(post.id) : false,
                highlighted_title: highlightText(post.title, query),
                highlighted_content: highlightText(
                    post.excerpt || post.content?.substring(0, 500) || '',
                    query
                )
            })) || [];

            return {
                masters,
                posts,
                query,
                total: {
                    masters: masters.length,
                    posts: posts.length,
                    all: masters.length + posts.length
                },
                lastUpdated: new Date().toISOString()
            };
        }, 300); // TTL 5 минут

        logApiRequest('GET', '/api/search', 200, Date.now() - startTime, session?.user?.id);
        logInfo(`Search performed`, { 
            query, 
            mastersCount: result.total.masters,
            postsCount: result.total.posts,
            ip: ip.substring(0, 15)
        });

        return NextResponse.json(result, {
            status: 200,
            headers: {
                'Cache-Control': 'public, max-age=300',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '20',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '20'
            }
        });
        
    } catch (error) {
        logError('Error in search API', error);
        return NextResponse.json({ 
            error: 'Ошибка выполнения поиска',
            masters: [], 
            posts: [], 
            query: ''
        }, { status: 500 });
    }
}