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
                bp.*,
                COALESCE(p.full_name, u.email) as author_name,
                p.avatar_url as author_avatar,
                0 as comments_count
            FROM blog_posts bp
            JOIN users u ON bp.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE bp.master_id = $1
            ORDER BY bp.created_at DESC
            LIMIT 10
        `, [session.user.id])
        
        return NextResponse.json(result.rows)
    } catch (error) {
        console.error('Error fetching blog posts:', error)
        return NextResponse.json([])
    } finally {
        client.release()
    }
}