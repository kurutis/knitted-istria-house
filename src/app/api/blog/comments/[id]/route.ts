import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

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

    let client;
    try {
        client = await pool.connect();

        // Проверяем, является ли пользователь автором комментария
        const commentCheck = await client.query(
            `SELECT author_id FROM blog_comments WHERE id = $1`,
            [id]
        );

        if (commentCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
        }

        if (commentCheck.rows[0].author_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обновляем комментарий
        await client.query(
            `UPDATE blog_comments SET content = $1, updated_at = NOW() WHERE id = $2`,
            [content.trim(), id]
        );

        // Получаем обновленный комментарий
        const result = await client.query(
            `SELECT 
                bc.id,
                bc.content,
                bc.created_at,
                bc.updated_at,
                bc.author_id,
                COALESCE(p.full_name, u.email) as author_name,
                p.avatar_url as author_avatar
             FROM blog_comments bc
             JOIN users u ON bc.author_id = u.id
             LEFT JOIN profiles p ON u.id = p.user_id
             WHERE bc.id = $1`,
            [id]
        );

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating comment:', error);
        return NextResponse.json({ error: 'Ошибка обновления комментария' }, { status: 500 });
    } finally {
        if (client) client.release();
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

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Проверяем, может ли пользователь удалить комментарий
        const commentCheck = await client.query(
            `SELECT bc.author_id, bp.master_id, bc.post_id
             FROM blog_comments bc
             JOIN blog_posts bp ON bc.post_id = bp.id
             WHERE bc.id = $1`,
            [id]
        );

        if (commentCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
        }

        const comment = commentCheck.rows[0];
        const isAuthor = comment.author_id === session.user.id;
        const isPostAuthor = comment.master_id === session.user.id;

        if (!isAuthor && !isPostAuthor) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Удаляем комментарий
        await client.query(`DELETE FROM blog_comments WHERE id = $1`, [id]);

        // Уменьшаем счетчик комментариев в посте
        await client.query(
            `UPDATE blog_posts SET comments_count = comments_count - 1 WHERE id = $1`,
            [comment.post_id]
        );

        await client.query('COMMIT');

        return NextResponse.json({ success: true, message: 'Комментарий удален' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: 'Ошибка удаления комментария' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}