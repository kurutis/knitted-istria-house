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
            SELECT * FROM notifications 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 20
        `, [session.user.id])
        
        return NextResponse.json(result.rows)
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json([])
    } finally {
        client.release()
    }
}

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
        await client.query(`
            UPDATE notifications 
            SET is_read = true, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
        `, [id, session.user.id])
        
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error marking notification as read:', error)
        return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    } finally {
        client.release()
    }
}