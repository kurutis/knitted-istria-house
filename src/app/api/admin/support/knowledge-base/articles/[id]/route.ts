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
    const { title, content, category, tags, is_published } = await request.json();

    let client;
    try {
        client = await pool.connect();
        
        const categoryResult = await client.query(
            'SELECT id FROM knowledge_categories WHERE slug = $1',
            [category]
        );
        
        if (categoryResult.rows.length === 0) {
            return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 });
        }
        
        const categoryId = categoryResult.rows[0].id;
        
        const result = await client.query(`
            UPDATE knowledge_articles 
            SET title = $1, content = $2, category_id = $3, tags = $4, is_published = $5, updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `, [title, content, categoryId, tags, is_published, id]);
        
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
        }
        
        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating article:', error);
        return NextResponse.json({ error: 'Ошибка обновления статьи' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

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
        
        const result = await client.query(
            'DELETE FROM knowledge_articles WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting article:', error);
        return NextResponse.json({ error: 'Ошибка удаления статьи' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}