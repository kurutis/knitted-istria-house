import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const updateCommentSchema = z.object({
    content: z.string().min(1, 'Комментарий не может быть пустым').max(1000, 'Комментарий не может превышать 1000 символов'),
});

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// PUT - обновление комментария
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID комментария' }, { status: 400 });
        }

        const body = await request.json();
        
        const validatedData = updateCommentSchema.parse({
            content: body.content
        });
        
        const sanitizedContent = validatedData.content.trim();

        // Проверяем существование комментария и права автора
        const { data: comment, error: findError } = await supabase
            .from('blog_comments')
            .select('author_id, post_id')
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
            }
            console.error('Error finding comment:', findError);
            return NextResponse.json({ error: 'Ошибка проверки комментария' }, { status: 500 });
        }

        // Проверяем, что пользователь - автор комментария
        if (comment.author_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const now = new Date().toISOString();

        // Обновляем комментарий
        const { error: updateError } = await supabase
            .from('blog_comments')
            .update({
                content: sanitizedContent,
                updated_at: now,
                is_edited: true
            })
            .eq('id', id);

        if (updateError) {
            console.error('Error updating comment:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления комментария: ' + updateError.message }, { status: 500 });
        }

        // Получаем обновленный комментарий с данными автора
        const { data: updatedComment, error: getError } = await supabase
            .from('blog_comments')
            .select(`
                id,
                content,
                created_at,
                updated_at,
                is_edited,
                author_id
            `)
            .eq('id', id)
            .single();

        if (getError) {
            console.error('Error fetching updated comment:', getError);
            return NextResponse.json({ error: 'Ошибка получения обновленного комментария' }, { status: 500 });
        }

        // Получаем данные профиля автора
        let userName = session.user.name || 'Пользователь';
        let userAvatar = null;
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', session.user.id)
            .maybeSingle();
        
        if (profile) {
            userName = profile.full_name || userName;
            userAvatar = profile.avatar_url;
        }

        return NextResponse.json({
            id: updatedComment.id,
            content: updatedComment.content,
            created_at: updatedComment.created_at,
            updated_at: updatedComment.updated_at,
            is_edited: updatedComment.is_edited,
            author_id: updatedComment.author_id,
            author_name: userName,
            author_avatar: userAvatar
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        console.error('Error updating comment:', error);
        return NextResponse.json({ error: 'Ошибка обновления комментария' }, { status: 500 });
    }
}