import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    let client;
    try {
        client = await pool.connect();

        // Проверяем существование колонки type
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'chats' AND column_name = 'type'
        `);
        
        const hasTypeColumn = columnCheck.rows.length > 0;

        // Получаем все чаты пользователя
        const result = await client.query(`
            WITH last_messages AS (
                SELECT DISTINCT ON (chat_id) 
                    chat_id,
                    content as last_message,
                    created_at as last_message_time,
                    sender_id
                FROM messages
                ORDER BY chat_id, created_at DESC
            )
            SELECT 
                c.id,
                ${hasTypeColumn ? 'c.type' : "'direct' as type"},
                CASE 
                    WHEN cp.user_id != $1 THEN cp.user_id
                    ELSE NULL
                END as participant_id,
                COALESCE(p.full_name, u2.email) as participant_name,
                p.avatar_url as participant_avatar,
                COALESCE(lm.last_message, 'Нет сообщений') as last_message,
                lm.last_message_time,
                COUNT(CASE WHEN m.is_read = false AND m.sender_id != $1 THEN 1 END) as unread_count
            FROM chats c
            JOIN chat_participants cp ON c.id = cp.chat_id
            LEFT JOIN users u2 ON cp.user_id = u2.id AND cp.user_id != $1
            LEFT JOIN profiles p ON u2.id = p.user_id
            LEFT JOIN messages m ON c.id = m.chat_id
            LEFT JOIN last_messages lm ON c.id = lm.chat_id
            WHERE cp.user_id = $1
            GROUP BY c.id, c.type, participant_id, participant_name, p.avatar_url, lm.last_message, lm.last_message_time
            ORDER BY lm.last_message_time DESC NULLS LAST
        `, [session.user.id]);

        let chats = result.rows;
        
        // Проверяем, есть ли чат с поддержкой
        const hasSupport = chats.some(row => row.type === 'support');
        
        if (!hasSupport) {
            // Создаем чат с поддержкой
            const supportChat = await client.query(
                `INSERT INTO chats ${hasTypeColumn ? '(type, created_at)' : '(created_at)'} 
                 VALUES ${hasTypeColumn ? "('support', NOW())" : "(NOW())"} 
                 RETURNING id`,
                []
            );
            
            await client.query(
                `INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)`,
                [supportChat.rows[0].id, session.user.id]
            );
            
            chats.unshift({
                id: supportChat.rows[0].id,
                type: 'support',
                participant_id: 'support',
                participant_name: 'Поддержка',
                participant_avatar: null,
                last_message: 'Здравствуйте! Чем могу помочь?',
                last_message_time: new Date().toISOString(),
                unread_count: 0
            });
        }

        return NextResponse.json(chats);
    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}