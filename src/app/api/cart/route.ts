import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET - получить корзину пользователя
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    try {
        // Получаем товары из корзины с данными о продуктах
        const { data: cartItems, error } = await supabase
            .from('cart')
            .select(`
                product_id,
                quantity,
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
            console.error('Error fetching cart:', error);
            return NextResponse.json({ 
                items: [], 
                totalCount: 0, 
                totalAmount: 0,
                error: 'Ошибка загрузки корзины' 
            }, { status: 500 });
        }

        // Форматируем данные
        const items = cartItems?.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            title: item.products?.title,
            price: item.products?.price,
            main_image_url: item.products?.main_image_url,
            master_name: item.products?.users?.profiles?.full_name || item.products?.users?.email,
            final_price: item.products?.price
        })) || [];

        // Подсчет итогов
        const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = items.reduce((sum, item) => sum + (item.final_price * item.quantity), 0);

        return NextResponse.json({
            items: items,
            totalCount: totalCount,
            totalAmount: totalAmount
        });
        
    } catch (error) {
        console.error('Error fetching cart:', error);
        return NextResponse.json({ 
            items: [], 
            totalCount: 0, 
            totalAmount: 0,
            error: 'Ошибка загрузки корзины' 
        }, { status: 500 });
    }
}

// POST - добавить товар в корзину
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
        return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
    }

    try {
        // Проверяем, есть ли уже товар в корзине
        const { data: existingItem, error: checkError } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking cart:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки корзины' }, { status: 500 });
        }

        const now = new Date().toISOString()

        if (existingItem) {
            // Обновляем количество
            const { error: updateError } = await supabase
                .from('cart')
                .update({
                    quantity: existingItem.quantity + quantity,
                    updated_at: now
                })
                .eq('user_id', session.user.id)
                .eq('product_id', productId)

            if (updateError) {
                console.error('Error updating cart:', updateError);
                return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
            }
        } else {
            // Добавляем новый товар
            const { error: insertError } = await supabase
                .from('cart')
                .insert({
                    user_id: session.user.id,
                    product_id: productId,
                    quantity: quantity,
                    created_at: now,
                    updated_at: now
                })

            if (insertError) {
                console.error('Error inserting into cart:', insertError);
                return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
            }
        }

        // Получаем общее количество товаров в корзине
        const { data: cartCount, error: countError } = await supabase
            .from('cart')
            .select('quantity', { count: 'exact', head: false })
            .eq('user_id', session.user.id)

        if (countError) {
            console.error('Error getting cart count:', countError);
        }

        const totalCount = cartCount?.reduce((sum, item) => sum + item.quantity, 0) || 0

        return NextResponse.json({
            success: true,
            cartCount: totalCount,
            message: 'Товар добавлен в корзину'
        });
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
    }
}

// DELETE - удалить товар из корзины
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
        return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
    }

    try {
        const { error: deleteError } = await supabase
            .from('cart')
            .delete()
            .eq('user_id', session.user.id)
            .eq('product_id', productId)

        if (deleteError) {
            console.error('Error deleting from cart:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Товар удален из корзины' });
        
    } catch (error) {
        console.error('Error removing from cart:', error);
        return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
    }
}