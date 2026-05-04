// app/api/blog/posts/[id]/like/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/db-optimized";

// Rate limiting для лайков (10 лайков в минуту)
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
            logInfo('Rate limit exceeded for like', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized like attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID поста
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        // Проверяем, существует ли пост и активен ли он
        const { data: post, error: postError } = await supabase
            .from('blog_posts')
            .select('id, likes_count, status, master_id, title')
            .eq('id', id)
            .single();

        if (postError) {
            if (postError.code === 'PGRST116') {
                logInfo('Post not found for like', { postId: id });
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            logError('Error checking post for like', postError);
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        // Проверяем, можно ли лайкать пост
        if (post.status !== 'published') {
            return NextResponse.json({ error: 'Лайки недоступны для этого поста' }, { status: 400 });
        }

        // Проверяем, есть ли уже лайк
        const { data: existingLike, error: checkError } = await supabase
            .from('blog_likes')
            .select('id, created_at')
            .eq('post_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing like', checkError);
            return NextResponse.json({ error: 'Ошибка проверки лайка' }, { status: 500 });
        }

        if (existingLike) {
            logInfo('Duplicate like attempt', { postId: id, userId: session.user.id });
            return NextResponse.json({ 
                success: false, 
                error: 'Вы уже поставили лайк этому посту',
                likes_count: post.likes_count || 0,
                is_liked: true
            }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Добавляем лайк
        const { error: insertError } = await supabase
            .from('blog_likes')
            .insert({
                post_id: id,
                user_id: session.user.id,
                created_at: now
            });

        if (insertError) {
            logError('Error adding like', insertError);
            return NextResponse.json({ error: 'Ошибка при добавлении лайка' }, { status: 500 });
        }

        // Обновляем счётчик лайков в посте
        const newLikeCount = (post.likes_count || 0) + 1;
        
        const { error: updateError } = await supabase
            .from('blog_posts')
            .update({ 
                likes_count: newLikeCount,
                updated_at: now
            })
            .eq('id', id);

        if (updateError) {
            logError('Error updating likes count', updateError, 'warning');
        }

        // Инвалидируем кэш поста
        invalidateCache(`blog_posts_${id}`);
        invalidateCache(/^blog_posts_list/);

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'BLOG_POST_LIKED',
                entity_type: 'blog_post',
                entity_id: id,
                new_values: { likes_count: newLikeCount },
                created_at: now
            });

        // Уведомляем автора поста о лайке (если лайкнул не сам автор)
        if (post.master_id !== session.user.id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: post.master_id,
                    title: '❤️ Новый лайк',
                    message: `${session.user.email} понравился ваш пост "${post.title?.substring(0, 50)}"`,
                    type: 'blog_like',
                    metadata: { post_id: id },
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('POST', `/api/blog/posts/${id}/like`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Like added to post`, { 
            postId: id, 
            userId: session.user.id,
            newLikeCount
        });

        return NextResponse.json({ 
            success: true, 
            likes_count: newLikeCount,
            is_liked: true,
            message: 'Лайк добавлен'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error adding like', error);
        return NextResponse.json({ error: 'Ошибка при добавлении лайка' }, { status: 500 });
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
            logInfo('Rate limit exceeded for unlike', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized unlike attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID поста
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        // Проверяем, существует ли пост
        const { data: post, error: postError } = await supabase
            .from('blog_posts')
            .select('id, likes_count')
            .eq('id', id)
            .single();

        if (postError) {
            if (postError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            logError('Error checking post for unlike', postError);
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        // Проверяем, есть ли лайк
        const { data: existingLike, error: checkError } = await supabase
            .from('blog_likes')
            .select('id')
            .eq('post_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing like', checkError);
            return NextResponse.json({ error: 'Ошибка проверки лайка' }, { status: 500 });
        }

        if (!existingLike) {
            return NextResponse.json({ 
                success: true, 
                likes_count: post.likes_count || 0,
                is_liked: false,
                message: 'Лайк не найден'
            }, { status: 200 });
        }

        const now = new Date().toISOString();

        // Удаляем лайк
        const { error: deleteError } = await supabase
            .from('blog_likes')
            .delete()
            .eq('post_id', id)
            .eq('user_id', session.user.id);

        if (deleteError) {
            logError('Error removing like', deleteError);
            return NextResponse.json({ error: 'Ошибка при удалении лайка' }, { status: 500 });
        }

        // Обновляем счётчик лайков в посте
        const newLikeCount = Math.max((post.likes_count || 1) - 1, 0);
        
        const { error: updateError } = await supabase
            .from('blog_posts')
            .update({ 
                likes_count: newLikeCount,
                updated_at: now
            })
            .eq('id', id);

        if (updateError) {
            logError('Error updating likes count on unlike', updateError, 'warning');
        }

        // Инвалидируем кэш поста
        invalidateCache(`blog_posts_${id}`);
        invalidateCache(/^blog_posts_list/);

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'BLOG_POST_UNLIKED',
                entity_type: 'blog_post',
                entity_id: id,
                new_values: { likes_count: newLikeCount },
                created_at: now
            });

        logApiRequest('DELETE', `/api/blog/posts/${id}/like`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Like removed from post`, { 
            postId: id, 
            userId: session.user.id,
            newLikeCount
        });

        return NextResponse.json({ 
            success: true, 
            likes_count: newLikeCount,
            is_liked: false,
            message: 'Лайк удален'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error removing like', error);
        return NextResponse.json({ error: 'Ошибка при удалении лайка' }, { status: 500 });
    }
}

// GET - проверить статус лайка для текущего пользователя
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

        // Получаем количество лайков
        const { data: post, error: postError } = await supabase
            .from('blog_posts')
            .select('likes_count')
            .eq('id', id)
            .single();

        if (postError) {
            if (postError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка загрузки поста' }, { status: 500 });
        }

        let isLiked = false;
        
        // Если пользователь авторизован, проверяем его лайк
        if (session?.user) {
            const { data: like } = await supabase
                .from('blog_likes')
                .select('id')
                .eq('post_id', id)
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            isLiked = !!like;
        }

        return NextResponse.json({
            likes_count: post.likes_count || 0,
            is_liked: isLiked
        }, { status: 200 });
        
    } catch (error) {
        logError('Error getting like status', error);
        return NextResponse.json({ error: 'Ошибка получения статуса лайка' }, { status: 500 });
    }
}