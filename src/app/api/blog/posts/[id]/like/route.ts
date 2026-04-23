import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(
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

        // Проверяем, есть ли уже лайк
        const existing = await client.query(
            `SELECT id FROM blog_likes WHERE post_id = $1 AND user_id = $2`,
            [id, session.user.id]
        );

        if (existing.rows.length === 0) {
            // Добавляем лайк
            await client.query(
                `INSERT INTO blog_likes (post_id, user_id, created_at) VALUES ($1, $2, NOW())`,
                [id, session.user.id]
            );
            // Увеличиваем счетчик
            await client.query(
                `UPDATE blog_posts SET likes_count = likes_count + 1 WHERE id = $1`,
                [id]
            );
        }

        await client.query('COMMIT');

        // Получаем обновленный счетчик
        const result = await client.query(
            `SELECT likes_count FROM blog_posts WHERE id = $1`,
            [id]
        );

        return NextResponse.json({ 
            success: true, 
            likes_count: parseInt(result.rows[0].likes_count),
            is_liked: true
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error adding like:', error);
        return NextResponse.json({ error: 'Ошибка при добавлении лайка' }, { status: 500 });
    } finally {
        if (client) client.release();
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

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Проверяем, есть ли лайк
        const existing = await client.query(
            `SELECT id FROM blog_likes WHERE post_id = $1 AND user_id = $2`,
            [id, session.user.id]
        );

        if (existing.rows.length > 0) {
            // Удаляем лайк
            await client.query(
                `DELETE FROM blog_likes WHERE post_id = $1 AND user_id = $2`,
                [id, session.user.id]
            );
            // Уменьшаем счетчик
            await client.query(
                `UPDATE blog_posts SET likes_count = likes_count - 1 WHERE id = $1`,
                [id]
            );
        }

        await client.query('COMMIT');

        // Получаем обновленный счетчик
        const result = await client.query(
            `SELECT likes_count FROM blog_posts WHERE id = $1`,
            [id]
        );

        return NextResponse.json({ 
            success: true, 
            likes_count: parseInt(result.rows[0].likes_count),
            is_liked: false
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error removing like:', error);
        return NextResponse.json({ error: 'Ошибка при удалении лайка' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}