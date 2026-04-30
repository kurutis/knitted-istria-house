import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// PUT - редактирование комментария
export async function PUT(
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
        // Проверяем, является ли пользователь автором комментария
        const { data: comment, error: findError } = await supabase
            .from('blog_comments')
            .select('author_id')
            .eq('id', id)
            .single()

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
            }
            console.error('Error finding comment:', findError);
            return NextResponse.json({ error: 'Ошибка проверки комментария' }, { status: 500 });
        }

        if (comment.author_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обновляем комментарий
        const { error: updateError } = await supabase
            .from('blog_comments')
            .update({
                content: content.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) {
            console.error('Error updating comment:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления комментария' }, { status: 500 });
        }

        // Получаем обновленный комментарий с данными автора
        const { data: updatedComment, error: getError } = await supabase
            .from('blog_comments')
            .select(`
                id,
                content,
                created_at,
                updated_at,
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
            .single()

        if (getError) {
            console.error('Error fetching updated comment:', getError);
            return NextResponse.json({ error: 'Ошибка получения комментария' }, { status: 500 });
        }

        return NextResponse.json({
            id: updatedComment.id,
            content: updatedComment.content,
            created_at: updatedComment.created_at,
            updated_at: updatedComment.updated_at,
            author_id: updatedComment.author_id,
            author_name: updatedComment.users?.profiles?.full_name || updatedComment.users?.email,
            author_avatar: updatedComment.users?.profiles?.avatar_url
        });
        
    } catch (error) {
        console.error('Error updating comment:', error);
        return NextResponse.json({ error: 'Ошибка обновления комментария' }, { status: 500 });
    }
}

// DELETE - удаление комментария
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
            .eq('id', id)
            .single()

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
            }
            console.error('Error finding comment:', findError);
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
            .eq('id', id)

        if (deleteError) {
            console.error('Error deleting comment:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
        }

        // Уменьшаем счетчик комментариев в посте
        const { error: updateError } = await supabase
            .from('blog_posts')
            .update({
                comments_count: supabase.rpc('decrement', { x: 1 })
            })
            .eq('id', comment.post_id)

        if (updateError) {
            console.error('Error updating comments count:', updateError);
            // Не возвращаем ошибку, так как комментарий уже удален
        }

        return NextResponse.json({ success: true, message: 'Комментарий удален' });
        
    } catch (error) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
    }
}