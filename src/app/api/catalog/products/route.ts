import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        const category = searchParams.get('category')
        const technique = searchParams.get('technique')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')
        const search = searchParams.get('search')
        const sort = searchParams.get('sort') || 'newest'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '12')
        const offset = (page - 1) * limit

        const client = await pool.connect()

        try {
            // Базовый запрос
            let query = `
                SELECT 
                    p.id, 
                    p.title, 
                    p.description, 
                    p.price, 
                    p.status, 
                    p.category, 
                    p.technique, 
                    p.size, 
                    p.main_image_url, 
                    p.created_at,
                    u.id as master_id, 
                    COALESCE(prof.full_name, u.email) as master_name
                FROM products p 
                JOIN masters m ON p.master_id = m.user_id 
                JOIN users u ON m.user_id = u.id 
                LEFT JOIN profiles prof ON u.id = prof.user_id
                WHERE p.status = 'active'
            `

            const values: any[] = []
            let paramCount = 1

            if (category && category !== 'all') {
                query += ` AND p.category = $${paramCount}`
                values.push(category)
                paramCount++
            }

            if (technique) {
                query += ` AND p.technique = $${paramCount}`
                values.push(technique)
                paramCount++
            }

            if (minPrice) {
                query += ` AND p.price >= $${paramCount}`
                values.push(parseInt(minPrice))
                paramCount++
            }

            if (maxPrice) {
                query += ` AND p.price <= $${paramCount}`
                values.push(parseInt(maxPrice))
                paramCount++
            }

            if (search) {
                query += ` AND p.title ILIKE $${paramCount}`
                values.push(`%${search}%`)
                paramCount++
            }

            // Подсчет количества
            let countQuery = `SELECT COUNT(*) as total FROM products p WHERE p.status = 'active'`
            let countValues: any[] = []
            let countParamCount = 1

            if (category && category !== 'all') {
                countQuery += ` AND p.category = $${countParamCount++}`
                countValues.push(category)
            }
            if (technique) {
                countQuery += ` AND p.technique = $${countParamCount++}`
                countValues.push(technique)
            }
            if (minPrice) {
                countQuery += ` AND p.price >= $${countParamCount++}`
                countValues.push(parseInt(minPrice))
            }
            if (maxPrice) {
                countQuery += ` AND p.price <= $${countParamCount++}`
                countValues.push(parseInt(maxPrice))
            }
            if (search) {
                countQuery += ` AND p.title ILIKE $${countParamCount++}`
                countValues.push(`%${search}%`)
            }

            const countResult = await client.query(countQuery, countValues)
            const total = parseInt(countResult.rows[0]?.total || '0')

            // Сортировка
            switch (sort) {
                case 'price_asc':
                    query += ` ORDER BY p.price ASC`
                    break
                case 'price_desc':
                    query += ` ORDER BY p.price DESC`
                    break
                case 'popular':
                    query += ` ORDER BY p.created_at DESC`
                    break
                case 'newest':
                default:
                    query += ` ORDER BY p.created_at DESC`
            }

            query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`
            values.push(limit, offset)

            const result = await client.query(query, values)

            return NextResponse.json({
                products: result.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: offset + limit < total
                }
            })
        } finally {
            client.release()
        }
    } catch (error) {
        console.error('Error fetching products:', error)
        return NextResponse.json({ error: 'Ошибка загрузки каталога' }, { status: 500 })
    }
}