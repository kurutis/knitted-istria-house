import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json([], { status: 401 });
    }

    let client;
    try {
        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                mc.*,
                COALESCE(p.full_name, u.email) as master_name,
                p.avatar_url as master_avatar
            FROM master_class_registrations cr
            JOIN master_classes mc ON cr.master_class_id = mc.id
            JOIN users u ON mc.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE cr.user_id = $1
            ORDER BY mc.date_time ASC
        `, [session.user.id]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching my master classes:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}