import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { pool } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await pool.connect()
    try {
        // Новые заказы
        const newOrders = await client.query(`
            SELECT COUNT(*) FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.master_id = $1 AND o.status = 'new'
        `, [session.user.id])

        // Всего заказов
        const totalOrders = await client.query(`
            SELECT COUNT(*) FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.master_id = $1
        `, [session.user.id])

        // Всего товаров
        const totalProducts = await client.query(`
            SELECT COUNT(*) FROM products WHERE master_id = $1
        `, [session.user.id])

        // Всего просмотров
        const totalViews = await client.query(`
            SELECT COALESCE(SUM(views), 0) FROM products WHERE master_id = $1
        `, [session.user.id])

        return NextResponse.json({
            new_orders: parseInt(newOrders.rows[0].count),
            total_orders: parseInt(totalOrders.rows[0].count),
            total_products: parseInt(totalProducts.rows[0].count),
            total_views: parseInt(totalViews.rows[0].sum || 0),
            total_followers: 0
        })
    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json({
            new_orders: 0,
            total_orders: 0,
            total_products: 0,
            total_views: 0,
            total_followers: 0
        })
    } finally {
        client.release()
    }
}