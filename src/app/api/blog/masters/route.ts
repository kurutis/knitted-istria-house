import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);
    
    let client;
    try {
        client = await pool.connect();

        let following = []
        if (session?.user) {
            const followingResult = await client.query(`
                SELECT 
                    u.id, 
                    COALESCE(p.full_name, u.email) as name,
                    p.avatar_url,
                    p.city,
                    COUNT(DISTINCT pr.id) as products_count,
                    COUNT(DISTINCT bp.id) as posts_count
                FROM master_followers f
                JOIN users u ON f.master_id = u.id
                LEFT JOIN profiles p ON u.id = p.user_id
                LEFT JOIN products pr ON u.id = pr.master_id AND pr.status = 'active'
                LEFT JOIN blog_posts bp ON u.id = bp.master_id
                WHERE f.follower_id = $1 AND u.role = 'master'
                GROUP BY u.id, p.full_name, p.avatar_url, p.city
                ORDER BY u.created_at DESC
                LIMIT 10
            `, [session.user.id]);
            following = followingResult.rows.map(m => ({ ...m, is_following: true }));
        }

        const recommendedResult = await client.query(`
            SELECT 
                u.id, 
                COALESCE(p.full_name, u.email) as name,
                p.avatar_url,
                p.city,
                COUNT(DISTINCT pr.id) as products_count,
                COUNT(DISTINCT bp.id) as posts_count,
                CASE WHEN $1::uuid IS NOT NULL AND EXISTS(
                    SELECT 1 FROM master_followers f 
                    WHERE f.follower_id = $1 AND f.master_id = u.id
                ) THEN true ELSE false END as is_following
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN products pr ON u.id = pr.master_id AND pr.status = 'active'
            LEFT JOIN blog_posts bp ON u.id = bp.master_id
            WHERE u.role = 'master'
            GROUP BY u.id, p.full_name, p.avatar_url, p.city
            ORDER BY posts_count DESC, products_count DESC, u.created_at DESC
            LIMIT 10
        `, [session?.user?.id || null]);

        return NextResponse.json({
            following,
            recommended: recommendedResult.rows
        });
    } catch (error) {
        console.error('Error fetching masters:', error);
        return NextResponse.json({ following: [], recommended: [] }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}