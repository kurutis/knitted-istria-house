// app/api/catalog/products/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sort = searchParams.get('sort') || 'popular';
        const limit = parseInt(searchParams.get('limit') || '6');

        console.log('API /api/catalog/products called', { sort, limit });

        // Простой запрос
        let query = supabase
            .from('products')
            .select('*')
            .eq('status', 'active');

        if (sort === 'popular') {
            query = query.order('views', { ascending: false });
        } else if (sort === 'newest') {
            query = query.order('created_at', { ascending: false });
        }

        const { data: products, error } = await query.limit(limit);

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('Products found:', products?.length);

        // Получаем имена мастеров отдельно
        const masterIds = [...new Set(products?.map(p => p.master_id) || [])];
        
        const mastersMap = new Map();
        if (masterIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', masterIds);
            
            profiles?.forEach(p => {
                mastersMap.set(p.user_id, p.full_name);
            });
        }

        const formattedProducts = products?.map(p => ({
            id: p.id,
            title: p.title,
            price: p.price,
            main_image_url: p.main_image_url,
            master_name: mastersMap.get(p.master_id) || 'Мастер',
            views: p.views || 0,
            created_at: p.created_at
        })) || [];

        return NextResponse.json({ 
            products: formattedProducts, 
            pagination: { total: formattedProducts.length } 
        });
        
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}