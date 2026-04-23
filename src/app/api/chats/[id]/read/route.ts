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

        // Проверяем, является ли пользователь участником чата
        const participantCheck = await client.query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [id, session.user.id]
        );

        if (participantCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Отмечаем все сообщения от других пользователей как прочитанные
        await client.query(
            `UPDATE messages SET is_read = true 
             WHERE chat_id = $1 AND sender_id != $2 AND is_read = false`,
            [id, session.user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}