import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
        return NextResponse.json({ is_following: false, followers_count: 0 });
    }

    let client;
    try {
        client = await pool.connect();
        
        // Проверяем, подписан ли пользователь
        const followResult = await client.query(
            `SELECT id FROM master_followers WHERE master_id = $1 AND follower_id = $2`,
            [id, session.user.id]
        );
        
        // Получаем количество подписчиков
        const countResult = await client.query(
            `SELECT COUNT(*) as count FROM master_followers WHERE master_id = $1`,
            [id]
        );
        
        return NextResponse.json({ 
            is_following: followResult.rows.length > 0,
            followers_count: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Error checking follow status:', error);
        return NextResponse.json({ is_following: false, followers_count: 0 });
    } finally {
        if (client) client.release();
    }
}