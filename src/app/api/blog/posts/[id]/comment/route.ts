import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации для POST запроса
const createCommentSchema = z.object({
    content: z.string().min(1, 'Комментарий не может быть пустым').max(1000, 'Комментарий не может превышать 1000 символов'),
});

// Rate limiting для комментариев
const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for comment creation', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized comment creation attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID поста
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация содержания комментария
        const validatedData = createCommentSchema.parse({
            content: body.content
        });
        const { content } = validatedData;
        const sanitizedContent = sanitize.text(content.trim());

        // Проверяем, существует ли пост и активен ли он
        const { data: post, error: postError } = await supabase
            .from('blog_posts')
            .select('id, comments_count, status, master_id, title')
            .eq('id', id)
            .single();

        if (postError) {
            if (postError.code === 'PGRST116') {
                logInfo('Post not found for comment', { postId: id });
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            logError('Error checking post for comment', postError);
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        // Проверяем, можно ли комментировать пост
        if (post.status !== 'published') {
            return NextResponse.json({ error: 'Комментирование недоступно для этого поста' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Добавляем комментарий
        const { data: newComment, error: insertError } = await supabase
            .from('blog_comments')
            .insert({
                post_id: id,
                author_id: session.user.id,
                content: sanitizedContent,
                created_at: now,
                updated_at: now,
                status: 'approved'
            })
            .select()
            .single();

        if (insertError) {
            logError('Error adding comment', insertError);
            return NextResponse.json({ error: 'Ошибка при добавлении комментария' }, { status: 500 });
        }

        // Увеличиваем счетчик комментариев в посте
        const newCommentsCount = (post.comments_count || 0) + 1;
        await supabase
            .from('blog_posts')
            .update({ comments_count: newCommentsCount, updated_at: now })
            .eq('id', id);

        // Инвалидируем кэш поста
        invalidateCache(`blog_posts_${id}`);
        invalidateCache(/^blog_posts_list/);

        // Получаем данные автора комментария
        const { data: authorProfile, error: authorError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', session.user.id)
            .single();

        if (authorError) {
            logError('Error fetching author profile', authorError, 'warning');
        }

        // Уведомляем автора поста о новом комментарии (если комментатор не автор)
        if (post.master_id !== session.user.id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: post.master_id,
                    title: '💬 Новый комментарий',
                    message: `${authorProfile?.full_name || session.user.email} оставил комментарий к вашему посту "${post.title?.substring(0, 50)}"`,
                    type: 'blog_comment',
                    metadata: { 
                        post_id: id, 
                        comment_id: newComment.id,
                        comment_preview: sanitizedContent.substring(0, 100)
                    },
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('POST', `/api/blog/posts/${id}/comments`, 201, Date.now() - startTime, session.user.id);
        logInfo(`Comment added to post`, { 
            postId: id, 
            commentId: newComment.id,
            userId: session.user.id,
            authorId: post.master_id
        });

        return NextResponse.json({
            success: true,
            message: 'Комментарий добавлен',
            comment: {
                id: newComment.id,
                content: newComment.content,
                created_at: newComment.created_at,
                author_id: session.user.id,
                author_name: sanitize.text(authorProfile?.full_name || session.user.email?.split('@')[0] || 'Пользователь'),
                author_avatar: authorProfile?.avatar_url
            }
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error adding comment', error);
        return NextResponse.json({ error: 'Ошибка при добавлении комментария' }, { status: 500 });
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        // Получаем комментарии к посту
        const { data: comments, error } = await supabase
            .from('blog_comments')
            .select(`
                id,
                content,
                created_at,
                updated_at,
                is_edited,
                author_id
            `)
            .eq('post_id', id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            logError('Error fetching comments', error);
            return NextResponse.json({ error: 'Ошибка загрузки комментариев' }, { status: 500 });
        }

        // Получаем данные авторов комментариев
        if (comments && comments.length > 0) {
            const authorIds = [...new Set(comments.map(c => c.author_id))];
            
            const { data: authors } = await supabase
                .from('profiles')
                .select('user_id, full_name, avatar_url')
                .in('user_id', authorIds);

            const authorMap = new Map();
            authors?.forEach(author => {
                authorMap.set(author.user_id, author);
            });

            const formattedComments = comments.map(comment => ({
                id: comment.id,
                content: sanitize.text(comment.content),
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                is_edited: comment.is_edited,
                author_id: comment.author_id,
                author_name: sanitize.text(authorMap.get(comment.author_id)?.full_name || 'Пользователь'),
                author_avatar: authorMap.get(comment.author_id)?.avatar_url
            }));

            logApiRequest('GET', `/api/blog/posts/${id}/comments`, 200, Date.now() - startTime, session?.user?.id);

            return NextResponse.json({
                success: true,
                comments: formattedComments,
                total: formattedComments.length
            }, { status: 200 });
        }

        return NextResponse.json({
            success: true,
            comments: [],
            total: 0
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching comments', error);
        return NextResponse.json({ error: 'Ошибка загрузки комментариев' }, { status: 500 });
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
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for comment deletion', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized comment deletion attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const commentId = searchParams.get('commentId');

        // Валидация ID комментария
        if (!commentId || !isValidUUID(commentId)) {
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
            .eq('id', commentId)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                logInfo('Comment not found for deletion', { commentId });
                return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
            }
            logError('Error finding comment for deletion', findError);
            return NextResponse.json({ error: 'Ошибка проверки комментария' }, { status: 500 });
        }

        const isAuthor = comment.author_id === session.user.id;
        const isPostAuthor = comment.blog_posts?.[0]?.master_id === session.user.id;
        const isAdmin = session.user.role === 'admin';

        if (!isAuthor && !isPostAuthor && !isAdmin) {
            logInfo('Unauthorized comment deletion attempt', { 
                commentId, 
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
            .eq('id', commentId);

        if (deleteError) {
            logError('Error deleting comment', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
        }

        // Уменьшаем счетчик комментариев
        const currentCount = comment.blog_posts?.[0]?.comments_count || 0;
        const newCount = Math.max(currentCount - 1, 0);
        
        await supabase
            .from('blog_posts')
            .update({ comments_count: newCount, updated_at: now })
            .eq('id', comment.post_id);

        // Инвалидируем кэш поста
        invalidateCache(`blog_posts_${comment.post_id}`);
        invalidateCache(/^blog_posts_list/);

        // Логируем удаление комментария
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'BLOG_COMMENT_DELETED',
                entity_type: 'blog_comment',
                entity_id: commentId,
                old_values: { 
                    post_id: comment.post_id,
                    author_id: comment.author_id
                },
                new_values: { comments_count: newCount },
                created_at: now
            });

        logApiRequest('DELETE', `/api/blog/posts/${id}/comments`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Comment deleted`, { 
            commentId, 
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