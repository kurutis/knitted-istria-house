// app/api/admin/blog/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Получаем посты
        const { data: posts, error } = await supabase
            .from('blog_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Ошибка загрузки постов' }, { status: 500 });
        }

        if (!posts || posts.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        // Получаем авторов постов
        const masterIds = posts.map(p => p.master_id).filter(Boolean);
        
        const userMap = new Map();
        const profileMap = new Map();
        
        if (masterIds.length > 0) {
            // Получаем пользователей
            const { data: users } = await supabase
                .from('users')
                .select('id, email')
                .in('id', masterIds);
            
            users?.forEach(u => {
                userMap.set(u.id, u);
            });
            
            // Получаем профили
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name, avatar_url')
                .in('user_id', masterIds);
            
            profiles?.forEach(p => {
                profileMap.set(p.user_id, p);
            });
        }

        // Получаем количество комментариев для каждого поста
        const commentsCountMap = new Map();
        if (posts.length > 0) {
            const postIds = posts.map(p => p.id);
            const { data: comments } = await supabase
                .from('blog_comments')
                .select('post_id')
                .in('post_id', postIds);
            
            comments?.forEach(c => {
                commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1);
            });
        }

        // Форматируем результат
        const formattedPosts = posts.map(post => {
            const user = userMap.get(post.master_id);
            const profile = profileMap.get(post.master_id);
            
            return {
                id: post.id,
                title: post.title || '',
                content: post.content || '',
                excerpt: post.excerpt || '',
                category: post.category || '',
                tags: post.tags || [],
                main_image_url: post.main_image_url,
                views_count: post.views_count || post.views || 0,
                likes_count: post.likes_count || 0,
                status: post.status,
                created_at: post.created_at,
                updated_at: post.updated_at,
                author_id: post.master_id,
                author_name: profile?.full_name || user?.email?.split('@')[0] || 'Автор',
                author_email: user?.email || '',
                author_avatar: profile?.avatar_url || null,
                images: [],
                comments_count: commentsCountMap.get(post.id) || 0
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

        // Обновляем статус поста
        const { error: updateError } = await supabase
            .from('blog_posts')
            .update({
                status: newStatus,
                updated_at: now,
                moderation_comment: (action === 'reject' || action === 'block') && reason ? reason : undefined,
                published_at: action === 'approve' ? now : undefined
            })
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