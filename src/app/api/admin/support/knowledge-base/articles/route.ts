import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let client;
    try {
        client = await pool.connect();
        
        let query = `
            SELECT 
                a.*,
                c.name as category_name,
                c.slug as category_slug,
                COALESCE(p.full_name, u.email) as author_name
            FROM knowledge_articles a
            JOIN knowledge_categories c ON a.category_id = c.id
            JOIN users u ON a.author_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE 1=1
        `;
        
        const params: any[] = [];
        let paramIndex = 1;
        
        if (category) {
            query += ` AND c.slug = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        if (search) {
            query += ` AND (a.title ILIKE $${paramIndex} OR a.content ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        query += ` ORDER BY a.created_at DESC`;
        
        const result = await client.query(query, params);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching articles:', error);
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

    const { title, content, category, tags, is_published } = await request.json();
    
    if (!title || !content || !category) {
        return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
    }

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
            INSERT INTO knowledge_articles (title, content, category_id, tags, author_id, is_published, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            RETURNING *
        `, [title, content, categoryId, tags, session.user.id, is_published !== false]);
        
        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating article:', error);
        return NextResponse.json({ error: 'Ошибка создания статьи' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}