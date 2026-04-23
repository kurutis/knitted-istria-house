import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Создаем новый тикет
        const ticketResult = await client.query(`
            INSERT INTO support_tickets (user_id, status, created_at, updated_at)
            VALUES ($1, 'open', NOW(), NOW())
            RETURNING id
        `, [session.user.id]);

        // Создаем чат для этого тикета
        const chatResult = await client.query(`
            INSERT INTO chats (type, created_at)
            VALUES ('support', NOW())
            RETURNING id
        `, []);

        // Добавляем участников
        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)`,
            [chatResult.rows[0].id, session.user.id]
        );

        // Добавляем администратора (если есть)
        const adminResult = await client.query(
            `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
        );
        
        if (adminResult.rows.length > 0) {
            await client.query(
                `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)`,
                [chatResult.rows[0].id, adminResult.rows[0].id]
            );
        }

        // Связываем чат с тикетом
        await client.query(
            `UPDATE support_tickets SET chat_id = $1 WHERE id = $2`,
            [chatResult.rows[0].id, ticketResult.rows[0].id]
        );

        // Отправляем приветственное сообщение
        await client.query(`
            INSERT INTO messages (chat_id, sender_id, content, created_at)
            VALUES ($1, $2, $3, NOW())
        `, [chatResult.rows[0].id, adminResult.rows[0]?.id || null, 
            'Здравствуйте! Чем могу помочь? Опишите вашу проблему, и мы постараемся решить её в ближайшее время.']);

        await client.query('COMMIT');

        return NextResponse.json({
            id: chatResult.rows[0].id,
            type: 'support',
            participant_id: 'support',
            participant_name: 'Поддержка',
            participant_avatar: null,
            last_message: 'Здравствуйте! Чем могу помочь?',
            last_message_time: new Date().toISOString(),
            unread_count: 1,
            ticket_status: 'open'
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error creating support ticket:', error);
        return NextResponse.json({ error: 'Ошибка создания тикета' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}