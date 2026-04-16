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
        const result = await client.query(`
            SELECT 
                o.*, 
                p.title as product_title,
                COALESCE(prof.full_name, u.email) as buyer_name
            FROM orders o 
            JOIN order_items oi ON o.id = oi.order_id 
            JOIN products p ON oi.product_id = p.id 
            JOIN users u ON o.buyer_id = u.id 
            LEFT JOIN profiles prof ON u.id = prof.user_id
            WHERE p.master_id = $1 
            ORDER BY o.created_at DESC
        `, [session.user.id])
        
        return NextResponse.json(result.rows)
    } finally {
        client.release()
    }
}