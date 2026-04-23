import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;
    const { priority } = await request.json();

    if (!['low', 'medium', 'high'].includes(priority)) {
        return NextResponse.json({ error: 'Неверный приоритет' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();

        const result = await client.query(`
            UPDATE support_tickets 
            SET priority = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id
        `, [priority, id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating ticket priority:', error);
        return NextResponse.json({ error: 'Ошибка обновления приоритета' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}