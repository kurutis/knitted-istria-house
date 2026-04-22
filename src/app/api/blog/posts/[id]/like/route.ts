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

    let client;
    try {
        client = await pool.connect();

        await client.query(
            `INSERT INTO blog_likes (post_id, user_id, created_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (post_id, user_id) DO NOTHING`,
            [id, session.user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error liking post:', error);
        return NextResponse.json({ error: 'Failed to like post' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let client;
    try {
        client = await pool.connect();

        await client.query(
            `DELETE FROM blog_likes WHERE post_id = $1 AND user_id = $2`,
            [id, session.user.id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error unliking post:', error);
        return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}