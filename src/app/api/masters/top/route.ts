import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
    let client;
    try {
        client = await pool.connect();
        
        // Сортировка: сначала по продажам (по убыванию), затем по дате регистрации (новые первыми)
        const result = await client.query(`
            SELECT 
                u.id,
                u.email,
                COALESCE(p.full_name, u.email) as name,
                p.avatar_url,
                p.city,
                COALESCE(m.total_sales, 0) as total_sales,
                COALESCE(m.rating, 0) as rating,
                COALESCE(m.is_verified, false) as is_verified,
                COALESCE(m.is_partner, false) as is_partner,
                (
                    SELECT COUNT(*) FROM products pr 
                    WHERE pr.master_id = m.user_id AND pr.status = 'active'
                ) as products_count,
                u.created_at
            FROM users u
            JOIN masters m ON u.id = m.user_id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.role = 'master'
            ORDER BY 
                m.total_sales DESC NULLS LAST,
                u.created_at DESC
            LIMIT 6
        `);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching top masters:', error);
        return NextResponse.json({ error: error.message || 'Ошибка загрузки мастеров' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}