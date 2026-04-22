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
                r.id,
                r.rating,
                r.comment,
                r.created_at,
                COALESCE(p.full_name, u.email) as author_name,
                p.avatar_url as author_avatar
            FROM reviews r
            JOIN users u ON r.author_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE r.target_type = 'master' AND r.target_id = $1
            ORDER BY r.created_at DESC
        `, [id]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching master reviews:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}