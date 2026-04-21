import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET - получить корзину пользователя
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    let client;
    try {
        client = await pool.connect();

        // ✅ Исправлено: u.name → COALESCE(p.full_name, u.email)
        const result = await client.query(`
            SELECT 
                c.product_id,
                c.quantity,
                p.title,
                p.price,
                p.main_image_url,
                COALESCE(prof.full_name, u.email) as master_name,
                p.price as final_price
            FROM cart c
            JOIN products p ON c.product_id = p.id
            JOIN users u ON p.master_id = u.id
            LEFT JOIN profiles prof ON u.id = prof.user_id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
        `, [session.user.id]);

        // Подсчет итогов
        const items = result.rows;
        const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = items.reduce((sum, item) => sum + (item.final_price * item.quantity), 0);

        return NextResponse.json({
            items: items || [],
            totalCount: totalCount || 0,
            totalAmount: totalAmount || 0
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        return NextResponse.json({ 
            items: [], 
            totalCount: 0, 
            totalAmount: 0,
            error: 'Ошибка загрузки корзины' 
        }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

// POST - добавить товар в корзину
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
        return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();

        // Проверяем, есть ли уже товар в корзине
        const existing = await client.query(
            `SELECT quantity FROM cart WHERE user_id = $1 AND product_id = $2`,
            [session.user.id, productId]
        );

        if (existing.rows.length > 0) {
            // Обновляем количество
            await client.query(
                `UPDATE cart SET quantity = quantity + $1, updated_at = NOW() WHERE user_id = $2 AND product_id = $3`,
                [quantity, session.user.id, productId]
            );
        } else {
            // Добавляем новый товар
            await client.query(
                `INSERT INTO cart (user_id, product_id, quantity, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())`,
                [session.user.id, productId, quantity]
            );
        }

        // Получаем обновленную корзину
        const result = await client.query(
            `SELECT COALESCE(SUM(quantity), 0) as total FROM cart WHERE user_id = $1`,
            [session.user.id]
        );

        return NextResponse.json({
            success: true,
            cartCount: parseInt(result.rows[0].total) || 0,
            message: 'Товар добавлен в корзину'
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

// DELETE - удалить товар из корзины
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
        return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();

        await client.query(
            `DELETE FROM cart WHERE user_id = $1 AND product_id = $2`,
            [session.user.id, productId]
        );

        return NextResponse.json({ success: true, message: 'Товар удален из корзины' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}