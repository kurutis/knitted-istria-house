import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery } from "@/lib/db-optimized";

interface BlogImage {
    id: string
    image_url: string
    sort_order: number
}

// Конфигурация пагинации
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

// Rate limiting для публичных запросов
const limiter = rateLimit({ limit: 100, windowMs: 60 * 1000 });

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for blog posts', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        
        // Получаем параметры пагинации и фильтрации
        const { searchParams } = new URL(request.url);
        const limit = Math.min(
            parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)),
            MAX_LIMIT
        );
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const sortBy = searchParams.get('sort') || 'newest'; // newest, popular, most_commented

        // Ключ кэша
        const cacheKey = `blog_posts_list_${limit}_${page}_${category || 'all'}_${search || 'none'}_${sortBy}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Строим запрос
            let query = supabase
                .from('blog_posts')
                .select(`
                    id,
                    title,
                    content,
                    excerpt,
                    category,
                    tags,
                    main_image_url,
                    views_count,
                    likes_count,
                    created_at,
                    updated_at,
                    published_at,
                    master_id,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url,
                            city
                        )
                    ),
                    blog_images (
                        id,
                        image_url,
                        sort_order
                    ),
                    blog_comments!left (
                        id
                    )
                `, { count: 'exact' })
                .eq('status', 'published');

            // Фильтр по категории
            if (category && category !== 'all' && category !== 'null') {
                query = query.eq('category', category);
            }

            // Поиск по заголовку или содержанию
            if (search && search.trim()) {
                const safeSearch = sanitize.text(search);
                query = query.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%`);
            }

            // Сортировка
            switch (sortBy) {
                case 'popular':
                    query = query.order('views_count', { ascending: false });
                    break;
                case 'most_commented':
                    // Сортировка по количеству комментариев будет выполнена после запроса
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'newest':
                default:
                    query = query.order('published_at', { ascending: false, nullsFirst: false })
                        .order('created_at', { ascending: false });
                    break;
            }

            // Пагинация
            const { data: posts, error, count } = await query
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching blog posts', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!posts || posts.length === 0) {
                return {
                    posts: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    },
                    categories: [],
                    stats: { total: 0 }
                };
            }

            // Получаем лайки пользователя (если авторизован)
            let userLikes: Set<string> = new Set();
            if (session?.user?.id && posts.length > 0) {
                const postIds = posts.map(post => post.id);
                const { data: likes } = await supabase
                    .from('blog_likes')
                    .select('post_id')
                    .in('post_id', postIds)
                    .eq('user_id', session.user.id);
                
                if (likes) {
                    userLikes = new Set(likes.map(like => like.post_id));
                }
            }

            // Форматируем данные
            const formattedPosts = posts.map(post => ({
                id: post.id,
                title: sanitize.text(post.title),
                content: post.content,
                excerpt: sanitize.text(post.excerpt || post.content?.substring(0, 200) + (post.content?.length > 200 ? '...' : '')),
                category: post.category,
                tags: post.tags || [],
                main_image_url: post.main_image_url,
                views_count: post.views_count || 0,
                likes_count: post.likes_count || 0,
                created_at: post.created_at,
                updated_at: post.updated_at,
                published_at: post.published_at,
                master_id: post.master_id,
                master_name: sanitize.text(post.users?.[0]?.profiles?.[0]?.full_name || post.users?.[0]?.email?.split('@')[0] || 'Мастер'),
                master_avatar: post.users?.[0]?.profiles?.[0]?.avatar_url,
                master_city: sanitize.text(post.users?.[0]?.profiles?.[0]?.city || ''),
                images: post.blog_images?.sort((a: BlogImage, b: BlogImage) => a.sort_order - b.sort_order) || [],
                comments_count: post.blog_comments?.length || 0,
                is_liked: session?.user?.id ? userLikes.has(post.id) : false,
                preview_content: post.content?.substring(0, 300) + (post.content?.length > 300 ? '...' : '')
            }));

            // Сортировка по количеству комментариев (если выбрана)
            if (sortBy === 'most_commented') {
                formattedPosts.sort((a, b) => b.comments_count - a.comments_count);
            }

            // Получаем список категорий для фильтрации
            const { data: categoriesData } = await supabase
                .from('blog_posts')
                .select('category')
                .eq('status', 'published')
                .not('category', 'is', null);
            
            const uniqueCategories = [...new Set(categoriesData?.map(c => c.category).filter(Boolean))];

            // Статистика
            const { data: allPosts } = await supabase
                .from('blog_posts')
                .select('views_count, likes_count')
                .eq('status', 'published');
            
            const stats = {
                total: count || 0,
                total_views: allPosts?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0,
                total_likes: allPosts?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0
            };

            return {
                posts: formattedPosts,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                categories: uniqueCategories.sort(),
                stats,
                lastUpdated: new Date().toISOString()
            };
        }, 60); // TTL 60 секунд

        logApiRequest('GET', '/api/blog/posts', 200, Date.now() - startTime, session?.user?.id);

        return NextResponse.json(result, {
            status: 200,
            headers: {
                'Cache-Control': 'public, max-age=60',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '100',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '100',
                'X-Total-Count': result.pagination.total.toString()
            }
        });
        
    } catch (error) {
        logError('Error fetching blog posts', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки постов блога',
            posts: [],
            pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0, hasMore: false },
            categories: [],
            stats: { total: 0, total_views: 0, total_likes: 0 }
        }, { status: 500 });
    }
}

// Опционально: эндпоинт для получения категорий блога
export async function GET_CATEGORIES(request: Request) {
    const startTime = Date.now();
    
    try {
        const cacheKey = 'blog_categories';
        
        const categories = await cachedQuery(cacheKey, async () => {
            const { data: categoriesData, error } = await supabase
                .from('blog_posts')
                .select('category')
                .eq('status', 'published')
                .not('category', 'is', null);

            if (error) {
                logError('Error fetching blog categories', error);
                return [];
            }

            const categoryMap = new Map<string, number>();
            categoriesData?.forEach(post => {
                if (post.category) {
                    categoryMap.set(post.category, (categoryMap.get(post.category) || 0) + 1);
                }
            });

            return Array.from(categoryMap.entries())
                .map(([name, count]) => ({ 
                    name: sanitize.text(name), 
                    slug: name.toLowerCase().replace(/\s+/g, '-'),
                    count 
                }))
                .sort((a, b) => b.count - a.count);
        }, 300); // 5 минут кэширования

        logApiRequest('GET', '/api/blog/categories', 200, Date.now() - startTime);

        return NextResponse.json({ 
            success: true, 
            categories,
            total: categories.length
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching blog categories', error);
        return NextResponse.json({ categories: [], total: 0 }, { status: 500 });
    }
}