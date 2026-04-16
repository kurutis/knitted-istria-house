import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";


export async function GET(request: Request, {params}: {params: {id: string}}) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({error: 'Неавторизован'}, {status: 401})}

        const { id } = params

        client = await pool.connect()
        
        const result = await client.query(`SELECT * FROM yarn_catalog WHERE id = $1`, [id])

        if (result.rows.length === 0) {return NextResponse.json({error: 'Пряжа не найдена'}, {status: 404})}

        return NextResponse.json(result.rows[0], {status: 200})
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Ошибка загрузки пряжи' }, { status: 500 })
    } finally {
        if (client) client.release()
    }
}

export async function PUT(request: Request,{params}: {params: {id: string}}) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({error: 'Неавторизован'}, {status: 401})}

        const { id } = params
        const body = await request.json()

        client = await pool.connect()
        
        const result = await client.query(`UPDATE yarn_catalog SET name = COALESCE($1, name), article = COALESCE($2, article), brand = COALESCE($3, brand), color = COALESCE($4, color), composition = COALESCE($5, composition), weight_grams = COALESCE($6, weight_grams), length_meters = COALESCE($7, length_meters), price = COALESCE($8, price), in_stock = COALESCE($9, in_stock), stock_quantity = COALESCE($10, stock_quantity), image_url = COALESCE($11, image_url), description = COALESCE($12, description), updated_at = NOW() WHERE id = $13 RETURNING *`, [body.name, body.article, body.brand, body.color, body.composition, body.weight_grams, body.length_meters, body.price, body.in_stock, body.stock_quantity, body.image_url, body.description, id])

        if (result.rows.length === 0) {return NextResponse.json({error: 'Пряжа не найдена'}, {status: 404})}

        return NextResponse.json(result.rows[0], { status: 200 })
    } catch (error: any) {
        return NextResponse.json({error: error.message || 'Ошибка обновления пряжи'}, {status: 500})
    } finally {
        if (client) client.release()
    }
}

export async function DELETE(request: Request, {params}: {params: {id: string}}) {
    let client
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({error: 'Неавторизован'}, {status: 401})}

        const { id } = params

        client = await pool.connect()
        
        const checkResult = await client.query(`SELECT COUNT(*) as count FROM product_yarn WHERE yarn_id = $1`, [id])

        if (parseInt(checkResult.rows[0].count) > 0) {return NextResponse.json({error: 'Невозможно удалить пряжу, так как она используется в товарах'}, {status: 400})}

        await client.query(`DELETE FROM yarn_catalog WHERE id = $1`, [id])

        return NextResponse.json({message: 'Пряжа удалена'}, {status: 200})
    } catch (error: any) {
        return NextResponse.json({error: error.message || 'Ошибка удаления пряжи'}, {status: 500})
    } finally {
        if (client) client.release()
    }
}