import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery } from "@/lib/db-optimized";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;
const limiter = rateLimit({ limit: 100, windowMs: 60 * 1000 });

interface PostFromDB {
    id: string;
    title: string;
    content: string;
    excerpt: string | null;
    category: string | null;
    tags: string[] | null;
    main_image_url: string | null;
    views_count: number;
    likes_count: number;
    created_at: string;
    updated_at: string;
    published_at: string | null;
    master_id: string;
}

interface ProfileData {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        
        const { searchParams } = new URL(request.url);
        const limit = Math.min(
            parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT)),
            MAX_LIMIT
        );
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const sortBy = searchParams.get('sort') || 'newest';

        const cacheKey = `blog_posts_list_${limit}_${page}_${category || 'all'}_${search || 'none'}_${sortBy}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Получаем посты
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
                    master_id
                `, { count: 'exact' })
                .eq('status', 'published');

            if (category && category !== 'all' && category !== 'null') {
                query = query.eq('category', category);
            }

            if (search && search.trim()) {
                const safeSearch = sanitize.text(search);
                query = query.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%`);
            }

            switch (sortBy) {
                case 'popular':
                    query = query.order('views_count', { ascending: false });
                    break;
                case 'newest':
                default:
                    query = query.order('published_at', { ascending: false, nullsFirst: false })
                        .order('created_at', { ascending: false });
                    break;
            }

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

            // Получаем профили мастеров
            const masterIds = [...new Set(posts.map(p => p.master_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name, avatar_url, city')
                .in('user_id', masterIds);

            const profileMap = new Map<string, ProfileData>();
            profiles?.forEach(profile => {
                profileMap.set(profile.user_id, {
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    city: profile.city
                });
            });

            // Получаем количество комментариев
            const postIds = posts.map(p => p.id);
            const { data: commentsCounts } = await supabase
                .from('blog_comments')
                .select('post_id')
                .in('post_id', postIds);

            const commentsMap = new Map<string, number>();
            commentsCounts?.forEach((comment: { post_id: string }) => {
                commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1);
            });

            // Получаем лайки пользователя
            let userLikes: Set<string> = new Set();
            if (session?.user?.id && posts.length > 0) {
                const { data: likes } = await supabase
                    .from('blog_likes')
                    .select('post_id')
                    .in('post_id', postIds)
                    .eq('user_id', session.user.id);
                
                if (likes) {
                    userLikes = new Set(likes.map((like: { post_id: string }) => like.post_id));
                }
            }

            const formattedPosts = posts.map((post: PostFromDB) => {
                const profile = profileMap.get(post.master_id);
                
                return {
                    id: post.id,
                    title: sanitize.text(post.title),
                    content: post.content,
                    excerpt: sanitize.text(post.excerpt || post.content?.substring(0, 200) || ''),
                    category: post.category || "",
                    tags: post.tags || [],
                    main_image_url: post.main_image_url || "",
                    views_count: post.views_count || 0,
                    likes_count: post.likes_count || 0,
                    created_at: post.created_at,
                    updated_at: post.updated_at,
                    published_at: post.published_at,
                    master_id: post.master_id,
                    master_name: sanitize.text(profile?.full_name || 'Мастер'),
                    master_avatar: profile?.avatar_url || null,
                    master_city: sanitize.text(profile?.city || ''),
                    comments_count: commentsMap.get(post.id) || 0,
                    is_liked: session?.user?.id ? userLikes.has(post.id) : false
                };
            });

            // Получаем список категорий
            const { data: categoriesData } = await supabase
                .from('blog_posts')
                .select('category')
                .eq('status', 'published')
                .not('category', 'is', null);
            
            const uniqueCategories = [...new Set(categoriesData?.map((c: { category: string }) => c.category).filter(Boolean))];

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
                stats: { total: count || 0 }
            };
        }, 60);

        logApiRequest('GET', '/api/blog/posts', 200, Date.now() - startTime, session?.user?.id);

        return NextResponse.json(result, {
            status: 200,
            headers: {
                'Cache-Control': 'public, max-age=60'
            }
        });
        
    } catch (error) {
        logError('Error fetching blog posts', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки постов блога',
            posts: [],
            pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0, hasMore: false },
            categories: [],
            stats: { total: 0 }
        }, { status: 500 });
    }
}