import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let client;
    try {
        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                mc.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', cr.id,
                            'user_id', u.id,
                            'user_name', COALESCE(p.full_name, u.email),
                            'user_email', u.email,
                            'user_phone', p.phone,
                            'payment_status', cr.payment_status,
                            'created_at', cr.created_at
                        )
                    ) FILTER (WHERE cr.id IS NOT NULL),
                    '[]'::json
                ) as registrations
            FROM master_classes mc
            LEFT JOIN master_class_registrations cr ON mc.id = cr.master_class_id
            LEFT JOIN users u ON cr.user_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE mc.master_id = $1
            GROUP BY mc.id
            ORDER BY mc.date_time ASC
        `, [session.user.id]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching master classes:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let client;
    try {
        const formData = await request.formData();
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const type = formData.get('type') as string;
        const price = parseFloat(formData.get('price') as string) || 0;
        const max_participants = parseInt(formData.get('max_participants') as string) || 10;
        const date_time = formData.get('date_time') as string;
        const duration_minutes = parseInt(formData.get('duration_minutes') as string) || 60;
        const location = formData.get('location') as string;
        const online_link = formData.get('online_link') as string;
        const materials = formData.get('materials') as string;
        const imageFile = formData.get('image') as File | null;

        if (!title || !description || !date_time) {
            return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
        }

        client = await pool.connect();
        await client.query('BEGIN');

        // ✅ Публикуем сразу как 'published' (без модерации)
        const result = await client.query(`
            INSERT INTO master_classes (
                master_id, title, description, type, status,
                price, max_participants, date_time, duration_minutes,
                location, online_link, materials, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, 'published', $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING id
        `, [session.user.id, title, description, type, price, max_participants, date_time, duration_minutes, location || null, online_link || null, materials || null]);

        const classId = result.rows[0].id;

        if (imageFile && imageFile.size > 0) {
            const uploadDir = path.join(process.cwd(), 'public/uploads/classes');
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }
            
            const timestamp = Date.now();
            const filename = `${timestamp}-${imageFile.name.replace(/\s/g, '_')}`;
            const filePath = path.join(uploadDir, filename);
            const bytes = await imageFile.arrayBuffer();
            await writeFile(filePath, Buffer.from(bytes));
            
            const imageUrl = `/uploads/classes/${filename}`;
            await client.query(`UPDATE master_classes SET image_url = $1 WHERE id = $2`, [imageUrl, classId]);
        }

        await client.query('COMMIT');

        return NextResponse.json({ 
            success: true, 
            id: classId,
            message: 'Мастер-класс создан и опубликован' 
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error creating master class:', error);
        return NextResponse.json({ error: 'Ошибка создания мастер-класса' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}