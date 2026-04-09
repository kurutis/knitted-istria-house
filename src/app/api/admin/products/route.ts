import { authOptions } from "@/lib/auth"
import { pool } from "@/lib/db"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

export async function GET() {
    let client
    try{
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({error: 'Неавторизован'}, {status: 401})}
        client = await pool.connect()
        const result = await client.query(`SELECT p.id, p.title, p.description, p.price, p.status, p.category, p.technique, p.size, p.main_image_url, p.created_at, p.views, u.id as master_id, u.email as master_email, COALESCE(p.full_name, u.email) as master_name, (SELECT json_agg( json_build_object('id', pi.id, 'url', pi.image_url,'sort_order', pi.sort_order)) FROM product_images pi WHERE pi.product_id = p.id) as images FROM products p JOIN masters m ON p.master_id = m.user_id JOIN users u ON m.user_id = u.id LEFT JOIN profiles p ON u.id = p.user_id WHERE p.status = 'moderation' OR p.status = 'draft' ORDER BY p.created_at DESC`)
        return NextResponse.json(result.rows, {status:200})
    }catch(error: any){
        return NextResponse.json({error: error.message}, {status: 500})
    }finally{
        if (client) client.release()
    }
}

export async function PUT(request: Request) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })}

        const body = await request.json()
        const { productId, action, reason } = body

        if (!productId || !action) {return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })}

        client = await pool.connect()
        await client.query('BEGIN')

        switch (action) {
            case 'approve':
                await client.query(`UPDATE products SET status = 'active', updated_at = NOW() WHERE id = $1`, [productId])
                break
            case 'reject':
                await client.query(`UPDATE products SET status = 'rejected', updated_at = NOW(), moderation_comment = $2 WHERE id = $1`, [productId, reason || 'Отклонено модератором'])
                break
            case 'draft':
                await client.query(`UPDATE products SET status = 'draft', updated_at = NOW() WHERE id = $1`, [productId])
                break
            default:
                await client.query('ROLLBACK')
                return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
        }

        await client.query('COMMIT')
        
        return NextResponse.json({ message: 'Действие выполнено успешно' }, { status: 200 })
    } catch (error: any) {
        if (client) await client.query('ROLLBACK')
        console.error('Error in PUT:', error)
        return NextResponse.json({ error: error.message || 'Ошибка обработки запроса' }, { status: 500 })
    } finally {
        if (client) client.release()
    }
}