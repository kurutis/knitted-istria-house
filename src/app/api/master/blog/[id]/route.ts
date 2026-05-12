import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";
import { z } from "zod";

const updatePostSchema = z.object({
    title: z.string().min(1, 'Заголовок обязателен').max(200),
    content: z.string().min(1, 'Содержание обязательно'),
    excerpt: z.string().optional(),
    category: z.string().optional(),
    tags: z.string().optional(),
});

const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 }); // 20 обновлений в минуту
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }
        
        if (session.user.role !== 'master' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен. Только мастера и администраторы могут редактировать посты.' }, { status: 403 });
        }

        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'ID поста обязателен' }, { status: 400 });
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация данных
        const validatedData = updatePostSchema.parse(body);
        
        // Проверяем, существует ли пост и принадлежит ли он мастеру
        const { data: existingPost, error: fetchError } = await supabase
            .from('blog_posts')
            .select('id, master_id, title')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            logError('Error fetching post for update', fetchError);
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        // Проверка прав
        const isAdmin = session.user.role === 'admin';
        const isOwner = existingPost.master_id === session.user.id;
        
        if (!isAdmin && !isOwner) {
            logInfo('Unauthorized update attempt', {
                userId: session.user.id,
                postId: id,
                postOwnerId: existingPost.master_id
            });
            return NextResponse.json({ error: 'У вас нет прав на редактирование этого поста' }, { status: 403 });
        }

        // Обновляем пост
        const { data: updatedPost, error: updateError } = await supabase
            .from('blog_posts')
            .update({
                title: validatedData.title,
                content: validatedData.content,
                excerpt: validatedData.excerpt || null,
                category: validatedData.category || null,
                tags: validatedData.tags ? validatedData.tags.split(',').map(t => t.trim()) : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logError('Error updating post', updateError);
            return NextResponse.json({ error: 'Ошибка обновления поста' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(new RegExp(`blog_posts_${id}`));
        invalidateCache(new RegExp(`blog_posts_master_${existingPost.master_id}`));
        invalidateCache('blog_posts_list');
        invalidateCache('blog_posts_feed');

        logInfo('Blog post updated', {
            postId: id,
            userId: session.user.id,
            userRole: session.user.role,
            oldTitle: existingPost.title,
            newTitle: validatedData.title,
            duration: Date.now() - startTime
        });

        // Создаем запись в audit_logs
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'BLOG_POST_UPDATED',
                entity_type: 'blog_post',
                entity_id: id,
                old_values: { title: existingPost.title },
                new_values: { title: validatedData.title },
                created_at: new Date().toISOString()
            })
            .then(() => {});

        return NextResponse.json({ 
            success: true, 
            message: 'Пост успешно обновлен',
            post: updatedPost
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating blog post', error);
        return NextResponse.json({ 
            error: 'Произошла ошибка при обновлении поста. Пожалуйста, попробуйте позже.' 
        }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        // Проверка авторизации и роли
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }
        
        if (session.user.role !== 'master' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен. Только мастера и администраторы могут удалять посты.' }, { status: 403 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Валидация ID
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'ID поста обязателен' }, { status: 400 });
        }

        // Проверка формата UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return NextResponse.json({ error: 'Неверный формат ID поста' }, { status: 400 });
        }

        // Получаем информацию о посте
        const { data: post, error: fetchError } = await supabase
            .from('blog_posts')
            .select(`
                id,
                master_id,
                title,
                main_image_url,
                images,
                status,
                created_at
            `)
            .eq('id', id)
            .maybeSingle();

        if (fetchError) {
            logError('Error fetching post for deletion', fetchError);
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        if (!post) {
            return NextResponse.json({ 
                error: 'Пост не найден' 
            }, { status: 404 });
        }

        // Проверка прав (админ может удалять любые посты)
        const isAdmin = session.user.role === 'admin';
        const isOwner = post.master_id === session.user.id;
        
        if (!isAdmin && !isOwner) {
            logInfo('Unauthorized delete attempt', {
                userId: session.user.id,
                postId: id,
                postOwnerId: post.master_id
            });
            return NextResponse.json({ 
                error: 'У вас нет прав на удаление этого поста' 
            }, { status: 403 });
        }

        // Получаем информацию о комментариях перед удалением (для статистики)
        const { count: commentsCount } = await supabase
            .from('blog_comments')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', id);

        // Получаем информацию о лайках перед удалением
        const { count: likesCount } = await supabase
            .from('blog_likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', id);

        // Удаляем изображения из S3/Storage (если есть)
        const imagesToDelete = [];
        if (post.main_image_url) {
            imagesToDelete.push(post.main_image_url);
        }
        if (post.images && Array.isArray(post.images)) {
            imagesToDelete.push(...post.images);
        }

        // Асинхронное удаление изображений (не блокируем основной запрос)
        if (imagesToDelete.length > 0) {
            deleteImagesFromStorage(imagesToDelete).catch(err => 
                logError('Error deleting images from storage', err, 'warning')
            );
        }

        // Удаляем пост (комментарии и лайки удалятся каскадно благодаря ON DELETE CASCADE)
        const { error: deleteError } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id);

        if (deleteError) {
            logError('Error deleting post', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(new RegExp(`blog_posts_${id}`));
        invalidateCache(new RegExp(`blog_posts_master_${post.master_id}`));
        invalidateCache('blog_posts_list');
        invalidateCache('blog_posts_feed');

        // Логируем удаление
        logInfo('Blog post deleted', {
            postId: id,
            userId: session.user.id,
            userRole: session.user.role,
            postOwnerId: post.master_id,
            title: post.title,
            commentsDeleted: commentsCount || 0,
            likesDeleted: likesCount || 0,
            imagesDeleted: imagesToDelete.length,
            duration: Date.now() - startTime
        });

        // Создаем запись в audit_logs (опционально)
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'BLOG_POST_DELETED',
                entity_type: 'blog_post',
                entity_id: id,
                old_values: {
                    master_id: post.master_id,
                    title: post.title,
                    status: post.status,
                    created_at: post.created_at
                },
                metadata: {
                    comments_count: commentsCount,
                    likes_count: likesCount,
                    images_count: imagesToDelete.length
                },
                created_at: new Date().toISOString()
            })
            .then(() => {}); // Игнорируем ошибки аудита

        return NextResponse.json({ 
            success: true, 
            message: 'Пост успешно удален',
            details: {
                post_id: id,
                comments_deleted: commentsCount || 0,
                likes_deleted: likesCount || 0
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error deleting blog post', error);
        return NextResponse.json({ 
            error: 'Произошла ошибка при удалении поста. Пожалуйста, попробуйте позже.' 
        }, { status: 500 });
    }
}

// Вспомогательная функция для удаления изображений из Storage
async function deleteImagesFromStorage(urls: string[]) {
    try {
        // Извлекаем пути файлов из URL
        const paths = urls.map(url => {
            // Предполагаем, что URL имеет формат: https://.../storage/v1/object/public/bucket-name/path/to/file
            const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
            return match ? match[1] : null;
        }).filter(Boolean);

        if (paths.length === 0) return;

        // Удаляем файлы из бакета
        const { error } = await supabase.storage
            .from('blog-images')
            .remove(paths as string[]);

        if (error) {
            logError('Error deleting images from storage', error, 'warning');
        }
    } catch (error) {
        logError('Failed to delete images from storage', error, 'warning');
    }
}

// Опционально: PATCH для скрытия/архивации поста (мягкое удаление)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action } = body; // 'hide', 'archive', 'restore'

        if (!id || !action) {
            return NextResponse.json({ error: 'ID поста и действие обязательны' }, { status: 400 });
        }

        // Проверяем права
        const { data: post, error: fetchError } = await supabase
            .from('blog_posts')
            .select('master_id')
            .eq('id', id)
            .maybeSingle();

        if (fetchError || !post) {
            return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
        }

        const isAdmin = session.user.role === 'admin';
        const isOwner = post.master_id === session.user.id;

        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        let newStatus = '';
        switch (action) {
            case 'hide':
                newStatus = 'hidden';
                break;
            case 'archive':
                newStatus = 'archived';
                break;
            case 'restore':
                newStatus = 'active';
                break;
            default:
                return NextResponse.json({ error: 'Неверное действие' }, { status: 400 });
        }

        const { error: updateError } = await supabase
            .from('blog_posts')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) {
            logError('Error updating post status', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
        }

        invalidateCache(new RegExp(`blog_posts_${id}`));

        return NextResponse.json({ 
            success: true, 
            message: `Пост ${action === 'restore' ? 'восстановлен' : 'скрыт'}`,
            status: newStatus
        }, { status: 200 });
        
    } catch (error) {
        logError('Error updating post status', error);
        return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
    }
}