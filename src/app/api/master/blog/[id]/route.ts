import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

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

    let client;
    try {
        client = await pool.connect();

        // Проверяем, принадлежит ли пост этому мастеру
        const checkResult = await client.query(
            `SELECT id FROM blog_posts WHERE id = $1 AND master_id = $2`,
            [id, session.user.id]
        );

        if (checkResult.rows.length === 0) {
            return NextResponse.json({ error: 'Пост не найден или у вас нет прав на удаление' }, { status: 404 });
        }

        // Удаляем пост (каскадно удалятся комментарии и лайки)
        await client.query(`DELETE FROM blog_posts WHERE id = $1`, [id]);

        return NextResponse.json({ 
            success: true, 
            message: 'Пост успешно удален' 
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        return NextResponse.json({ error: 'Ошибка удаления поста' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}