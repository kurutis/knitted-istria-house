import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { masterId } = await request.json();

    if (!masterId) {
        return NextResponse.json({ error: 'ID мастера обязателен' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();
        
        await client.query(
            `INSERT INTO master_followers (master_id, follower_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [masterId, session.user.id]
        );
        
        const countResult = await client.query(
            `SELECT COUNT(*) as count FROM master_followers WHERE master_id = $1`,
            [masterId]
        );
        
        return NextResponse.json({ 
            is_following: true,
            followers_count: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Error following master:', error);
        return NextResponse.json({ error: 'Ошибка при подписке' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { masterId } = await request.json();

    if (!masterId) {
        return NextResponse.json({ error: 'ID мастера обязателен' }, { status: 400 });
    }

    let client;
    try {
        client = await pool.connect();
        
        await client.query(
            `DELETE FROM master_followers WHERE master_id = $1 AND follower_id = $2`,
            [masterId, session.user.id]
        );
        
        const countResult = await client.query(
            `SELECT COUNT(*) as count FROM master_followers WHERE master_id = $1`,
            [masterId]
        );
        
        return NextResponse.json({ 
            is_following: false,
            followers_count: parseInt(countResult.rows[0].count)
        });
    } catch (error) {
        console.error('Error unfollowing master:', error);
        return NextResponse.json({ error: 'Ошибка при отписке' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}