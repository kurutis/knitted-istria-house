import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
    let client;
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                u.id,
                u.email,
                u.role,
                COALESCE(p.full_name, u.email) as fullname,
                p.phone,
                p.city,
                p.address,
                p.avatar_url as "avatarUrl",
                p.newsletter_agreement,
                m.description,
                m.is_verified,
                m.is_partner,
                m.rating,
                m.total_sales,
                m.custom_orders_enabled,
                COALESCE(m.total_sales, 0) as total_sales,
                (
                    SELECT COUNT(*) FROM master_class_registrations cr
                    JOIN master_classes mc ON cr.master_class_id = mc.id
                    WHERE mc.master_id = u.id
                ) as followers
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN masters m ON u.id = m.user_id
            WHERE u.id = $1 AND u.role = 'master'
        `, [session.user.id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }

        const profile = result.rows[0];
        return NextResponse.json(profile);
    } catch (error) {
        console.error('Error fetching master profile:', error);
        return NextResponse.json({ error: 'Ошибка загрузки профиля' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function PUT(request: Request) {
    let client;
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || session.user.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        const { fullname, phone, city, address, description, custom_orders_enabled } = body;

        client = await pool.connect();
        await client.query('BEGIN');

        // Обновляем профиль
        await client.query(`
            UPDATE profiles 
            SET full_name = $1, phone = $2, city = $3, address = $4, updated_at = NOW()
            WHERE user_id = $5
        `, [fullname, phone, city, address, session.user.id]);

        // Обновляем данные мастера
        await client.query(`
            UPDATE masters 
            SET description = $1, custom_orders_enabled = $2, updated_at = NOW()
            WHERE user_id = $3
        `, [description, custom_orders_enabled, session.user.id]);

        await client.query('COMMIT');

        return NextResponse.json({ success: true, message: 'Профиль обновлен' });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error updating master profile:', error);
        return NextResponse.json({ error: 'Ошибка обновления профиля' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}