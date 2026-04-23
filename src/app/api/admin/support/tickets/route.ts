import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let client;
    try {
        client = await pool.connect();

        let query = `
            WITH last_messages AS (
                SELECT DISTINCT ON (chat_id)
                    chat_id,
                    content as last_message,
                    created_at as last_message_time
                FROM messages
                ORDER BY chat_id, created_at DESC
            )
            SELECT 
                st.id,
                st.chat_id,
                st.user_id,
                st.subject,
                st.status,
                st.priority,
                st.category,
                st.created_at,
                st.updated_at,
                COALESCE(p.full_name, u.email) as user_name,
                u.email as user_email,
                p.avatar_url as user_avatar,
                COALESCE(lm.last_message, 'Нет сообщений') as last_message,
                lm.last_message_time,
                COUNT(CASE WHEN m.is_read = false AND m.sender_id != $1 THEN 1 END) as unread_count
            FROM support_tickets st
            JOIN users u ON st.user_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN messages m ON st.chat_id = m.chat_id
            LEFT JOIN last_messages lm ON st.chat_id = lm.chat_id
            WHERE 1=1
        `;

        const params: any[] = [session.user.id];
        let paramIndex = 2;

        if (status && status !== 'all') {
            query += ` AND st.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (search) {
            query += ` AND (p.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR st.subject ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += `
            GROUP BY st.id, st.chat_id, st.user_id, st.subject, st.status, st.priority, st.category, 
                     st.created_at, st.updated_at, p.full_name, u.email, p.avatar_url, 
                     lm.last_message, lm.last_message_time
            ORDER BY 
                CASE st.priority 
                    WHEN 'high' THEN 1 
                    WHEN 'medium' THEN 2 
                    WHEN 'low' THEN 3 
                END,
                lm.last_message_time DESC NULLS LAST
        `;

        const result = await client.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { subject, category, priority = 'medium', message } = await request.json();

    if (!subject || !message) {
        return NextResponse.json({ error: 'Тема и сообщение обязательны' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const chatResult = await client.query(`
            INSERT INTO chats (type, created_at)
            VALUES ('support', NOW())
            RETURNING id
        `, []);

        await client.query(
            `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)`,
            [chatResult.rows[0].id, session.user.id]
        );

        const adminResult = await client.query(
            `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
        );
        
        if (adminResult.rows.length > 0) {
            await client.query(
                `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)`,
                [chatResult.rows[0].id, adminResult.rows[0].id]
            );
        }

        const ticketResult = await client.query(`
            INSERT INTO support_tickets (user_id, chat_id, subject, category, priority, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())
            RETURNING id
        `, [session.user.id, chatResult.rows[0].id, subject, category, priority]);

        await client.query(`
            INSERT INTO messages (chat_id, sender_id, content, created_at)
            VALUES ($1, $2, $3, NOW())
        `, [chatResult.rows[0].id, session.user.id, message]);

        await client.query('COMMIT');

        return NextResponse.json({
            id: ticketResult.rows[0].id,
            chat_id: chatResult.rows[0].id,
            status: 'open'
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error creating ticket:', error);
        return NextResponse.json({ error: 'Ошибка создания обращения' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}