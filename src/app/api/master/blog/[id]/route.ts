import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3 } from "@/lib/s3-storage";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
        return NextResponse.json({ error: 'ID поста обязателен' }, { status: 400 });
    }

    try {
        // Проверяем, принадлежит ли пост этому мастеру
        const { data: post, error: checkError } = await supabase
            .from('blog_posts')
            .select('id')
            .eq('id', id)
            .eq('master_id', session.user.id)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking post:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки поста' }, { status: 500 });
        }

        if (!post) {
            return NextResponse.json({ 
                error: 'Пост не найден или у вас нет прав на удаление' 
            }, { status: 404 });
        }

        // Удаляем пост (комментарии и лайки удалятся каскадно благодаря ON DELETE CASCADE)
        const { error: deleteError } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', id)

        if (deleteError) {
            console.error('Error deleting post:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Пост успешно удален' 
        });
        
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
    }
}