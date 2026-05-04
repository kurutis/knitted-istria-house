// app/api/admin/knowledge/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

interface CategoryData {
    id: number
    name: string
    slug: string
}

// Схема валидации для POST запроса
const createArticleSchema = z.object({
    title: z.string().min(3, 'Заголовок должен содержать минимум 3 символа').max(255),
    content: z.string().min(10, 'Содержание должно содержать минимум 10 символов'),
    category: z.string().min(1, 'Выберите категорию'),
    tags: z.string().optional(),
    is_published: z.boolean().optional(),
});

// Схема для GET запроса
const articlesQuerySchema = z.object({
    category: z.string().optional(),
    search: z.string().max(100).optional(),
    status: z.enum(['published', 'draft', 'all']).default('all'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
});

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

// Обработка тегов
function processTags(tags: string | undefined): string[] | null {
    if (!tags) return null;
    return tags.split(',').map(t => sanitize.text(t.trim())).filter(t => t.length > 0);
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized knowledge articles access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        
        // Валидация query параметров
        const validatedQuery = articlesQuerySchema.parse({
            category: searchParams.get('category'),
            search: searchParams.get('search'),
            status: searchParams.get('status'),
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
        });

        const { category, search, status, page, limit } = validatedQuery;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Ключ кэша
        const cacheKey = `admin_knowledge_${status}_${category || 'all'}_${search || 'none'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Строим запрос
            let query = supabase
                .from('knowledge_articles')
                .select(`
                    id,
                    title,
                    content,
                    excerpt,
                    category_id,
                    tags,
                    is_published,
                    views,
                    created_at,
                    updated_at,
                    published_at,
                    author_id,
                    knowledge_categories!inner (
                        id,
                        name,
                        slug,
                        description
                    ),
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                `, { count: 'exact' });

            // Фильтр по статусу
            if (status !== 'all') {
                query = query.eq('is_published', status === 'published');
            }

            // Фильтр по категории (по slug)
            if (category) {
                query = query.eq('knowledge_categories.slug', category);
            }

            // Поиск по заголовку или содержанию
            if (search) {
                const safeSearch = sanitize.text(search);
                query = query.or(`title.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%`);
            }

            // Сортировка и пагинация
            const { data: articles, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                logError('Supabase error in knowledge articles GET', error);
                throw new Error('DATABASE_ERROR');
            }

            // Форматируем данные с санитизацией
            const formattedArticles = articles?.map(article => ({
                id: article.id,
                title: sanitize.text(article.title),
                content: article.content,
                excerpt: sanitize.text(article.excerpt || article.content?.substring(0, 200)),
                category: {
                    id: article.knowledge_categories?.[0]?.id,
                    name: article.knowledge_categories?.[0]?.name,
                    slug: article.knowledge_categories?.[0]?.slug,
                    description: article.knowledge_categories?.[0]?.description
                },
                tags: article.tags || [],
                is_published: article.is_published,
                views: article.views || 0,
                created_at: article.created_at,
                updated_at: article.updated_at,
                published_at: article.published_at,
                author: {
                    id: article.author_id,
                    name: article.users?.[0]?.profiles?.[0]?.full_name || article.users?.[0]?.email,
                    avatar: article.users?.[0]?.profiles?.[0]?.avatar_url,
                    email: sanitize.email(article.users?.[0]?.email || '')
                }
            })) || [];

            // Статистика по статусам
            const { data: statusStats } = await supabase
                .from('knowledge_articles')
                .select('is_published')
                .not('is_published', 'is', null);

            const publishedCount = statusStats?.filter(a => a.is_published === true).length || 0;
            const draftCount = statusStats?.filter(a => a.is_published === false).length || 0;

            return {
                articles: formattedArticles,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: to + 1 < (count || 0)
                },
                stats: {
                    total: count || 0,
                    published: publishedCount,
                    draft: draftCount
                },
                lastUpdated: new Date().toISOString()
            };
        }, 60); // TTL 60 секунд

        logApiRequest('GET', '/api/admin/knowledge', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(result, {
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=60',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30',
                'X-Total-Count': result.pagination.total.toString()
            }
        });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error fetching knowledge articles', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки статей',
            articles: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for knowledge article creation', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized knowledge article creation attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = createArticleSchema.parse({
            title: body.title,
            content: body.content,
            category: body.category,
            tags: body.tags,
            is_published: body.is_published
        });

        const { title, content, category, tags, is_published } = validatedData;

        // Находим ID категории по slug
        let categoryId: number;
        let categoryData: CategoryData;
        
        // Пробуем найти по slug
        const { data: catBySlug, error: slugError } = await supabase
            .from('knowledge_categories')
            .select('id, name, slug')
            .eq('slug', category)
            .maybeSingle();
        
        if (catBySlug) {
            categoryId = catBySlug.id;
            categoryData = catBySlug;
        } else {
            // Ищем по имени
            const { data: catByName, error: nameError } = await supabase
                .from('knowledge_categories')
                .select('id, name, slug')
                .ilike('name', category)
                .maybeSingle();
            
            if (nameError || !catByName) {
                return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 });
            }
            categoryId = catByName.id;
            categoryData = catByName;
        }

        // Проверяем, не существует ли статья с таким заголовком
        const { data: existingArticle, error: checkError } = await supabase
            .from('knowledge_articles')
            .select('id')
            .eq('title', title)
            .maybeSingle();

        if (existingArticle) {
            return NextResponse.json({ error: 'Статья с таким заголовком уже существует' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const finalIsPublished = is_published !== false;
        
        // Создаем новую статью
        const { data: newArticle, error: insertError } = await supabase
            .from('knowledge_articles')
            .insert({
                title: sanitize.text(title.trim()),
                content: sanitize.html(content.trim()),
                excerpt: sanitize.text(content.trim().substring(0, 300)),
                category_id: categoryId,
                tags: processTags(tags),
                author_id: session.user.id,
                is_published: finalIsPublished,
                created_at: now,
                updated_at: now,
                ...(finalIsPublished && { published_at: now })
            })
            .select(`
                *,
                knowledge_categories (
                    id,
                    name,
                    slug
                )
            `)
            .single();

        if (insertError) {
            logError('Supabase error creating knowledge article', insertError);
            return NextResponse.json({ error: 'Ошибка создания статьи' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(/^admin_knowledge/);
        invalidateCache(/^knowledge_articles/);
        invalidateCache(new RegExp(`knowledge_category_${categoryId}`));

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'ARTICLE_CREATED',
                entity_type: 'knowledge_article',
                entity_id: newArticle.id,
                new_values: { 
                    title: title.trim(), 
                    category: categoryData.slug,
                    is_published: finalIsPublished
                },
                created_at: now
            });

        logApiRequest('POST', '/api/admin/knowledge', 201, Date.now() - startTime, session.user.id);
        logInfo(`Admin created knowledge article`, { 
            articleId: newArticle.id, 
            adminId: session.user.id,
            title: title.substring(0, 50),
            category: categoryData.slug,
            isPublished: finalIsPublished
        });

        // Форматируем ответ
        const formattedArticle = {
            id: newArticle.id,
            title: newArticle.title,
            content: newArticle.content,
            excerpt: newArticle.excerpt,
            category_id: newArticle.category_id,
            category_name: newArticle.knowledge_categories?.name,
            category_slug: newArticle.knowledge_categories?.slug,
            tags: newArticle.tags || [],
            is_published: newArticle.is_published,
            views: 0,
            created_at: newArticle.created_at,
            updated_at: newArticle.updated_at,
            published_at: newArticle.published_at,
            author_id: newArticle.author_id,
            author_name: session.user.name || session.user.email,
            author_avatar: session.user.image || null
        };

        return NextResponse.json({ 
            success: true,
            message: finalIsPublished ? 'Статья успешно создана и опубликована' : 'Статья сохранена как черновик',
            article: formattedArticle
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error creating knowledge article', error);
        return NextResponse.json({ error: 'Ошибка создания статьи' }, { status: 500 });
    }
}