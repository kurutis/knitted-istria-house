import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Получаем все активные товары для подсчета по категориям
        const { data: products, error } = await supabase
            .from('products')
            .select('category')
            .eq('status', 'active')

        if (error) {
            console.error('Error fetching products:', error);
            return NextResponse.json({ error: 'Ошибка загрузки категорий' }, { status: 500 });
        }

        // Подсчитываем количество товаров по категориям
        const categoryMap = new Map<string, { count: number; min_price: number | null; max_price: number | null }>()
        
        products?.forEach(product => {
            const cat = product.category || 'other'
            const existing = categoryMap.get(cat) || { count: 0, min_price: null, max_price: null }
            
            categoryMap.set(cat, {
                count: existing.count + 1,
                min_price: existing.min_price,
                max_price: existing.max_price
            })
        })

        // Формируем массив категорий
        const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
            name,
            count: data.count,
            min_price: data.min_price,
            max_price: data.max_price,
            icon: getCategoryIcon(name)
        }))

        const total = categories.reduce((sum, cat) => sum + cat.count, 0)

        return NextResponse.json({
            categories: [
                { name: 'all', count: total, icon: 'all', min_price: null, max_price: null },
                ...categories
            ]
        })
        
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Ошибка загрузки категорий' }, { status: 500 });
    }
}

function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
        'Свитера': '🧶',
        'Шапки': '🧢',
        'Шарфы': '🧣',
        'Варежки': '🧤',
        'Носки': '🧦',
        'Пледы': '🛋️',
        'Игрушки': '🧸',
        'other': '📦'
    }
    return icons[category] || '📦'
}