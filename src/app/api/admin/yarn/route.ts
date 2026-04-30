import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// GET - получить всю пряжу
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Получаем всю пряжу с подсчетом использований
        const { data: yarn, error } = await supabase
            .from('yarn_catalog')
            .select(`
                *,
                product_yarn!left (
                    product_id
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: error.message || 'Ошибка загрузки пряжи' }, { status: 500 })
        }

        // Подсчитываем количество использований для каждой пряжи
        const formattedYarn = yarn?.map(item => ({
            ...item,
            used_in_products: item.product_yarn?.length || 0
        })) || []

        return NextResponse.json(formattedYarn, { status: 200 })
        
    } catch (error: any) {
        console.error('Error:', error)
        return NextResponse.json({ error: error.message || 'Ошибка загрузки пряжи' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { 
            name, 
            article, 
            brand, 
            color, 
            composition, 
            weight_grams, 
            length_meters, 
            price, 
            in_stock, 
            stock_quantity, 
            image_url, 
            description 
        } = body

        if (!name || !article) {
            return NextResponse.json({ error: 'Название и артикул обязательны' }, { status: 400 })
        }

        // Проверяем, существует ли пряжа с таким артикулом
        const { data: existing, error: checkError } = await supabase
            .from('yarn_catalog')
            .select('id')
            .eq('article', article)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing yarn:', checkError)
            return NextResponse.json({ error: 'Ошибка проверки пряжи' }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: 'Пряжа с таким артикулом уже существует' }, { status: 400 })
        }

        const now = new Date().toISOString()

        // Создаем новую пряжу
        const { data: newYarn, error: insertError } = await supabase
            .from('yarn_catalog')
            .insert({
                name,
                article,
                brand: brand || null,
                color: color || null,
                composition: composition || null,
                weight_grams: weight_grams || null,
                length_meters: length_meters || null,
                price: price || null,
                in_stock: in_stock ?? true,
                stock_quantity: stock_quantity ?? 0,
                image_url: image_url || null,
                description: description || null,
                created_at: now,
                updated_at: now
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating yarn:', insertError)
            return NextResponse.json({ error: insertError.message || 'Ошибка создания пряжи' }, { status: 500 })
        }

        return NextResponse.json(newYarn, { status: 201 })
        
    } catch (error: any) {
        console.error('Error:', error)
        return NextResponse.json({ error: error.message || 'Ошибка создания пряжи' }, { status: 500 })
    }
}