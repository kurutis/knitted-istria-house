import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { data: yarns, error } = await supabase
            .from('yarn_catalog')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching yarn catalog:', error);
            return NextResponse.json({ error: 'Ошибка загрузки каталога пряжи' }, { status: 500 })
        }

        return NextResponse.json(yarns || [], { status: 200 })
        
    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Ошибка загрузки каталога пряжи' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { name, article, brand, color, composition, weight_grams, length_meters, price, in_stock, stock_quantity, image_url, description } = body

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
            console.error('Error checking existing yarn:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки пряжи' }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: 'Пряжа с таким артикулом уже существует' }, { status: 400 })
        }

        const now = new Date().toISOString()

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
            console.error('Error creating yarn:', insertError);
            return NextResponse.json({ error: 'Ошибка добавления пряжи' }, { status: 500 })
        }

        return NextResponse.json(newYarn, { status: 201 })
        
    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Ошибка добавления пряжи' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'ID пряжи обязателен' }, { status: 400 })
        }

        // Добавляем updated_at
        updates.updated_at = new Date().toISOString()

        const { data: updatedYarn, error } = await supabase
            .from('yarn_catalog')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 })
            }
            console.error('Error updating yarn:', error);
            return NextResponse.json({ error: 'Ошибка обновления пряжи' }, { status: 500 })
        }

        return NextResponse.json(updatedYarn, { status: 200 })
        
    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Ошибка обновления пряжи' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID пряжи обязателен' }, { status: 400 })
        }

        // Проверяем, используется ли пряжа в товарах
        const { count, error: checkError } = await supabase
            .from('product_yarn')
            .select('id', { count: 'exact', head: true })
            .eq('yarn_id', id)

        if (checkError) {
            console.error('Error checking product_yarn:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки использования пряжи' }, { status: 500 })
        }

        if (count && count > 0) {
            return NextResponse.json({ 
                error: 'Невозможно удалить пряжу, так как она используется в товарах' 
            }, { status: 400 })
        }

        // Удаляем пряжу
        const { error: deleteError } = await supabase
            .from('yarn_catalog')
            .delete()
            .eq('id', id)

        if (deleteError) {
            if (deleteError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 })
            }
            console.error('Error deleting yarn:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления пряжи' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Пряжа удалена' }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Ошибка удаления пряжи' }, { status: 500 })
    }
}