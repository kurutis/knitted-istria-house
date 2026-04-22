import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const client = await pool.connect()
        try {
            await client.query(`UPDATE products SET views = views + 1 WHERE id = $1`, [id])
            
            const productResult = await client.query(`
                SELECT 
                    p.*, 
                    u.id as master_id, 
                    COALESCE(prof.full_name, u.email) as master_name, 
                    u.email as master_email, 
                    COALESCE(pv.rating, 0) as master_rating, 
                    COALESCE(pv.total_sales, 0) as total_sales, 
                    COALESCE(pv.is_verified, false) as is_verified, 
                    COALESCE(pv.is_partner, false) as is_partner, 
                    (
                        SELECT COALESCE(json_agg(
                            json_build_object(
                                'id', pi.id, 
                                'url', pi.image_url, 
                                'sort_order', pi.sort_order
                            ) ORDER BY pi.sort_order
                        ), '[]'::json)
                        FROM product_images pi 
                        WHERE pi.product_id = p.id
                    ) as images, 
                    (
                        SELECT COALESCE(json_agg(
                            json_build_object(
                                'id', yc.id, 
                                'name', yc.name, 
                                'article', yc.article, 
                                'brand', yc.brand, 
                                'color', yc.color, 
                                'composition', yc.composition
                            )
                        ), '[]'::json)
                        FROM product_yarn py 
                        JOIN yarn_catalog yc ON py.yarn_id = yc.id 
                        WHERE py.product_id = p.id
                    ) as yarns, 
                    (
                        SELECT COALESCE(json_agg(
                            json_build_object(
                                'id', r.id, 
                                'rating', r.rating, 
                                'comment', r.comment, 
                                'created_at', r.created_at, 
                                'author_name', COALESCE(prof2.full_name, u2.email), 
                                'author_avatar', prof2.avatar_url
                            ) ORDER BY r.created_at DESC
                        ), '[]'::json)
                        FROM reviews r 
                        JOIN users u2 ON r.author_id = u2.id 
                        LEFT JOIN profiles prof2 ON u2.id = prof2.user_id 
                        WHERE r.target_type = 'product' AND r.target_id = p.id
                    ) as reviews,
                    (
                        SELECT COUNT(*) FROM reviews WHERE target_type = 'product' AND target_id = p.id
                    ) as reviews_count,
                    (
                        SELECT COALESCE(AVG(rating), 0)::numeric(10,2) 
                        FROM reviews WHERE target_type = 'product' AND target_id = p.id
                    ) as rating
                FROM products p 
                JOIN masters m ON p.master_id = m.user_id 
                JOIN users u ON m.user_id = u.id 
                LEFT JOIN profiles prof ON u.id = prof.user_id
                LEFT JOIN (
                    SELECT 
                        user_id, 
                        AVG(rating) as rating, 
                        SUM(total_sales) as total_sales, 
                        is_verified, 
                        is_partner 
                    FROM masters 
                    GROUP BY user_id, is_verified, is_partner
                ) pv ON u.id = pv.user_id 
                WHERE p.id = $1
            `, [id])

            if (productResult.rows.length === 0) {
                return NextResponse.json({ error: 'Товар не найден' }, { status: 404 })
            }
            
            return NextResponse.json(productResult.rows[0])
        } finally {
            client.release()
        }
    } catch (error) {
        console.error('Error fetching product:', error)
        return NextResponse.json({ error: 'Ошибка загрузки товара' }, { status: 500 })
    }
}