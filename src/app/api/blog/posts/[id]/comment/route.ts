import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();

        const result = await client.query(
            `INSERT INTO blog_comments (post_id, author_id, content, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id, created_at`,
            [id, session.user.id, content]
        );

        return NextResponse.json({
            id: result.rows[0].id,
            content,
            created_at: result.rows[0].created_at,
            author_id: session.user.id,
            author_name: session.user.name,
            author_avatar: session.user.image
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}