import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Необходимо авторизоваться' }, { status: 401 });
    }

    const { id } = params;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Проверяем наличие мест
        const classResult = await client.query(
            `SELECT current_participants, max_participants FROM master_classes WHERE id = $1`,
            [id]
        );

        if (classResult.rows.length === 0) {
            return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
        }

        const mc = classResult.rows[0];
        if (mc.current_participants >= mc.max_participants) {
            return NextResponse.json({ error: 'Нет свободных мест' }, { status: 400 });
        }

        // Проверяем, не записан ли уже
        const existing = await client.query(
            `SELECT id FROM master_class_registrations WHERE master_class_id = $1 AND user_id = $2`,
            [id, session.user.id]
        );

        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Вы уже записаны на этот мастер-класс' }, { status: 400 });
        }

        // Добавляем запись
        await client.query(
            `INSERT INTO master_class_registrations (master_class_id, user_id, payment_status, created_at)
             VALUES ($1, $2, 'pending', NOW())`,
            [id, session.user.id]
        );

        // Обновляем количество участников
        await client.query(
            `UPDATE master_classes SET current_participants = current_participants + 1 WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        return NextResponse.json({ success: true, message: 'Вы успешно записались' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error registering for master class:', error);
        return NextResponse.json({ error: 'Ошибка при записи' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}