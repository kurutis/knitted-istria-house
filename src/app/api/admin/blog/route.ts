// app/api/admin/blog/route.ts
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { rateLimit, getClientIP } from "@/lib/rate-limit"
import { logError, logInfo, logApiRequest } from "@/lib/error-logger"
import { sanitize } from "@/lib/sanitize"
import { cachedQuery, invalidateCache } from "@/lib/db-optimized"
import { z } from "zod"
interface BlogPostUpdateData {
    updated_at: string
    status?: string
    published_at?: string
    moderation_comment?: string
    blocked_at?: string
    blocked_by?: string
}

// Схема валидации для PUT запроса
const updateBlogPostSchema = z.object({
    postId: z.string().uuid('Неверный формат ID поста'),
    action: z.enum(['approve', 'reject', 'block']),
    reason: z.string().max(500, 'Причина не может превышать 500 символов').optional(),
});

// Rate limiting для административных действий
const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 GET запросов в минуту

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)
        
        // Проверка прав администратора
        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin blog access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Rate limiting для GET
        const ip = getClientIP(request);
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Кэширование результатов (30 секунд)
        const cacheKey = `admin_blog_posts_moderation`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Получаем посты на модерации или черновики
            const { data: posts, error } = await supabase
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
                    master_id,
                    users!inner (
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    ),
                    blog_images (
                        id,
                        image_url,
                        sort_order
                    ),
                    blog_comments (count)
                `)
                .in('status', ['moderation', 'draft'])
                .order('created_at', { ascending: false })

            if (error) {
                logError('Supabase error in admin blog GET', error);
                throw new Error('DATABASE_ERROR');
            }

            // Форматируем данные с санитизацией
            const formattedPosts = posts?.map(post => ({
                id: post.id,
                title: sanitize.text(post.title || ''),
                content: sanitize.html(post.content || ''),
                excerpt: sanitize.text(post.excerpt || ''),
                category: sanitize.text(post.category || ''),
                tags: post.tags || [],
                main_image_url: post.main_image_url,
                views_count: post.views_count || 0,
                likes_count: post.likes_count || 0,
                status: post.status,
                created_at: post.created_at,
                updated_at: post.updated_at,
                author_id: post.master_id,
                author_email: sanitize.email(post.users?.[0]?.email || ''),
                author_name: sanitize.text(
                    post.users?.[0]?.profiles?.[0]?.full_name || 
                    post.users?.[0]?.email || 
                    'Неизвестный автор'
                ),
                author_avatar: post.users?.[0]?.profiles?.[0]?.avatar_url,
                images: post.blog_images?.sort((a, b) => a.sort_order - b.sort_order) || [],
                comments_count: post.blog_comments?.length || 0
            })) || [];

            // Статистика по статусам
            const stats = {
                moderation: posts?.filter(p => p.status === 'moderation').length || 0,
                draft: posts?.filter(p => p.status === 'draft').length || 0,
                total: posts?.length || 0
            };

            return {
                posts: formattedPosts,
                stats,
                lastUpdated: new Date().toISOString()
            };
        });

        // Логирование успешного запроса
        logApiRequest('GET', '/api/admin/blog', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(result, { 
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=30',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30',
            }
        })
        
    } catch (error) {
        logError('Admin blog GET error', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки постов',
            posts: [],
            stats: { moderation: 0, draft: 0, total: 0 }
        }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const ip = getClientIP(request);
        
        // Rate limiting
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin blog PUT', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions)
        
        // Проверка прав администратора
        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin blog PUT attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        
        // Валидация входных данных с санитизацией
        const validatedData = updateBlogPostSchema.parse({
            postId: body.postId,
            action: body.action,
            reason: body.reason ? sanitize.text(body.reason) : undefined
        })

        const { postId, action, reason } = validatedData

        // Проверяем, существует ли пост
        const { data: existingPost, error: checkError } = await supabase
            .from('blog_posts')
            .select('id, status, master_id, title')
            .eq('id', postId)
            .single()

        if (checkError || !existingPost) {
            logInfo('Post not found for admin action', { postId, action });
            return NextResponse.json({ error: 'Пост не найден' }, { status: 404 })
        }

        // Предотвращение повторных действий
        const actionMap: Record<string, { allowedStatuses: string[]; errorMessage: string }> = {
            approve: { allowedStatuses: ['moderation', 'draft'], errorMessage: 'Пост уже опубликован' },
            reject: { allowedStatuses: ['moderation'], errorMessage: 'Пост уже в черновиках' },
            block: { allowedStatuses: ['published', 'moderation', 'draft'], errorMessage: 'Пост уже заблокирован' }
        };

        const actionConfig = actionMap[action];
        if (!actionConfig.allowedStatuses.includes(existingPost.status)) {
            return NextResponse.json({ error: actionConfig.errorMessage }, { status: 400 });
        }

        let newStatus = ''
        const updateData: BlogPostUpdateData = {
            updated_at: new Date().toISOString()
        }

        switch (action) {
            case 'approve':
                newStatus = 'published'
                updateData.status = newStatus
                updateData.published_at = new Date().toISOString()
                break
            case 'reject':
                newStatus = 'draft'
                updateData.status = newStatus
                break
            case 'block':
                newStatus = 'blocked'
                updateData.status = newStatus
                updateData.moderation_comment = reason || 'Заблокировано модератором'
                updateData.blocked_at = new Date().toISOString()
                updateData.blocked_by = session.user.id
                break
        }

        // Обновляем статус поста
        const { error: updateError } = await supabase
            .from('blog_posts')
            .update(updateData)
            .eq('id', postId)

        if (updateError) {
            logError('Supabase update error in admin blog PUT', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 })
        }

        // Инвалидируем кэши
        invalidateCache('admin_blog_posts_moderation');
        invalidateCache(`blog_post_${postId}`);
        invalidateCache(/^blog_posts_list/);

        // Логируем действие администратора (для аудита)
        try {
            await supabase
                .from('audit_logs')
                .insert({
                    user_id: session.user.id,
                    action: `BLOG_POST_${action.toUpperCase()}`,
                    entity_type: 'blog_post',
                    entity_id: postId,
                    old_values: { status: existingPost.status },
                    new_values: { status: newStatus, comment: reason },
                    created_at: new Date().toISOString()
                });
        } catch (err) {
            logError('Audit log error', err, 'warning');
        }

        // Отправляем уведомление мастеру
        const notificationMessages: Record<string, { title: string; message: string }> = {
            approve: {
                title: 'Ваш пост опубликован! 🎉',
                message: `Ваш пост "${existingPost.title}" успешно прошел модерацию и опубликован.`
            },
            reject: {
                title: 'Ваш пост отправлен на доработку',
                message: `Ваш пост "${existingPost.title}" не прошел модерацию. ${reason ? `Причина: ${reason}` : 'Пожалуйста, отредактируйте пост и отправьте снова.'}`
            },
            block: {
                title: 'Ваш пост заблокирован',
                message: `Ваш пост "${existingPost.title}" был заблокирован. ${reason ? `Причина: ${reason}` : 'Обратитесь в поддержку для получения дополнительной информации.'}`
            }
        };

        const notification = notificationMessages[action];
        if (notification) {
            try {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: existingPost.master_id,
                        title: notification.title,
                        message: notification.message,
                        type: `blog_${action}`,
                        metadata: { post_id: postId, reason: reason || null },
                        created_at: new Date().toISOString(),
                        is_read: false
                    });
            } catch (err) {
                logError('Notification error', err, 'warning');
            }
        }

        logApiRequest('PUT', '/api/admin/blog', 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin ${action} blog post`, { 
            postId, 
            adminId: session.user.id,
            oldStatus: existingPost.status,
            newStatus,
            hasReason: !!reason
        });

        return NextResponse.json({ 
            success: true,
            message: `Пост ${action === 'approve' ? 'опубликован' : action === 'reject' ? 'отправлен в черновики' : 'заблокирован'}`,
            newStatus
        }, { status: 200 })
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0]?.message || 'Ошибка валидации';
            return NextResponse.json({ error: firstError }, { status: 400 });
        }
        logError('Admin blog PUT error', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка обработки запроса';
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}