// app/api/blog/comments/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации для PUT запроса
const updateCommentSchema = z.object({
    content: z.string().min(1, 'Комментарий не может быть пустым').max(1000, 'Комментарий не может превышать 1000 символов'),
});

// Rate limiting
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// PUT - редактирование комментария
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for comment update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized comment update attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID комментария' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = updateCommentSchema.parse({
            content: body.content
        });
        const { content } = validatedData;
        const sanitizedContent = sanitize.text(content.trim());

        // Проверяем, является ли пользователь автором комментария
        const { data: comment, error: findError } = await supabase
            .from('blog_comments')
            .select('author_id, content, post_id, created_at')
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                logInfo('Comment not found for update', { commentId: id });
                return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
            }
            logError('Error finding comment for update', findError);
            return NextResponse.json({ error: 'Ошибка проверки комментария' }, { status: 500 });
        }

        if (comment.author_id !== session.user.id) {
            logInfo('Unauthorized comment update attempt', { 
                commentId: id, 
                userId: session.user.id,
                authorId: comment.author_id
            });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Сохраняем старый контент для аудита
        const oldContentPreview = sanitize.text(comment.content?.substring(0, 100) || '');

        const now = new Date().toISOString();

        // Обновляем комментарий
        const { error: updateError } = await supabase
            .from('blog_comments')
            .update({
                content: sanitizedContent,
                updated_at: now,
                is_edited: true
            })
            .eq('id', id);

        if (updateError) {
            logError('Error updating comment', updateError);
            return NextResponse.json({ error: 'Ошибка обновления комментария' }, { status: 500 });
        }

        // Инвалидируем кэш поста
        invalidateCache(new RegExp(`blog_posts_${comment.post_id}`));
        invalidateCache(/^blog_posts_list/);

        // Получаем обновленный комментарий с данными автора
        const { data: updatedComment, error: getError } = await supabase
            .from('blog_comments')
            .select(`
                id,
                content,
                created_at,
                updated_at,
                is_edited,
                author_id,
                users!inner (
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (getError) {
            logError('Error fetching updated comment', getError);
            return NextResponse.json({ error: 'Ошибка получения комментария' }, { status: 500 });
        }

        // Логируем редактирование
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'COMMENT_EDITED',
                entity_type: 'blog_comment',
                entity_id: id,
                old_values: { content_preview: oldContentPreview },
                new_values: { content_preview: sanitizedContent.substring(0, 100) },
                created_at: now
            });

        logApiRequest('PUT', `/api/blog/comments/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Comment updated`, { 
            commentId: id, 
            userId: session.user.id,
            postId: comment.post_id
        });

        return NextResponse.json({
            success: true,
            message: 'Комментарий успешно обновлен',
            comment: {
                id: updatedComment.id,
                content: updatedComment.content,
                created_at: updatedComment.created_at,
                updated_at: updatedComment.updated_at,
                is_edited: updatedComment.is_edited,
                author_id: updatedComment.author_id,
                author_name: sanitize.text(updatedComment.users?.[0]?.profiles?.[0]?.full_name || updatedComment.users?.[0]?.email),
                author_avatar: updatedComment.users?.[0]?.profiles?.[0]?.avatar_url
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating comment', error);
        return NextResponse.json({ error: 'Ошибка обновления комментария' }, { status: 500 });
    }
}

// DELETE - удаление комментария
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for comment delete', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized comment delete attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID комментария' }, { status: 400 });
        }

        // Проверяем, может ли пользователь удалить комментарий
        const { data: comment, error: findError } = await supabase
            .from('blog_comments')
            .select(`
                id,
                author_id,
                post_id,
                blog_posts!inner (
                    master_id,
                    comments_count
                )
            `)
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                logInfo('Comment not found for delete', { commentId: id });
                return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
            }
            logError('Error finding comment for delete', findError);
            return NextResponse.json({ error: 'Ошибка проверки комментария' }, { status: 500 });
        }

        const isAuthor = comment.author_id === session.user.id;
        const isPostAuthor = comment.blog_posts?.[0]?.master_id === session.user.id;
        const isAdmin = session.user.role === 'admin';

        if (!isAuthor && !isPostAuthor && !isAdmin) {
            logInfo('Unauthorized comment delete attempt', { 
                commentId: id, 
                userId: session.user.id,
                isAuthor,
                isPostAuthor
            });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const now = new Date().toISOString();

        // Удаляем комментарий
        const { error: deleteError } = await supabase
            .from('blog_comments')
            .delete()
            .eq('id', id);

        if (deleteError) {
            logError('Error deleting comment', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
        }

        // Уменьшаем счетчик комментариев в посте
        const currentCount = comment.blog_posts?.[0]?.comments_count || 0;
        const newCount = Math.max(currentCount - 1, 0);
        
        const { error: updateError } = await supabase
            .from('blog_posts')
            .update({ 
                comments_count: newCount,
                updated_at: now
            })
            .eq('id', comment.post_id);

        if (updateError) {
            logError('Error updating comments count', updateError, 'warning');
        }

        // Инвалидируем кэш поста
        invalidateCache(new RegExp(`blog_posts_${comment.post_id}`));
        invalidateCache(/^blog_posts_list/);

        // Логируем удаление
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'COMMENT_DELETED',
                entity_type: 'blog_comment',
                entity_id: id,
                old_values: { 
                    post_id: comment.post_id,
                    author_id: comment.author_id
                },
                new_values: { comments_count: newCount },
                created_at: now
            });

        logApiRequest('DELETE', `/api/blog/comments/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Comment deleted`, { 
            commentId: id, 
            userId: session.user.id,
            postId: comment.post_id,
            byAdmin: isAdmin
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Комментарий успешно удален'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error deleting comment', error);
        return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
    }
}