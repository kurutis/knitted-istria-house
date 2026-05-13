// app/api/admin/yarn/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Простой запрос - получаем все записи
        const { data: yarn, error } = await supabase
            .from('yarn_catalog')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Ошибка загрузки пряжи' }, { status: 500 });
        }

        // Форматируем данные
        const formattedYarn = yarn?.map(item => ({
            id: item.id,
            name: item.name || '',
            article: item.article || '',
            brand: item.brand || '',
            color: item.color || '',
            composition: item.composition || '',
            weight_grams: item.weight_grams,
            length_meters: item.length_meters,
            price: parseFloat(item.price || 0),
            in_stock: item.in_stock ?? true,
            stock_quantity: item.stock_quantity || 0,
            image_url: item.image_url || '',
            description: item.description || '',
            used_in_products: 0,
            created_at: item.created_at,
            updated_at: item.updated_at
        })) || [];

        return NextResponse.json(formattedYarn, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching yarn:', error);
        return NextResponse.json({ error: 'Ошибка загрузки пряжи' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();

        // Проверяем, существует ли пряжа с таким артикулом
        const { data: existing } = await supabase
            .from('yarn_catalog')
            .select('id')
            .eq('article', body.article)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Пряжа с таким артикулом уже существует' }, { status: 400 });
        }

        const now = new Date().toISOString();

        const { data: newYarn, error: insertError } = await supabase
            .from('yarn_catalog')
            .insert({
                name: body.name,
                article: body.article,
                brand: body.brand || null,
                color: body.color || null,
                composition: body.composition || null,
                weight_grams: body.weight_grams ? parseFloat(body.weight_grams) : null,
                length_meters: body.length_meters ? parseFloat(body.length_meters) : null,
                price: body.price ? parseFloat(body.price) : null,
                in_stock: body.in_stock ?? true,
                stock_quantity: body.stock_quantity ? parseInt(body.stock_quantity) : 0,
                image_url: body.image_url || null,
                description: body.description || null,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating yarn:', insertError);
            return NextResponse.json({ error: 'Ошибка создания пряжи' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Пряжа успешно создана',
            yarn: newYarn
        }, { status: 201 });
        
    } catch (error) {
        console.error('Error in POST:', error);
        return NextResponse.json({ error: 'Ошибка создания пряжи' }, { status: 500 });
    }
}