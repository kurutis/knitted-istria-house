import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET - получить всю пряжу
export async function GET() {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({error: 'Неавторизован'}, {status: 401})}

        client = await pool.connect()
        
        const result = await client.query(`SELECT yc.*, COUNT(DISTINCT py.product_id) as used_in_products  FROM yarn_catalog yc LEFT JOIN product_yarn py ON yc.id = py.yarn_id GROUP BY yc.id ORDER BY yc.created_at DESC`)

        return NextResponse.json(result.rows, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({error: error.message || 'Ошибка загрузки пряжи'}, {status: 500})
    } finally {
        if (client) client.release()
    }
}

export async function POST(request: Request) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({error: 'Неавторизован'}, {status: 401})}

        const body = await request.json()
        const {name, article, brand, color, composition, weight_grams, length_meters, price, in_stock, stock_quantity, image_url, description} = body

        if (!name || !article) {return NextResponse.json({error: 'Название и артикул обязательны'}, {status: 400})}

        client = await pool.connect()
        
        const result = await client.query(`INSERT INTO yarn_catalog (name, article, brand, color, composition, weight_grams, length_meters, price, in_stock, stock_quantity, image_url, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) RETURNING *`, [name, article, brand, color, composition, weight_grams, length_meters, price, in_stock ?? true, stock_quantity ?? 0, image_url, description])

        return NextResponse.json(result.rows[0], { status: 201 })
    } catch (error: any) {
        return NextResponse.json({error: error.message ||'Ошибка создания пряжи'}, {status: 500})
    } finally {
        if (client) client.release()
    }
}