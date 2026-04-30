import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        const category = searchParams.get('category')
        const technique = searchParams.get('technique')
        const minPrice = searchParams.get('minPrice')
        const maxPrice = searchParams.get('maxPrice')
        const search = searchParams.get('search')
        const sort = searchParams.get('sort') || 'newest'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '12')
        const offset = (page - 1) * limit

        // Начинаем строить запрос
        let query = supabase
            .from('products')
            .select(`
                id,
                title,
                description,
                price,
                status,
                category,
                technique,
                size,
                main_image_url,
                created_at,
                views,
                master_id,
                users!inner (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                ),
                product_images (
                    id,
                    image_url,
                    sort_order
                )
            `, { count: 'exact' })

        // Фильтры
        query = query.eq('status', 'active')
        
        if (category && category !== 'all') {
            query = query.eq('category', category)
        }

        if (technique) {
            query = query.eq('technique', technique)
        }

        if (minPrice) {
            query = query.gte('price', parseInt(minPrice))
        }

        if (maxPrice) {
            query = query.lte('price', parseInt(maxPrice))
        }

        if (search) {
            query = query.ilike('title', `%${search}%`)
        }

        // Сортировка
        switch (sort) {
            case 'price_asc':
                query = query.order('price', { ascending: true })
                break
            case 'price_desc':
                query = query.order('price', { ascending: false })
                break
            case 'popular':
                query = query.order('views', { ascending: false })
                break
            case 'newest':
            default:
                query = query.order('created_at', { ascending: false })
        }

        // Пагинация
        const { data: products, error, count } = await query
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('Error fetching products:', error);
            return NextResponse.json({ error: 'Ошибка загрузки каталога' }, { status: 500 });
        }

        // Форматируем товары
        const formattedProducts = products?.map(product => ({
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            technique: product.technique,
            size: product.size,
            main_image_url: product.main_image_url,
            created_at: product.created_at,
            master_id: product.master_id,
            master_name: product.users?.profiles?.full_name || product.users?.email,
            images: product.product_images?.sort((a, b) => a.sort_order - b.sort_order) || []
        })) || []

        return NextResponse.json({
            products: formattedProducts,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
                hasMore: offset + limit < (count || 0)
            }
        })
        
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: 'Ошибка загрузки каталога' }, { status: 500 });
    }
}