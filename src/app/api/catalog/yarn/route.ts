import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
    let client;
    try {
        client = await pool.connect();
        
        const result = await client.query(`
            SELECT 
                id, 
                name, 
                article, 
                brand, 
                color, 
                in_stock,
                price
            FROM yarn_catalog
            WHERE in_stock = true
            ORDER BY name ASC
        `);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching yarn:', error);
        return NextResponse.json({ error: error.message || 'Ошибка загрузки пряжи' }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}