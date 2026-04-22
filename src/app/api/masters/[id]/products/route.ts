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
                p.id,
                p.title,
                p.price,
                p.main_image_url,
                p.created_at,
                p.views
            FROM products p
            WHERE p.master_id = $1 AND p.status = 'active'
            ORDER BY p.created_at DESC
        `, [id]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching master products:', error);
        return NextResponse.json([], { status: 500 });
    } finally {
        if (client) client.release();
    }
}