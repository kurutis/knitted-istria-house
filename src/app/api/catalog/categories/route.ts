import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request:Request){
    try{
        const {searchParams} = new URL (request.url)

        const category = searchParams.get('category')
        const technique = searchParams.get('technique')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')
        const search = searchParams.get('search')
        const sort = searchParams.get('sort') || 'newest'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '12')
        const offset = (page-1) * limit

        const client = await pool.connect()

        try{
            let query = `SELECT p.id, p.title, p.description, p.price, p.status, p.category, t.technique, p.size, p.main_image_url, p.created_at, p.views, u.id as master_id, u.name as master_name, pv.rating as master_rating, (SELECT json_agg(json_build_object('id', pi.id, 'url', pi.image_url, 'sort_order', pi.sort_order)) FROM product_images pi WHERE pi.product_images = p.id) as images, ( SELECT COUNT(*) FROM reviews WHERE target_type = 'product' AND target_id = p.id::text) as reviews_count FROM products p JOIN masters m ON p.master_id = m.user_id JOIN users u ON m.user_id = u.id LEFT JOIN ( SELECT user_id, AVG(rating) as rating FROM reviews WHERE target_type = 'master' GROUP BY user_id) pv ON u.id = pv.user_id  WHERE p.status = 'active'` 
            const values: any[] = []
            let paramCount = 1

            if (category && category !== 'all'){
                query += ` AND p.category = $${paramCount}`
                values.push(category)
                paramCount++
            }

            if(technique){
                query += ` AND p.technique = $${paramCount}`
                values.push(technique)
                paramCount++
            }

            if(minPrice){
                query += ` AND p.price >= $${paramCount}`
                values.push(parseInt(minPrice))
                paramCount++
            }

            if(maxPrice){
                query += ` AND p.price <= $${paramCount}`
                values.push(parseInt(maxPrice))
                paramCount++
            }

            if(search){
                query += ` AND p.title ILIKE $${paramCount}`
                values.push(`%${search}%`)
                paramCount++
            }

            
            const countQuery = `SELECT COUNT(*) as total FROM ($${query}) as subquery`
            const countResult = await client.query(countQuery, values)
            const total = parseInt(countResult.rows[0]?.total || '0')


            switch(sort){
                case 'price_asc': query += ` ORDER BY p.price ASC`
                break
                case 'price_desc': query += ` ORDER BY p.price DESC`
                break
                case 'popular': query += ` ORDER BY p.views DESC, p.created_at DESC`
                break
                case 'rating': query += ` ORDER BY rating DESC NULLS LAST, p.created_at DESC`
                break
                case 'newest': default: query += ` ORDER BY p.created_at DESC`
            }

            query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`
            values.push(limit, offset)

            const result = await client.query(query, values)

            return NextResponse.json({products: result.rows, pagination: {page, limit, total, totalPages: Math.ceil(total / limit), hasMore: offset + limit < total}})
        }finally{
            client.release()
        }
    }catch (error){
        return NextResponse.json({error: 'Ошибка загрузки каталога'}, {status: 500})
    }
}