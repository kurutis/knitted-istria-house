import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        
        const defaultCategory = await client.query(
            "SELECT id FROM knowledge_categories WHERE slug = 'general'"
        );
        
        let defaultId: number;
        if (defaultCategory.rows.length === 0) {
            const newDefault = await client.query(`
                INSERT INTO knowledge_categories (name, slug, description, created_at)
                VALUES ('Общее', 'general', 'Общие вопросы', NOW())
                RETURNING id
            `);
            defaultId = newDefault.rows[0].id;
        } else {
            defaultId = defaultCategory.rows[0].id;
        }
        
        await client.query(
            'UPDATE knowledge_articles SET category_id = $1 WHERE category_id = $2',
            [defaultId, id]
        );
        
        await client.query('DELETE FROM knowledge_categories WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        return NextResponse.json({ success: true });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}