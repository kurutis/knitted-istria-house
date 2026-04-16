import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
    let client;
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                mc.*,
                COALESCE(p.full_name, u.email) as master_name,
                p.avatar_url as master_avatar,
                CASE WHEN $1::uuid IS NOT NULL AND cr.user_id IS NOT NULL THEN true ELSE false END as is_registered
            FROM master_classes mc
            JOIN users u ON mc.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN master_class_registrations cr ON mc.id = cr.master_class_id AND cr.user_id = $1
            WHERE mc.status = 'published' AND mc.date_time > NOW()
            ORDER BY mc.date_time ASC
        `, [userId || null]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching master classes:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}