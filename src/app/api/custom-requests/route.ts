import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { masterId, name, email, description, budget } = await request.json();

    if (!masterId || !name || !email || !description) {
        return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();

        // Создаем запрос
        await client.query(`
            INSERT INTO custom_requests (
                master_id, user_id, buyer_name, buyer_email, description, budget, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
        `, [masterId, session.user.id, name, email, description, budget || null]);

        // Отправляем уведомление мастеру (опционально)
        // Здесь можно добавить отправку email или создание уведомления

        return NextResponse.json({ success: true, message: 'Запрос отправлен' });
    } catch (error) {
        console.error('Error creating custom request:', error);
        return NextResponse.json({ error: 'Ошибка отправки запроса' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}