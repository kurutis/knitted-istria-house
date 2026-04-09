import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try{
        const client = await pool.connect()

        try{
            const result = await client.query(`SELECT COALESCE(p.category, 'other') as name, COUNT(*) as count, MIN(p.price) as min_price, MAX(p.price) as max_price, WHERE p.status = 'active' GROUP BY p.category ORDER BY count DESC`)

            const categories = result.rows.map(cat => ({...cat, icon: getCategoryIcon(cat.name)}))

            const total = categories.reduce((sum, cat) => sum + parseInt(cat.count), 0)

            return NextResponse.json({categories: [{name: 'all', count: total, icon: 'all', min_price: null, max_price: null}, ...categories]})
        }finally{
            client.release()
        }
    }catch(error){
        return NextResponse.json({error: 'Ошибка загрузки категорий'}, {status: 500})
    }
}

function getCategoryIcon (category: string): string{
    const icons: Record<string, string> = {'Свитера': '🧶', 'Шапки': '🧢', 'Шарфы': '🧣', 'Варежки': '🧤', 'Носки': '🧦', 'Пледы': '🛋️', 'Игрушки': '🧸', 'other': '📦'}
    return icons[category] || '📦'
}