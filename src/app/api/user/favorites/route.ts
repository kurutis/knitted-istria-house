import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET - получить список избранного
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const client = await pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    p.id,
                    p.title,
                    p.price,
                    p.main_image_url,
                    COALESCE(prof.full_name, u.email) as master_name
                FROM favorites f
                JOIN products p ON f.product_id = p.id
                JOIN masters m ON p.master_id = m.user_id
                JOIN users u ON m.user_id = u.id
                LEFT JOIN profiles prof ON u.id = prof.user_id
                WHERE f.user_id = $1
                ORDER BY f.created_at DESC
            `, [session.user.id]);

            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return NextResponse.json({ error: 'Ошибка загрузки избранного' }, { status: 500 });
    }
}

// POST - добавить в избранное
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { productId } = await request.json();

        if (!productId) {
            return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
        }

        const client = await pool.connect();
        
        try {
            // ✅ Исправлено: убрали SELECT id, используем SELECT 1 или EXISTS
            const existing = await client.query(
                `SELECT 1 FROM favorites WHERE user_id = $1 AND product_id = $2`,
                [session.user.id, productId]
            );

            if (existing.rows.length > 0) {
                return NextResponse.json({ message: 'Уже в избранном' }, { status: 200 });
            }

            // Добавляем в избранное
            await client.query(
                `INSERT INTO favorites (user_id, product_id, created_at) VALUES ($1, $2, NOW())`,
                [session.user.id, productId]
            );

            return NextResponse.json({ success: true, message: 'Добавлено в избранное' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error adding to favorites:', error);
        return NextResponse.json({ error: 'Ошибка добавления в избранное' }, { status: 500 });
    }
}

// DELETE - удалить из избранного
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
        }

        const client = await pool.connect();
        
        try {
            await client.query(
                `DELETE FROM favorites WHERE user_id = $1 AND product_id = $2`,
                [session.user.id, productId]
            );

            return NextResponse.json({ success: true, message: 'Удалено из избранного' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error removing from favorites:', error);
        return NextResponse.json({ error: 'Ошибка удаления из избранного' }, { status: 500 });
    }
}