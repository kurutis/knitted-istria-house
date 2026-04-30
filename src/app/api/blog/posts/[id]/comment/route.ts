import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Комментарий не может быть пустым' }, { status: 400 });
    }

    try {
        // Проверяем, существует ли пост
        const { data: post, error: postError } = await supabase
            .from('blog_posts')
            .select('id')
            .eq('id', id)
            .single()

        if (postError) {
            if (postError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        // Добавляем комментарий
        const { data: newComment, error: insertError } = await supabase
            .from('blog_comments')
            .insert({
                post_id: id,
                author_id: session.user.id,
                content: content.trim(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error adding comment:', insertError);
            return NextResponse.json({ error: 'Ошибка при добавлении комментария' }, { status: 500 });
        }

        // Увеличиваем счетчик комментариев в посте
        await supabase.rpc('increment_comments', { post_id: id })
            .catch(async () => {
                // Если RPC не существует, обновляем напрямую
                const { data: post } = await supabase
                    .from('blog_posts')
                    .select('comments_count')
                    .eq('id', id)
                    .single()
                
                await supabase
                    .from('blog_posts')
                    .update({ comments_count: (post?.comments_count || 0) + 1 })
                    .eq('id', id)
            })

        // Получаем данные автора
        const { data: author } = await supabase
            .from('users')
            .select(`
                id,
                email,
                profiles!left (
                    full_name,
                    avatar_url
                )
            `)
            .eq('id', session.user.id)
            .single()

        return NextResponse.json({
            id: newComment.id,
            content: newComment.content,
            created_at: newComment.created_at,
            author_id: session.user.id,
            author_name: author?.profiles?.full_name || author?.email,
            author_avatar: author?.profiles?.avatar_url
        })
        
    } catch (error) {
        console.error('Error adding comment:', error);
        return NextResponse.json({ error: 'Ошибка при добавлении комментария' }, { status: 500 });
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
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
        return NextResponse.json({ error: 'ID комментария обязателен' }, { status: 400 });
    }

    try {
        // Проверяем, может ли пользователь удалить комментарий
        const { data: comment, error: findError } = await supabase
            .from('blog_comments')
            .select(`
                author_id,
                post_id,
                blog_posts!inner (
                    master_id
                )
            `)
            .eq('id', commentId)
            .single()

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Ошибка проверки комментария' }, { status: 500 });
        }

        const isAuthor = comment.author_id === session.user.id;
        const isPostAuthor = comment.blog_posts?.master_id === session.user.id;

        if (!isAuthor && !isPostAuthor) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Удаляем комментарий
        const { error: deleteError } = await supabase
            .from('blog_comments')
            .delete()
            .eq('id', commentId)

        if (deleteError) {
            console.error('Error deleting comment:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
        }

        // Уменьшаем счетчик комментариев
        await supabase.rpc('decrement_comments', { post_id: comment.post_id })
            .catch(async () => {
                const { data: post } = await supabase
                    .from('blog_posts')
                    .select('comments_count')
                    .eq('id', comment.post_id)
                    .single()
                
                await supabase
                    .from('blog_posts')
                    .update({ comments_count: Math.max((post?.comments_count || 1) - 1, 0) })
                    .eq('id', comment.post_id)
            })

        return NextResponse.json({ success: true, message: 'Комментарий удален' })
        
    } catch (error) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
    }
}