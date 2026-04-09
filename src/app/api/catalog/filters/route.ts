import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try{
        const client = await pool.connect()
        try{
            const [techniques, priceRange] = await Promise.all([client.query(`SELECT technique, COUNT(*) as count FROM products WHERE status = 'active' AND technique IS NOT NULL GROUP BY technique ORDER BY count DESC`), client.query(`SELECT MIN(price) as min, MAX(price) as max FROM products WHERE status = 'active'`)])

            const min = priceRange.rows[0]?.min || 0
            const max = priceRange.rows[0]?.max || 100000
            return NextResponse.json({techniques: techniques.rows, priceRange: {min: Math.floor(min / 100) * 100, max: Math.ceil(max / 1000) * 1000}, sortOptions: [{value: 'newest', label: 'Сначала новые'}, { value: 'popular', label: 'Популярные' }, { value: 'price_asc', label: 'Сначала дешевле' }, { value: 'price_desc', label: 'Сначала дороже' }, { value: 'rating', label: 'По рейтингу'}]})
        }finally{
            client.release()
        }
    }catch(error){
        return NextResponse.json({error: 'Ошибка загрузки фильтров'}, {status: 500})
    }
}