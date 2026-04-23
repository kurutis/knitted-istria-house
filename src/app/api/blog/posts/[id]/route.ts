import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    // ✅ Добавляем получение сессии
    const session = await getServerSession(authOptions);
    
    let client;
    try {
        client = await pool.connect();

        // Увеличиваем счетчик просмотров
        await client.query(
            `UPDATE blog_posts SET views_count = views_count + 1 WHERE id = $1`,
            [id]
        );

        const result = await client.query(`
            SELECT 
                bp.id,
                bp.title,
                bp.content,
                bp.category,
                bp.tags,
                bp.main_image_url,
                bp.views_count,
                COALESCE(bp.likes_count, 0) as likes_count,
                bp.created_at,
                bp.master_id,
                COALESCE(p.full_name, u.email) as master_name,
                p.avatar_url as master_avatar,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', bi.id,
                            'url', bi.image_url,
                            'sort_order', bi.sort_order
                        ) ORDER BY bi.sort_order
                    ), '[]'::json)
                    FROM blog_images bi
                    WHERE bi.post_id = bp.id
                ) as images,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', bc.id,
                            'content', bc.content,
                            'created_at', bc.created_at,
                            'author_id', u2.id,
                            'author_name', COALESCE(p2.full_name, u2.email),
                            'author_avatar', p2.avatar_url
                        ) ORDER BY bc.created_at ASC
                    ), '[]'::json)
                    FROM blog_comments bc
                    JOIN users u2 ON bc.author_id = u2.id
                    LEFT JOIN profiles p2 ON u2.id = p2.user_id
                    WHERE bc.post_id = bp.id
                ) as comments,
                (
                    SELECT COUNT(*) FROM blog_comments WHERE post_id = bp.id
                ) as comments_count,
                CASE WHEN $2::uuid IS NOT NULL AND EXISTS(
                    SELECT 1 FROM blog_likes WHERE post_id = bp.id AND user_id = $2
                ) THEN true ELSE false END as is_liked
            FROM blog_posts bp
            JOIN users u ON bp.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE bp.id = $1
        `, [id, session?.user?.id || null]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching blog post:', error);
        return NextResponse.json({ error: 'Ошибка загрузки поста' }, { status: 500 });
    } finally {
        if (client) client.release();
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

    let client;
    try {
        client = await pool.connect();

        // Проверяем, является ли пользователь автором
        const postCheck = await client.query(
            `SELECT master_id FROM blog_posts WHERE id = $1`,
            [id]
        );

        if (postCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
        }

        if (postCheck.rows[0].master_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обновляем пост
        await client.query(
            `UPDATE blog_posts 
             SET title = $1, content = $2, category = $3, tags = $4, updated_at = NOW()
             WHERE id = $5`,
            [title, content, category || null, tags || null, id]
        );

        // Получаем обновленный пост
        const result = await client.query(`
            SELECT 
                bp.id,
                bp.title,
                bp.content,
                bp.category,
                bp.tags,
                bp.main_image_url,
                bp.views_count,
                bp.likes_count,
                bp.created_at,
                bp.master_id,
                COALESCE(p.full_name, u.email) as master_name,
                p.avatar_url as master_avatar,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', bi.id,
                            'url', bi.image_url,
                            'sort_order', bi.sort_order
                        ) ORDER BY bi.sort_order
                    ), '[]'::json)
                    FROM blog_images bi
                    WHERE bi.post_id = bp.id
                ) as images,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', bc.id,
                            'content', bc.content,
                            'created_at', bc.created_at,
                            'author_id', u2.id,
                            'author_name', COALESCE(p2.full_name, u2.email),
                            'author_avatar', p2.avatar_url
                        ) ORDER BY bc.created_at ASC
                    ), '[]'::json)
                    FROM blog_comments bc
                    JOIN users u2 ON bc.author_id = u2.id
                    LEFT JOIN profiles p2 ON u2.id = p2.user_id
                    WHERE bc.post_id = bp.id
                ) as comments,
                (
                    SELECT COUNT(*) FROM blog_comments WHERE post_id = bp.id
                ) as comments_count,
                CASE WHEN $2::uuid IS NOT NULL AND EXISTS(
                    SELECT 1 FROM blog_likes WHERE post_id = bp.id AND user_id = $2
                ) THEN true ELSE false END as is_liked
            FROM blog_posts bp
            JOIN users u ON bp.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE bp.id = $1
        `, [id, session.user.id]);

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating post:', error);
        return NextResponse.json({ error: 'Ошибка обновления поста' }, { status: 500 });
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

        // Проверяем, является ли пользователь автором
        const postCheck = await client.query(
            `SELECT master_id FROM blog_posts WHERE id = $1`,
            [id]
        );

        if (postCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Пост не найден' }, { status: 404 });
        }

        if (postCheck.rows[0].master_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Удаляем пост (каскадно удалятся комментарии и лайки)
        await client.query(`DELETE FROM blog_posts WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}