import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
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

        const participantCheck = await client.query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [id, session.user.id]
        );

        if (participantCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const result = await client.query(`
            SELECT 
                m.id,
                m.chat_id,
                m.sender_id,
                m.content,
                m.is_read,
                m.is_edited,
                m.attachments,
                m.created_at,
                COALESCE(p.full_name, u.email) as sender_name,
                p.avatar_url as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE m.chat_id = $1
            ORDER BY m.created_at ASC
        `, [id]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { id } = await params;
    
    let content = '';
    let attachments: { type: string; url: string }[] = [];

    try {
        const formData = await request.formData();
        content = (formData.get('content') as string) || '';
        const files = formData.getAll('attachments') as File[];
        
        const uploadDir = path.join(process.cwd(), 'public/uploads/chats');
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        for (const file of files) {
            if (file && file.size > 0) {
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const timestamp = Date.now();
                const filename = `${timestamp}-${file.name.replace(/\s/g, '_')}`;
                const filePath = path.join(uploadDir, filename);
                await writeFile(filePath, buffer);
                
                const fileType = file.type.startsWith('image/') ? 'image' : 'video';
                attachments.push({
                    type: fileType,
                    url: `/uploads/chats/${filename}`
                });
            }
        }
    } catch (error) {
        try {
            const body = await request.json();
            content = body.content || '';
        } catch {
            return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
        }
    }

    if ((!content || !content.trim()) && attachments.length === 0) {
        return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const participantCheck = await client.query(
            `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2`,
            [id, session.user.id]
        );

        if (participantCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const attachmentsJson = JSON.stringify(attachments);
        
        // ✅ content теперь будет пустой строкой вместо NULL
        const messageContent = content.trim() || '';

        const result = await client.query(`
            INSERT INTO messages (chat_id, sender_id, content, attachments, created_at)
            VALUES ($1, $2, $3, $4::jsonb, NOW())
            RETURNING id, chat_id, sender_id, content, is_read, is_edited, created_at
        `, [id, session.user.id, messageContent, attachmentsJson]);

        try {
            await client.query(`
                UPDATE support_tickets 
                SET updated_at = NOW(), status = 'open' 
                WHERE chat_id = $1 AND status = 'closed'
            `, [id]);
        } catch (err) {
            console.warn('Could not update support ticket:', err);
        }

        const senderResult = await client.query(`
            SELECT COALESCE(p.full_name, u.email) as sender_name, p.avatar_url as sender_avatar
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = $1
        `, [session.user.id]);

        await client.query('COMMIT');

        return NextResponse.json({
            ...result.rows[0],
            attachments,
            sender_name: senderResult.rows[0].sender_name,
            sender_avatar: senderResult.rows[0].sender_avatar
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}