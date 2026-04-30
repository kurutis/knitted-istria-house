import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        // Получаем все категории
        const { data: categories, error } = await supabase
            .from('categories')
            .select('id, name, description, parent_category_id, icon_url')
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching categories:', error);
            return NextResponse.json({ categories: [], error: error.message }, { status: 500 });
        }

        // Получаем количество товаров для каждой категории
        const { data: products } = await supabase
            .from('products')
            .select('category')
            .eq('status', 'active')

        const countMap = new Map()
        products?.forEach(p => {
            countMap.set(p.category, (countMap.get(p.category) || 0) + 1)
        })

        // Строим дерево категорий
        const categoriesMap = new Map()
        const rootCategories: any[] = []

        // Сначала создаем Map всех категорий
        categories?.forEach(cat => {
            categoriesMap.set(cat.id, {
                ...cat,
                products_count: countMap.get(cat.name) || 0,
                subcategories: []
            })
        })

        // Затем формируем дерево
        categories?.forEach(cat => {
            if (cat.parent_category_id && categoriesMap.has(cat.parent_category_id)) {
                const parent = categoriesMap.get(cat.parent_category_id)
                parent.subcategories.push(categoriesMap.get(cat.id))
            } else if (!cat.parent_category_id) {
                rootCategories.push(categoriesMap.get(cat.id))
            }
        })

        return NextResponse.json({ categories: rootCategories }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ categories: [], error: error.message }, { status: 500 });
    }
}