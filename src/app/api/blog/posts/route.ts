import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
    const session = await getServerSession(authOptions);
    
    let client;
    try {
        client = await pool.connect();

        const result = await client.query(`
            SELECT 
                bp.id,
                bp.title,
                bp.content,
                bp.category,
                bp.tags,
                bp.main_image_url,
                bp.views_count,
                COALESCE(bp.likes_count, 0) as likes_count,
                bp.created_at,
                bp.master_id,
                COALESCE(p.full_name, u.email) as master_name,
                p.avatar_url as master_avatar,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', bi.id,
                            'url', bi.image_url,
                            'sort_order', bi.sort_order
                        ) ORDER BY bi.sort_order
                    ), '[]'::json)
                    FROM blog_images bi
                    WHERE bi.post_id = bp.id
                ) as images,
                (
                    SELECT COUNT(*) FROM blog_comments WHERE post_id = bp.id
                ) as comments_count,
                CASE WHEN $1::uuid IS NOT NULL AND EXISTS(
                    SELECT 1 FROM blog_likes WHERE post_id = bp.id AND user_id = $1
                ) THEN true ELSE false END as is_liked
            FROM blog_posts bp
            JOIN users u ON bp.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            ORDER BY bp.created_at DESC
        `, [session?.user?.id || null]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}