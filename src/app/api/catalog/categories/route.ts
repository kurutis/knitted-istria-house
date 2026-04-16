import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
    let client;
    try {
        client = await pool.connect();
        
        const result = await client.query(`
            SELECT 
                c.id,
                c.name,
                c.description,
                c.parent_category_id,
                c.created_at,
                c.updated_at,
                COALESCE((
                    SELECT COUNT(*) 
                    FROM products p 
                    WHERE p.category = c.name AND p.status = 'active'
                ), 0) as products_count
            FROM categories c
            ORDER BY 
                CASE 
                    WHEN c.parent_category_id IS NULL THEN 0 
                    ELSE 1 
                END,
                c.name ASC
        `);

        // Строим дерево категорий (основные + подкатегории)
        const categoriesMap = new Map();
        const rootCategories: any[] = [];

        // Сначала создаем Map всех категорий
        result.rows.forEach((cat: any) => {
            categoriesMap.set(cat.id, {
                ...cat,
                subcategories: []
            });
        });

        // Затем формируем дерево
        result.rows.forEach((cat: any) => {
            if (cat.parent_category_id && categoriesMap.has(cat.parent_category_id)) {
                // Это подкатегория - добавляем к родителю
                const parent = categoriesMap.get(cat.parent_category_id);
                parent.subcategories.push(categoriesMap.get(cat.id));
            } else if (!cat.parent_category_id) {
                // Это основная категория
                rootCategories.push(categoriesMap.get(cat.id));
            }
        });

        return NextResponse.json({ categories: rootCategories }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ 
            categories: [],
            error: error.message 
        }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}