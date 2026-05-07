// app/api/blog/posts/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

const createCommentSchema = z.object({
    content: z.string().min(1, 'Комментарий не может быть пустым').max(1000, 'Комментарий не может превышать 1000 символов'),
});

const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

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

        // Получаем данные пользователя из таблицы profiles
        let userFullName = session.user.name || session.user.email?.split('@')[0] || 'Пользователь';
        let userAvatar = null;
        
        try {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('user_id', session.user.id)
                .single();

            if (!profileError && profile) {
                userFullName = profile.full_name || userFullName;
                userAvatar = profile.avatar_url;
            }
        } catch (profileError) {
            logError('Error fetching user profile', profileError, 'warning');
        }

        const { id } = await params;
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        const body = await request.json();
        
        const validatedData = createCommentSchema.parse({
            content: body.content
        });
        const { content } = validatedData;
        const sanitizedContent = sanitize.text(content.trim());

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

        if (post.status !== 'published') {
            return NextResponse.json({ error: 'Комментирование недоступно для этого поста' }, { status: 400 });
        }

        const now = new Date().toISOString();

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

        const newCommentsCount = (post.comments_count || 0) + 1;
        await supabase
            .from('blog_posts')
            .update({ comments_count: newCommentsCount, updated_at: now })
            .eq('id', id);

        invalidateCache(`blog_posts_${id}`);
        invalidateCache(/^blog_posts_list/);

        // Уведомляем автора поста
        if (post.master_id !== session.user.id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: post.master_id,
                    title: '💬 Новый комментарий',
                    message: `${userFullName} оставил комментарий к вашему посту "${post.title?.substring(0, 50)}"`,
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

        return NextResponse.json({
            success: true,
            message: 'Комментарий добавлен',
            comment: {
                id: newComment.id,
                content: newComment.content,
                created_at: newComment.created_at,
                author_id: session.user.id,
                author_name: sanitize.text(userFullName),
                author_avatar: userAvatar
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
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        // Получаем комментарии
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

        if (!comments || comments.length === 0) {
            return NextResponse.json({
                success: true,
                comments: [],
                total: 0
            });
        }

        // Получаем данные авторов комментариев из profiles
        const authorIds = [...new Set(comments.map(c => c.author_id))];
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', authorIds);

        if (profilesError) {
            logError('Error fetching profiles', profilesError);
        }

        const profileMap = new Map();
        profiles?.forEach(profile => {
            profileMap.set(profile.user_id, {
                full_name: profile.full_name,
                avatar_url: profile.avatar_url
            });
        });

        const formattedComments = comments.map(comment => {
            const profile = profileMap.get(comment.author_id);
            return {
                id: comment.id,
                content: sanitize.text(comment.content),
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                is_edited: comment.is_edited,
                author_id: comment.author_id,
                author_name: sanitize.text(profile?.full_name || 'Пользователь'),
                author_avatar: profile?.avatar_url || null
            };
        });

        return NextResponse.json({
            success: true,
            comments: formattedComments,
            total: formattedComments.length
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
                userId: session.user.id
            });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const now = new Date().toISOString();

        const { error: deleteError } = await supabase
            .from('blog_comments')
            .delete()
            .eq('id', commentId);

        if (deleteError) {
            logError('Error deleting comment', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
        }

        const currentCount = comment.blog_posts?.[0]?.comments_count || 0;
        const newCount = Math.max(currentCount - 1, 0);
        
        await supabase
            .from('blog_posts')
            .update({ comments_count: newCount, updated_at: now })
            .eq('id', comment.post_id);

        invalidateCache(`blog_posts_${comment.post_id}`);
        invalidateCache(/^blog_posts_list/);

        logApiRequest('DELETE', `/api/blog/posts/${id}/comments`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            success: true, 
            message: 'Комментарий успешно удален'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error deleting comment', error);
        return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
    }
}