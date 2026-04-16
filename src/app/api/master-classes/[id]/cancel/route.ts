import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function DELETE(
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

        // Удаляем запись
        await client.query(
            `DELETE FROM master_class_registrations WHERE master_class_id = $1 AND user_id = $2`,
            [id, session.user.id]
        );

        // Уменьшаем количество участников
        await client.query(
            `UPDATE master_classes SET current_participants = current_participants - 1 WHERE id = $1`,
            [id]
        );

        await client.query('COMMIT');

        return NextResponse.json({ success: true });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error canceling registration:', error);
        return NextResponse.json({ error: 'Ошибка при отмене записи' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}