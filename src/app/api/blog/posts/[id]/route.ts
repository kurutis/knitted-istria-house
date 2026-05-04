// app/api/blog/posts/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

interface BlogImage {
    id: string
    image_url: string
    sort_order: number
}

interface BlogComment {
    id: string
    content: string
    created_at: string
    is_edited: boolean
    author_id: string
    users?: Array<{
        email: string
        profiles?: Array<{
            full_name: string | null
            avatar_url: string | null
        }>
    }>
}

interface PostUpdateData {
    title: string
    content: string
    excerpt: string
    updated_at: string
    category?: string | null
    tags?: string[] | null
}

// Схема валидации для PUT запроса
const updatePostSchema = z.object({
    title: z.string().min(3, 'Заголовок должен содержать минимум 3 символа').max(255),
    content: z.string().min(10, 'Содержание должно содержать минимум 10 символов'),
    category: z.string().optional(),
    tags: z.string().optional(),
});

// Rate limiting
const getLimiter = rateLimit({ limit: 120, windowMs: 60 * 1000 });
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });
const deleteLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Обработка тегов
function processTags(tags: string | undefined): string[] | null {
    if (!tags) return null;
    return tags.split(',').map(t => sanitize.text(t.trim())).filter(t => t.length > 0);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        
        // Валидация ID поста
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Кэшируем пост
        const cacheKey = `blog_post_${id}`;
        
        const formattedPost = await cachedQuery(cacheKey, async () => {
            // Асинхронно увеличиваем счетчик просмотров (не блокируем ответ)
            updatePostViews(id).catch(err => 
                logError('Failed to update post views', err, 'warning')
            );

            // Получаем пост со всеми связанными данными
            const { data: post, error } = await supabase
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
                    status,
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
                        id,
                        content,
                        created_at,
                        is_edited,
                        author_id,
                        users!left (
                            id,
                            email,
                            profiles!left (
                                full_name,
                                avatar_url
                            )
                        )
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('NOT_FOUND');
                }
                logError('Error fetching blog post', error);
                throw new Error('DATABASE_ERROR');
            }

            // Проверяем, лайкнул ли пользователь пост
            let isLiked = false;
            if (session?.user?.id) {
                const { data: like } = await supabase
                    .from('blog_likes')
                    .select('id')
                    .eq('post_id', id)
                    .eq('user_id', session.user.id)
                    .maybeSingle();
                isLiked = !!like;
            }

            // Форматируем комментарии
            const comments = post.blog_comments?.map((comment: BlogComment) => ({
                id: comment.id,
                content: sanitize.text(comment.content),
                created_at: comment.created_at,
                is_edited: comment.is_edited,
                author_id: comment.author_id,
                author_name: sanitize.text(comment.users?.[0]?.profiles?.[0]?.full_name || comment.users?.[0]?.email || ''),
                author_avatar: comment.users?.[0]?.profiles?.[0]?.avatar_url || null
            })) || [];

            // Форматируем изображения
            const images = post.blog_images?.sort((a: BlogImage, b: BlogImage) => a.sort_order - b.sort_order) || [];

            return {
                id: post.id,
                title: sanitize.text(post.title),
                content: post.content,
                excerpt: sanitize.text(post.excerpt || post.content?.substring(0, 200)),
                category: post.category,
                tags: post.tags,
                main_image_url: post.main_image_url,
                views_count: post.views_count || 0,
                likes_count: post.likes_count || 0,
                status: post.status,
                created_at: post.created_at,
                updated_at: post.updated_at,
                published_at: post.published_at,
                master_id: post.master_id,
                master_name: sanitize.text(post.users?.[0]?.profiles?.[0]?.full_name || post.users?.[0]?.email),
                master_avatar: post.users?.[0]?.profiles?.[0]?.avatar_url,
                master_city: sanitize.text(post.users?.[0]?.profiles?.[0]?.city || ''),
                images: images,
                comments: comments,
                comments_count: comments.length,
                is_liked: isLiked
            };
        }, 300); // TTL 5 минут

        logApiRequest('GET', `/api/blog/posts/${id}`, 200, Date.now() - startTime, session?.user?.id);

        return NextResponse.json(formattedPost, {
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=300',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '120',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '120'
            }
        });
        
    } catch (error) {
        if (error instanceof Error && error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
        }
        logError('Error fetching blog post', error);
        return NextResponse.json({ error: 'Ошибка загрузки поста' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for blog post update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized blog post update attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = updatePostSchema.parse({
            title: body.title,
            content: body.content,
            category: body.category,
            tags: body.tags
        });

        const { title, content, category, tags } = validatedData;
        const sanitizedTitle = sanitize.text(title.trim());
        const sanitizedContent = sanitize.html(content.trim());

        // Проверяем, является ли пользователь автором или администратором
        const { data: post, error: checkError } = await supabase
            .from('blog_posts')
            .select('master_id, title, status')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                logInfo('Blog post not found for update', { postId: id });
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            logError('Error checking blog post for update', checkError);
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        const isAuthor = post.master_id === session.user.id;
        const isAdmin = session.user.role === 'admin';

        if (!isAuthor && !isAdmin) {
            logInfo('Unauthorized blog post update attempt', { 
                postId: id, 
                userId: session.user.id,
                isAuthor,
                isAdmin
            });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const now = new Date().toISOString();
        const processedTags = processTags(tags);

        // Обновляем пост
        const updateData: PostUpdateData  = {
            title: sanitizedTitle,
            content: sanitizedContent,
            excerpt: sanitizedContent.substring(0, 300),
            updated_at: now
        };

        if (category !== undefined) updateData.category = category?.trim() || null;
        if (processedTags !== undefined) updateData.tags = processedTags;

        const { error: updateError } = await supabase
            .from('blog_posts')
            .update(updateData)
            .eq('id', id);

        if (updateError) {
            logError('Error updating blog post', updateError);
            return NextResponse.json({ error: 'Ошибка обновления поста' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(`blog_post_${id}`);
        invalidateCache(/^blog_posts_list/);

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'BLOG_POST_UPDATED',
                entity_type: 'blog_post',
                entity_id: id,
                old_values: { title: post.title },
                new_values: { title: sanitizedTitle },
                created_at: now
            });

        logApiRequest('PUT', `/api/blog/posts/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Blog post updated`, { 
            postId: id, 
            userId: session.user.id,
            oldTitle: post.title,
            newTitle: sanitizedTitle
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Пост успешно обновлен'
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating blog post', error);
        return NextResponse.json({ error: 'Ошибка обновления поста' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for blog post delete', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized blog post delete attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        // Проверяем, является ли пользователь автором или администратором
        const { data: post, error: checkError } = await supabase
            .from('blog_posts')
            .select('master_id, title')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                logInfo('Blog post not found for delete', { postId: id });
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            logError('Error checking blog post for delete', checkError);
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        const isAuthor = post.master_id === session.user.id;
        const isAdmin = session.user.role === 'admin';

        if (!isAuthor && !isAdmin) {
            logInfo('Unauthorized blog post delete attempt', { 
                postId: id, 
                userId: session.user.id,
                isAuthor,
                isAdmin
            });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const now = new Date().toISOString();

        // Удаляем пост (комментарии и лайки удалятся каскадно)
        const { error: deleteError } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id);

        if (deleteError) {
            logError('Error deleting blog post', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(`blog_post_${id}`);
        invalidateCache(/^blog_posts_list/);

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'BLOG_POST_DELETED',
                entity_type: 'blog_post',
                entity_id: id,
                old_values: { title: post.title },
                created_at: now
            });

        logApiRequest('DELETE', `/api/blog/posts/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Blog post deleted`, { 
            postId: id, 
            userId: session.user.id,
            title: post.title,
            byAdmin: isAdmin
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Пост успешно удален'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error deleting blog post', error);
        return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
    }
}

// Вспомогательная функция для обновления просмотров
async function updatePostViews(postId: string): Promise<void> {
    try {
        await supabase.rpc('increment_post_views', { post_id: postId });
    } catch (error) {
        // Fallback если RPC не существует
        const { data: post } = await supabase
            .from('blog_posts')
            .select('views_count')
            .eq('id', postId)
            .single();
        
        if (post) {
            await supabase
                .from('blog_posts')
                .update({ views_count: (post.views_count || 0) + 1 })
                .eq('id', postId);
        }
    }
}