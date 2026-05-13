// app/api/admin/blog/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface BlogPostUpdateData {
    status: string;
    updated_at: string;
    moderation_comment?: string;
    published_at?: string;
    blocked_at?: string;
    blocked_by?: string;
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Получаем ВСЕ посты
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
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Ошибка загрузки постов' }, { status: 500 });
        }

        if (!posts || posts.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        // Форматируем данные
        const formattedPosts = posts.map(post => {
            const user = post.users?.[0];
            const profile = user?.profiles?.[0];
            
            return {
                id: post.id,
                title: post.title || '',
                content: post.content || '',
                excerpt: post.excerpt || '',
                category: post.category || '',
                tags: post.tags || [],
                main_image_url: post.main_image_url,
                views_count: post.views_count || 0,
                likes_count: post.likes_count || 0,
                status: post.status,
                created_at: post.created_at,
                updated_at: post.updated_at,
                author_id: post.master_id,
                author_name: profile?.full_name || user?.email?.split('@')[0] || 'Автор',
                author_email: user?.email || '',
                author_avatar: profile?.avatar_url || null,
                images: post.blog_images || [],
                comments_count: post.blog_comments?.length || 0
            };
        });

        return NextResponse.json(formattedPosts, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        return NextResponse.json({ error: 'Ошибка загрузки постов' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        const { postId, action, reason } = body;

        if (!postId || !action) {
            return NextResponse.json({ error: 'Не указан ID поста или действие' }, { status: 400 });
        }

        // Проверяем существование поста
        const { data: existingPost, error: checkError } = await supabase
            .from('blog_posts')
            .select('id, status, title, master_id')
            .eq('id', postId)
            .single();

        if (checkError || !existingPost) {
            return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
        }

        const now = new Date().toISOString();
        let newStatus = '';
        let message = '';
        let notificationTitle = '';
        let notificationMessage = '';

        switch (action) {
            case 'approve':
                if (existingPost.status !== 'moderation' && existingPost.status !== 'draft') {
                    return NextResponse.json({ error: 'Пост уже опубликован' }, { status: 400 });
                }
                newStatus = 'published';
                message = 'Пост успешно одобрен и опубликован';
                notificationTitle = '✅ Пост опубликован';
                notificationMessage = `Ваш пост "${existingPost.title}" успешно прошел модерацию и опубликован!`;
                break;
            case 'reject':
                if (existingPost.status !== 'moderation') {
                    return NextResponse.json({ error: 'Пост уже отклонён' }, { status: 400 });
                }
                newStatus = 'draft';
                message = 'Пост отправлен на доработку';
                notificationTitle = '📝 Пост на доработку';
                notificationMessage = `Ваш пост "${existingPost.title}" отправлен на доработку. Причина: ${reason || 'Не указана'}`;
                break;
            case 'block':
                newStatus = 'blocked';
                message = 'Пост заблокирован';
                notificationTitle = '🔒 Пост заблокирован';
                notificationMessage = `Ваш пост "${existingPost.title}" был заблокирован. Причина: ${reason || 'Нарушение правил'}`;
                break;
            default:
                return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
        }

        // Обновляем статус поста - используем конкретный тип вместо any
        const updateData: BlogPostUpdateData = {
            status: newStatus,
            updated_at: now
        };

        if (action === 'reject' && reason) {
            updateData.moderation_comment = reason;
        }
        if (action === 'block') {
            updateData.moderation_comment = reason || 'Заблокировано модератором';
            updateData.blocked_at = now;
            updateData.blocked_by = session.user.id;
        }
        if (action === 'approve') {
            updateData.published_at = now;
        }

        const { error: updateError } = await supabase
            .from('blog_posts')
            .update(updateData)
            .eq('id', postId);

        if (updateError) {
            console.error('Error updating post:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
        }

        // Отправляем уведомление автору
        if (existingPost.master_id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: existingPost.master_id,
                    title: notificationTitle,
                    message: notificationMessage,
                    type: 'blog_moderation',
                    metadata: { 
                        post_id: postId,
                        post_title: existingPost.title,
                        action: action,
                        reason: reason || null,
                        new_status: newStatus
                    },
                    created_at: now,
                    is_read: false
                });
        }

        return NextResponse.json({ 
            success: true, 
            message: message,
            newStatus: newStatus
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error in PUT:', error);
        return NextResponse.json({ error: 'Ошибка обработки запроса' }, { status: 500 });
    }
}