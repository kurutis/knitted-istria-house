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

    try {
        // Проверяем, есть ли уже лайк
        const { data: existingLike, error: checkError } = await supabase
            .from('blog_likes')
            .select('id')
            .eq('post_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle()

        let newLikeCount: number
        let isLiked: boolean

        if (!existingLike) {
            // Добавляем лайк
            const { error: insertError } = await supabase
                .from('blog_likes')
                .insert({
                    post_id: id,
                    user_id: session.user.id,
                    created_at: new Date().toISOString()
                })

            if (insertError) {
                console.error('Error adding like:', insertError);
                return NextResponse.json({ error: 'Ошибка при добавлении лайка' }, { status: 500 });
            }

            // Получаем обновлённое количество лайков
            const { data: post, error: countError } = await supabase
                .from('blog_posts')
                .select('likes_count')
                .eq('id', id)
                .single()

            if (countError) {
                console.error('Error getting likes count:', countError);
                newLikeCount = 0
            } else {
                newLikeCount = (post?.likes_count || 0) + 1
            }

            // Обновляем счётчик
            await supabase
                .from('blog_posts')
                .update({ likes_count: newLikeCount })
                .eq('id', id)

            isLiked = true
        } else {
            // Удаляем лайк
            const { error: deleteError } = await supabase
                .from('blog_likes')
                .delete()
                .eq('post_id', id)
                .eq('user_id', session.user.id)

            if (deleteError) {
                console.error('Error removing like:', deleteError);
                return NextResponse.json({ error: 'Ошибка при удалении лайка' }, { status: 500 });
            }

            // Получаем обновлённое количество лайков
            const { data: post, error: countError } = await supabase
                .from('blog_posts')
                .select('likes_count')
                .eq('id', id)
                .single()

            if (countError) {
                console.error('Error getting likes count:', countError);
                newLikeCount = 0
            } else {
                newLikeCount = Math.max((post?.likes_count || 1) - 1, 0)
            }

            // Обновляем счётчик
            await supabase
                .from('blog_posts')
                .update({ likes_count: newLikeCount })
                .eq('id', id)

            isLiked = false
        }

        return NextResponse.json({ 
            success: true, 
            likes_count: newLikeCount,
            is_liked: isLiked
        })
        
    } catch (error) {
        console.error('Error toggling like:', error);
        return NextResponse.json({ error: 'Ошибка при изменении лайка' }, { status: 500 });
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
        // Проверяем, есть ли лайк
        const { data: existingLike, error: checkError } = await supabase
            .from('blog_likes')
            .select('id')
            .eq('post_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (!existingLike) {
            return NextResponse.json({ 
                success: true, 
                likes_count: 0,
                is_liked: false
            });
        }

        // Удаляем лайк
        const { error: deleteError } = await supabase
            .from('blog_likes')
            .delete()
            .eq('post_id', id)
            .eq('user_id', session.user.id)

        if (deleteError) {
            return NextResponse.json({ error: 'Ошибка при удалении лайка' }, { status: 500 });
        }

        // Получаем обновлённое количество лайков
        const { data: post, error: countError } = await supabase
            .from('blog_posts')
            .select('likes_count')
            .eq('id', id)
            .single()

        const newLikeCount = Math.max((post?.likes_count || 1) - 1, 0)
        
        await supabase
            .from('blog_posts')
            .update({ likes_count: newLikeCount })
            .eq('id', id)

        return NextResponse.json({ 
            success: true, 
            likes_count: newLikeCount,
            is_liked: false
        })
        
    } catch (error) {
        console.error('Error removing like:', error);
        return NextResponse.json({ error: 'Ошибка при удалении лайка' }, { status: 500 });
    }
}