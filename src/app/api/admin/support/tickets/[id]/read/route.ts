import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(
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

        const ticketResult = await client.query(`
            SELECT chat_id FROM support_tickets WHERE id = $1
        `, [id]);

        if (ticketResult.rows.length === 0) {
            return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
        }

        const chatId = ticketResult.rows[0].chat_id;

        await client.query(
            `UPDATE messages SET is_read = true 
             WHERE chat_id = $1 AND sender_id != $2 AND is_read = false`,
            [chatId, session.user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}