import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET - получить список избранного
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Получаем избранные товары с данными о продуктах
        const { data: favorites, error } = await supabase
            .from('favorites')
            .select(`
                product_id,
                created_at,
                products!inner (
                    id,
                    title,
                    price,
                    main_image_url,
                    master_id,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name
                        )
                    )
                )
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching favorites:', error);
            return NextResponse.json({ error: 'Ошибка загрузки избранного' }, { status: 500 });
        }

        // Форматируем данные
        const formattedFavorites = favorites?.map(fav => ({
            id: fav.products?.id,
            title: fav.products?.title,
            price: fav.products?.price,
            main_image_url: fav.products?.main_image_url,
            master_name: fav.products?.users?.profiles?.full_name || fav.products?.users?.email,
            created_at: fav.created_at
        })) || []

        return NextResponse.json(formattedFavorites)
        
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return NextResponse.json({ error: 'Ошибка загрузки избранного' }, { status: 500 });
    }
}

// POST - добавить в избранное
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { productId } = await request.json();

        if (!productId) {
            return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
        }

        // Проверяем, есть ли уже в избранном
        const { data: existing, error: checkError } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking favorite:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки избранного' }, { status: 500 });
        }

        if (existing) {
            return NextResponse.json({ message: 'Уже в избранном' }, { status: 200 });
        }

        // Добавляем в избранное
        const { error: insertError } = await supabase
            .from('favorites')
            .insert({
                user_id: session.user.id,
                product_id: productId,
                created_at: new Date().toISOString()
            })

        if (insertError) {
            console.error('Error adding to favorites:', insertError);
            return NextResponse.json({ error: 'Ошибка добавления в избранное' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Добавлено в избранное' })
        
    } catch (error) {
        console.error('Error adding to favorites:', error);
        return NextResponse.json({ error: 'Ошибка добавления в избранное' }, { status: 500 });
    }
}

// DELETE - удалить из избранного
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
        }

        // Удаляем из избранного
        const { error: deleteError } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', session.user.id)
            .eq('product_id', productId)

        if (deleteError) {
            console.error('Error removing from favorites:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления из избранного' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Удалено из избранного' })
        
    } catch (error) {
        console.error('Error removing from favorites:', error);
        return NextResponse.json({ error: 'Ошибка удаления из избранного' }, { status: 500 });
    }
}