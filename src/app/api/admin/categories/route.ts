import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET - получить все категории с подкатегориями
export async function GET() {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        client = await pool.connect()
        
        // Получаем все категории с подсчетом товаров
        const result = await client.query(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.parent_category_id,
                c.created_at,
                c.updated_at,
                COUNT(DISTINCT p.id) as products_count,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', sub.id,
                            'name', sub.name,
                            'description', sub.description,
                            'products_count', (
                                SELECT COUNT(*) FROM products WHERE category = sub.name AND status = 'active'
                            )
                        ) ORDER BY sub.name
                    )
                    FROM categories sub
                    WHERE sub.parent_category_id = c.id
                ) as subcategories
            FROM categories c
            LEFT JOIN products p ON c.name = p.category AND p.status = 'active'
            WHERE c.parent_category_id IS NULL
            GROUP BY c.id, c.name, c.description, c.parent_category_id, c.created_at, c.updated_at
            ORDER BY c.name ASC
        `)

        return NextResponse.json(result.rows, { status: 200 })
    } catch (error: any) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: error.message || 'Ошибка загрузки категорий' }, { status: 500 })
    } finally {
        if (client) client.release()
    }
}

// POST - создать новую категорию (основную или подкатегорию)
export async function POST(request: Request) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description, parent_category_id } = body

        if (!name) {
            return NextResponse.json({ error: 'Название категории обязательно' }, { status: 400 })
        }

        client = await pool.connect()
        
        // Проверяем, существует ли уже такая категория
        const existing = await client.query(
            `SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND parent_category_id IS NOT DISTINCT FROM $2`,
            [name, parent_category_id || null]
        )

        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Категория с таким названием уже существует' }, { status: 400 })
        }

        // Если указан parent_category_id, проверяем, что родительская категория существует
        if (parent_category_id) {
            const parentCheck = await client.query(
                `SELECT id FROM categories WHERE id = $1`,
                [parent_category_id]
            )
            if (parentCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Родительская категория не найдена' }, { status: 400 })
            }
        }

        const result = await client.query(`
            INSERT INTO categories (name, description, parent_category_id, created_at, updated_at)
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING id, name, description, parent_category_id, created_at, updated_at
        `, [name, description || null, parent_category_id || null])

        return NextResponse.json(result.rows[0], { status: 201 })
    } catch (error: any) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: error.message || 'Ошибка создания категории' }, { status: 500 })
    } finally {
        if (client) client.release()
    }
}

// PUT - обновить категорию
export async function PUT(request: Request) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { id, name, description, parent_category_id } = body

        if (!id || !name) {
            return NextResponse.json({ error: 'ID и название категории обязательны' }, { status: 400 })
        }

        client = await pool.connect()
        
        // Нельзя сделать категорию родителем самой себя
        if (parent_category_id && parent_category_id === parseInt(id)) {
            return NextResponse.json({ error: 'Категория не может быть родителем самой себя' }, { status: 400 })
        }

        const result = await client.query(`
            UPDATE categories 
            SET name = $1, description = $2, parent_category_id = $3, updated_at = NOW()
            WHERE id = $4
            RETURNING id, name, description, parent_category_id, created_at, updated_at
        `, [name, description || null, parent_category_id || null, id])

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
        }

        return NextResponse.json(result.rows[0], { status: 200 })
    } catch (error: any) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: error.message || 'Ошибка обновления категории' }, { status: 500 })
    } finally {
        if (client) client.release()
    }
}

// DELETE - удалить категорию (каскадно удаляет подкатегории)
export async function DELETE(request: Request) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID категории обязателен' }, { status: 400 })
        }

        client = await pool.connect()
        
        // Проверяем, есть ли товары в этой категории
        const category = await client.query(
            `SELECT name FROM categories WHERE id = $1`,
            [id]
        )
        
        if (category.rows.length > 0) {
            const productsCheck = await client.query(
                `SELECT COUNT(*) as count FROM products WHERE category = $1`,
                [category.rows[0].name]
            )

            if (parseInt(productsCheck.rows[0].count) > 0) {
                return NextResponse.json({ 
                    error: 'Невозможно удалить категорию, так как есть товары в этой категории' 
                }, { status: 400 })
            }
        }

        // Удаляем категорию (подкатегории удалятся каскадно благодаря ON DELETE CASCADE)
        await client.query(`DELETE FROM categories WHERE id = $1`, [id])

        return NextResponse.json({ message: 'Категория удалена' }, { status: 200 })
    } catch (error: any) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: error.message || 'Ошибка удаления категории' }, { status: 500 })
    } finally {
        if (client) client.release()
    }
}