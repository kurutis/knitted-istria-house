import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    let client;
    try {
        client = await pool.connect();
        
        const result = await client.query(`
            SELECT 
                c.*,
                COUNT(a.id) as article_count
            FROM knowledge_categories c
            LEFT JOIN knowledge_articles a ON c.id = a.category_id AND a.is_published = true
            GROUP BY c.id
            ORDER BY c.name
        `);
        
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { name, slug, description } = await request.json();
    
    if (!name || !slug) {
        return NextResponse.json({ error: 'Название и slug обязательны' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();
        
        const existing = await client.query(
            'SELECT id FROM knowledge_categories WHERE slug = $1',
            [slug]
        );
        
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Категория с таким slug уже существует' }, { status: 400 });
        }
        
        const result = await client.query(`
            INSERT INTO knowledge_categories (name, slug, description, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING *
        `, [name, slug, description]);
        
        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}