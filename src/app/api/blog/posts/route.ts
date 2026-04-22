import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    
    let client;
    try {
        client = await pool.connect();

        let query = `
            SELECT 
                bp.id,
                bp.title,
                bp.content,
                bp.excerpt,
                bp.main_image_url,
                bp.created_at,
                bp.master_id,
                COALESCE(p.full_name, u.email) as master_name,
                p.avatar_url as master_avatar,
                COALESCE(l.likes_count, 0) as likes_count,
                COALESCE(c.comments_count, 0) as comments_count,
                EXISTS(
                    SELECT 1 FROM blog_likes bl 
                    WHERE bl.post_id = bp.id AND bl.user_id = $1
                ) as is_liked,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id', bi.id,
                            'url', bi.image_url,
                            'sort_order', bi.sort_order
                        ) ORDER BY bi.sort_order
                    )
                    FROM blog_images bi
                    WHERE bi.post_id = bp.id
                ) as images
            FROM blog_posts bp
            JOIN users u ON bp.master_id = u.id
            LEFT JOIN profiles p ON u.id = p.user_id
            LEFT JOIN (
                SELECT post_id, COUNT(*) as likes_count
                FROM blog_likes
                GROUP BY post_id
            ) l ON bp.id = l.post_id
            LEFT JOIN (
                SELECT post_id, COUNT(*) as comments_count
                FROM blog_comments
                GROUP BY post_id
            ) c ON bp.id = c.post_id
            ORDER BY bp.created_at DESC
        `;
        
        if (limit) {
            query += ` LIMIT $2`;
            const result = await client.query(query, [session?.user?.id || null, limit]);
            return NextResponse.json(result.rows);
        }
        
        const result = await client.query(query, [session?.user?.id || null]);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}