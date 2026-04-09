import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })}

        const client = await pool.connect()
        try {
            const result = await client.query(`SELECT u.id, u.email, u.created_at, p.full_name as name, p.phone, p.city, p.avatar_url, m.description, m.is_verified, m.is_partner, m.rating, COALESCE(m.total_sales, 0) as products_count FROM users u LEFT JOIN profiles p ON u.id = p.user_id LEFT JOIN masters m ON u.id = m.user_id WHERE u.role = 'master' ORDER BY u.created_at DESC`)
            const masters = result.rows.map(row => ({id: row.id, user_id: row.id, name: row.name || row.email, email: row.email, phone: row.phone || '', city: row.city || '', description: row.description || '', is_verified: row.is_verified || false, is_partner: row.is_partner || false, created_at: row.created_at, products_count: parseInt(row.products_count) || 0, rating: parseFloat(row.rating) || 0, full_name: row.name || '', avatar_url: row.avatar_url || ''}))
            
            return NextResponse.json(masters, { status: 200 })
        } finally {
            client.release()
        }
    } catch (error: any) {
        return NextResponse.json({error: error.message || 'Ошибка загрузки мастеров'}, {status: 500})
    }
}

export async function PUT(request: Request) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({error: 'Неавторизован'}, {status: 401})}

        const body = await request.json()
        const { masterId, action, reason } = body

        if (!masterId || !action) { return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })}

        client = await pool.connect()
        await client.query('BEGIN')

        switch (action) {
            case 'approve':
                await client.query(`UPDATE masters SET is_verified = true, updated_at = NOW() WHERE user_id = $1`,[masterId])
                break
            case 'reject':
                await client.query(`UPDATE masters SET is_verified = false, updated_at = NOW() WHERE user_id = $1`,[masterId])
                if (reason) {await client.query(`UPDATE users SET ban_reason = $1 WHERE id = $2`,[reason, masterId])}
                break
            case 'remove_verification':
                await client.query(`UPDATE masters SET is_verified = false, updated_at = NOW() WHERE user_id = $1`,)
                break
            default:
                await client.query('ROLLBACK')
                return NextResponse.json({error: 'Неизвестное действие'}, {status: 400})
        }

        await client.query('COMMIT')
        
        return NextResponse.json({message: 'Действие выполнено успешно'}, {status: 200})
    } catch (error: any) {
        if (client) await client.query('ROLLBACK')
        return NextResponse.json({error: error.message || 'Ошибка обработки запроса'}, {status: 500})
    } finally {
        if (client) client.release()
    }
}