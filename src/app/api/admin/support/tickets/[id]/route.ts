import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;

    let client;
    try {
        client = await pool.connect();

        const checkResult = await client.query(
            `SELECT sender_id FROM messages WHERE id = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
        }

        if (checkResult.rows[0].sender_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        await client.query(`DELETE FROM messages WHERE id = $1`, [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();

        const checkResult = await client.query(
            `SELECT sender_id FROM messages WHERE id = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
        }

        if (checkResult.rows[0].sender_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const result = await client.query(`
            UPDATE messages 
            SET content = $1, is_edited = true, updated_at = NOW()
            WHERE id = $2
            RETURNING id, chat_id, sender_id, content, is_read, is_edited, created_at, attachments
        `, [content.trim(), id]);

        return NextResponse.json({
            ...result.rows[0],
            sender_name: session.user.name || session.user.email,
            sender_role: 'admin'
        });
    } catch (error) {
        console.error('Error updating message:', error);
        return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}