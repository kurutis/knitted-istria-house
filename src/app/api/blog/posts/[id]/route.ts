import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    try {
        // Увеличиваем счетчик просмотров (безопасно, без .catch)
        try {
            // Пробуем выполнить RPC функцию
            const { error: rpcError } = await supabase.rpc('increment_post_views', { post_id: id });
            
            if (rpcError) {
                // Если RPC не существует, обновляем напрямую
                const { data: post } = await supabase
                    .from('blog_posts')
                    .select('views_count')
                    .eq('id', id)
                    .single();
                
                if (post) {
                    await supabase
                        .from('blog_posts')
                        .update({ views_count: (post.views_count || 0) + 1 })
                        .eq('id', id);
                }
            }
        } catch (rpcError) {
            // При любой ошибке RPC обновляем напрямую
            const { data: post } = await supabase
                .from('blog_posts')
                .select('views_count')
                .eq('id', id)
                .single();
            
            if (post) {
                await supabase
                    .from('blog_posts')
                    .update({ views_count: (post.views_count || 0) + 1 })
                    .eq('id', id);
            }
        }

        // Получаем пост со всеми связанными данными
        const { data: post, error } = await supabase
            .from('blog_posts')
            .select(`
                id,
                title,
                content,
                category,
                tags,
                main_image_url,
                views_count,
                likes_count,
                created_at,
                master_id,
                users!inner (
                    id,
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
                blog_comments!left (
                    id,
                    content,
                    created_at,
                    author_id,
                    author:author_id (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                ),
                blog_likes!left (
                    user_id
                )
            `)
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            console.error('Error fetching blog post:', error);
            return NextResponse.json({ error: 'Ошибка загрузки поста' }, { status: 500 });
        }

        // Проверяем, лайкнул ли пользователь пост
        let isLiked = false
        if (session?.user?.id) {
            const { data: like } = await supabase
                .from('blog_likes')
                .select('id')
                .eq('post_id', id)
                .eq('user_id', session.user.id)
                .maybeSingle()
            
            isLiked = !!like
        }

        // Форматируем комментарии
        const comments = post.blog_comments?.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            author_id: comment.author_id,
            author_name: comment.author?.profiles?.full_name || comment.author?.email,
            author_avatar: comment.author?.profiles?.avatar_url
        })) || []

        // Форматируем изображения
        const images = post.blog_images?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

        // Форматируем ответ
        const formattedPost = {
            id: post.id,
            title: post.title,
            content: post.content,
            category: post.category,
            tags: post.tags,
            main_image_url: post.main_image_url,
            views_count: post.views_count || 0,
            likes_count: post.likes_count || 0,
            created_at: post.created_at,
            master_id: post.master_id,
            master_name: post.users?.profiles?.full_name || post.users?.email,
            master_avatar: post.users?.profiles?.avatar_url,
            images: images,
            comments: comments,
            comments_count: comments.length,
            is_liked: isLiked
        }

        return NextResponse.json(formattedPost)
        
    } catch (error) {
        console.error('Error fetching blog post:', error);
        return NextResponse.json({ error: 'Ошибка загрузки поста' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { id } = await params;
    const { title, content, category, tags } = await request.json();

    if (!title || !content) {
        return NextResponse.json({ error: 'Заголовок и содержание обязательны' }, { status: 400 });
    }

    try {
        // Проверяем, является ли пользователь автором
        const { data: post, error: checkError } = await supabase
            .from('blog_posts')
            .select('master_id')
            .eq('id', id)
            .single()

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        if (post.master_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обновляем пост
        const { error: updateError } = await supabase
            .from('blog_posts')
            .update({
                title,
                content,
                category: category || null,
                tags: tags || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) {
            console.error('Error updating post:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления поста' }, { status: 500 });
        }

        // Получаем обновленный пост
        const { data: updatedPost, error: getError } = await supabase
            .from('blog_posts')
            .select(`
                id,
                title,
                content,
                category,
                tags,
                main_image_url,
                views_count,
                likes_count,
                created_at,
                master_id,
                users!inner (
                    id,
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
                )
            `)
            .eq('id', id)
            .single()

        if (getError) {
            return NextResponse.json({ error: 'Ошибка получения обновленного поста' }, { status: 500 });
        }

        return NextResponse.json({
            id: updatedPost.id,
            title: updatedPost.title,
            content: updatedPost.content,
            category: updatedPost.category,
            tags: updatedPost.tags,
            main_image_url: updatedPost.main_image_url,
            views_count: updatedPost.views_count || 0,
            likes_count: updatedPost.likes_count || 0,
            created_at: updatedPost.created_at,
            master_id: updatedPost.master_id,
            master_name: updatedPost.users?.profiles?.full_name || updatedPost.users?.email,
            master_avatar: updatedPost.users?.profiles?.avatar_url,
            images: updatedPost.blog_images?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
            comments: [],
            comments_count: 0,
            is_liked: false
        })
        
    } catch (error) {
        console.error('Error updating post:', error);
        return NextResponse.json({ error: 'Ошибка обновления поста' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Проверяем, является ли пользователь автором
        const { data: post, error: checkError } = await supabase
            .from('blog_posts')
            .select('master_id')
            .eq('id', id)
            .single()

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        if (post.master_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Удаляем пост (комментарии и лайки удалятся каскадно)
        const { error: deleteError } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Error deleting post:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
        }

        return NextResponse.json({ success: true })
        
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
    }
}