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

        // Получаем товары
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
                master_id
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

        // Получаем имена мастеров отдельно (чтобы избежать сложных связей)
        const masterIds = [...new Set(products?.map(p => p.master_id) || [])]
        let mastersMap = new Map()
        
        if (masterIds.length > 0) {
            const { data: masters } = await supabase
                .from('users')
                .select('id, email, profiles!left (full_name)')
                .in('id', masterIds)
            
            masters?.forEach(m => {
                mastersMap.set(m.id, m.profiles?.full_name || m.email)
            })
        }

        // Форматируем товары
        const formattedProducts = products?.map(product => ({
            ...product,
            master_name: mastersMap.get(product.master_id) || '',
            images: []
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