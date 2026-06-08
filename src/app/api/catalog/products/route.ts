import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function getAllSubcategoryNames(categoryId: number): Promise<string[]> {
    const { data: subcategories } = await supabase.from('categories').select('id, name').eq('parent_category_id', categoryId);

    if (!subcategories || subcategories.length === 0) {
        return [];
    }

    const subcategoryNames = subcategories.map(c => c.name);
    
    for (const sub of subcategories) {
        const deeperNames = await getAllSubcategoryNames(sub.id);
        subcategoryNames.push(...deeperNames);
    }

    return subcategoryNames;
}

async function getAllCategoryNamesIncludingSubcategories(categoryName: string): Promise<string[]> {
    const { data: category } = await supabase.from('categories').select('id, name').eq('name', categoryName).single();

    if (!category) {return [categoryName]}

    const subcategoryNames = await getAllSubcategoryNames(category.id);
    return [category.name, ...subcategoryNames];
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        const category = searchParams.get('category');
        const technique = searchParams.get('technique');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const search = searchParams.get('search');
        const sort = searchParams.get('sort') || 'newest';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');
        const offset = (page - 1) * limit;

        console.log('API /api/catalog/products called', { category, technique, minPrice, maxPrice, search, sort, page, limit });

        let productIds: string[] | null = null;
        
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            
            const { data: searchResults, error: searchError } = await supabase.from('products').select('id').eq('status', 'active').ilike('title', `%${searchTerm}%`);
            
            if (searchError) {
                console.error('Search error:', searchError);
            } else if (searchResults && searchResults.length > 0) {
                productIds = searchResults.map(p => p.id);
            } else {
                return NextResponse.json({products: [], pagination: {page, limit, total: 0, totalPages: 0, hasMore: false}})
            }
        }

        let query = supabase.from('products').select('*', { count: 'exact' }).eq('status', 'active');

        if (productIds) { query = query.in('id', productIds)}

        if (category && category !== 'all') {
            const categoryNames = await getAllCategoryNamesIncludingSubcategories(category);
            query = query.in('category', categoryNames);
        }

        if (technique && technique.trim() !== '') {
            query = query.eq('technique', technique);
        }

        if (minPrice && !isNaN(parseFloat(minPrice))) {
            query = query.gte('price', parseFloat(minPrice));
        }
        if (maxPrice && !isNaN(parseFloat(maxPrice))) {
            query = query.lte('price', parseFloat(maxPrice));
        }

        switch (sort) {
            case 'popular':
                query = query.order('views', { ascending: false });
                break;
            case 'newest':
                query = query.order('created_at', { ascending: false });
                break;
            case 'price_asc':
                query = query.order('price', { ascending: true });
                break;
            case 'price_desc':
                query = query.order('price', { ascending: false });
                break;
            case 'rating':
                query = query.order('rating', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        const { data: products, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const masterIds = [...new Set(products?.map(p => p.master_id) || [])];
        
        const mastersMap = new Map();
        if (masterIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', masterIds);
            
            profiles?.forEach(p => {mastersMap.set(p.user_id, {name: p.full_name, avatar: p.avatar_url})})
        }

        const formattedProducts = products?.map(p => ({id: p.id, title: p.title, description: p.description, price: p.price, main_image_url: p.main_image_url, master_id: p.master_id, master_name: mastersMap.get(p.master_id)?.name || 'Мастер', master_avatar: mastersMap.get(p.master_id)?.avatar, status: p.status, views: p.views || 0, created_at: p.created_at, category: p.category, technique: p.technique})) || [];

        return NextResponse.json({products: formattedProducts, pagination: {page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit), hasMore: offset + limit < (count || 0) }})
    
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}