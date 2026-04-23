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
    const { is_published } = await request.json();

    let client;
    try {
        client = await pool.connect();
        
        const result = await client.query(`
            UPDATE knowledge_articles 
            SET is_published = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id
        `, [is_published, id]);
        
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error toggling publish:', error);
        return NextResponse.json({ error: 'Ошибка изменения статуса' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}