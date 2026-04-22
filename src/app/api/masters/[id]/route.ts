import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    let client;
    try {
        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                u.id,
                u.email,
                u.created_at as member_since,
                COALESCE(p.full_name, u.email) as name,
                p.phone,
                p.city,
                p.avatar_url,
                m.description,
                m.is_verified,
                m.is_partner,
                m.rating,
                m.total_sales,
                m.custom_orders_enabled,
                COALESCE(m.total_sales, 0) as pieces_created,
                (SELECT COUNT(*) FROM master_followers WHERE master_id = u.id) as followers_count
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN masters m ON u.id = m.user_id
            WHERE u.id = $1 AND u.role = 'master'
        `, [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching master:', error);
        return NextResponse.json({ error: 'Ошибка загрузки мастера' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}