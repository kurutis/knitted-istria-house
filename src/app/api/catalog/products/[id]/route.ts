import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request:Request, {params}: {params: {id: string}}) {
    try{
        const {id} = params

        const client = await pool.connect()
        try{
            await client.query(`UPDATE products SET views = views + 1 WHERE id = $1`, [id])
            const productResult = await client.query(`SELECT p.*, u.id as master_id, u.name as master_name, u.email as master_email, pv.rating as master_rating, pv.total_sales, pv.is_verified, pv.is_partner, (SELECT json_agg( json_build_object( 'id', pi.id, 'url', pi.image_url, 'sort_order', pi.sort_order) ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.id) as images, (SELECT json_agg(  json_build_object( 'id', yc.id, 'name', yc.name, 'article', yc.article, 'brand', yc.brand, 'color', yc.color, 'composition', yc.composition)) FROM product_yarn py JOIN yarn_catalog yc ON py.yarn_id = yc.id WHERE py.product_id = p.id) as yarns, ( SELECT json_agg( json_build_object( 'id', r.id, 'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at, 'author_name', au.name, 'author_avatar', ap.avatar_url) ORDER BY r.created_at DESC) FROM reviews r JOIN users au ON r.author_id = au.id LEFT JOIN profiles ap ON au.id = ap.user_id WHERE r.target_type = 'product' AND r.target_id = p.id::text) as reviews FROM products p JOIN masters m ON p.master_id = m.user_id JOIN users u ON m.user_id = u.id LEFT JOIN ( SELECT user_id, AVG(rating) as rating, SUM(total_sales) as total_sales, is_verified, is_partner FROM masters GROUP BY user_id, is_verified, is_partner) pv ON u.id = pv.user_id WHERE p.id = $1`, [id])

            if (productResult.rows.length === 0) {
                return NextResponse.json({error: 'Товар не найден'}, {status: 404})
            }
            return NextResponse.json(productResult.rows[0])
        }finally{
            client.release()
        }
    }catch(error){
        return NextResponse.json({error: 'Ошибка загрузки товара'}, {status: 500})
    }
}