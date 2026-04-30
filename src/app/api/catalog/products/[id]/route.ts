import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Увеличиваем счетчик просмотров
        const { data: currentProduct } = await supabase
            .from('products')
            .select('views')
            .eq('id', id)
            .single();

        if (currentProduct) {
            await supabase
                .from('products')
                .update({ views: (currentProduct.views || 0) + 1 })
                .eq('id', id);
        }

        // Получаем товар с данными пользователя и изображениями
        const { data: product, error } = await supabase
            .from('products')
            .select(`
                *,
                users!products_master_id_fkey (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url,
                        city
                    )
                ),
                product_images (
                    id,
                    image_url,
                    sort_order
                ),
                product_yarn!left (
                    yarn_id,
                    is_custom,
                    yarn_catalog!inner (
                        id,
                        name,
                        article,
                        brand,
                        color,
                        composition
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
            }
            console.error('Error fetching product:', error);
            return NextResponse.json({ error: 'Ошибка загрузки товара' }, { status: 500 });
        }

        // Получаем отзывы отдельным запросом
        const { data: reviewsData } = await supabase
            .from('reviews')
            .select(`
                id,
                rating,
                comment,
                created_at,
                author_id,
                users!reviews_author_id_fkey (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                )
            `)
            .eq('target_type', 'product')
            .eq('target_id', id)
            .order('created_at', { ascending: false });

        // Получаем данные мастера
        let masterRating = 0;
        let totalSales = 0;
        let isVerified = false;
        let isPartner = false;
        let customOrdersEnabled = false;

        if (product.master_id) {
            const { data: masterData } = await supabase
                .from('masters')
                .select('rating, total_sales, is_verified, is_partner, custom_orders_enabled')
                .eq('user_id', product.master_id)
                .single();
            
            if (masterData) {
                masterRating = masterData.rating || 0;
                totalSales = masterData.total_sales || 0;
                isVerified = masterData.is_verified || false;
                isPartner = masterData.is_partner || false;
                customOrdersEnabled = masterData.custom_orders_enabled || false;
            }
        }

        // Форматируем отзывы
        const formattedReviews = (reviewsData || []).map((review: any) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            author_name: review.users?.profiles?.full_name || review.users?.email,
            author_avatar: review.users?.profiles?.avatar_url
        }));

        // Вычисляем рейтинг товара
        const reviewsCount = formattedReviews.length;
        const rating = reviewsCount > 0 
            ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount 
            : 0;

        // Форматируем ответ
        const formattedProduct = {
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            category: product.category,
            technique: product.technique,
            size: product.size,
            care_instructions: product.care_instructions,
            color: product.color,
            main_image_url: product.main_image_url,
            images: product.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
            master_id: product.master_id,
            master_name: product.users?.profiles?.full_name || product.users?.email,
            master_avatar: product.users?.profiles?.avatar_url,
            master_city: product.users?.profiles?.city,
            master_rating: masterRating,
            total_sales: totalSales,
            is_verified: isVerified,
            is_partner: isPartner,
            custom_orders_enabled: customOrdersEnabled,
            rating: parseFloat(rating.toFixed(2)),
            reviews_count: reviewsCount,
            reviews: formattedReviews,
            yarns: product.product_yarn?.map((py: any) => py.yarn_catalog).filter(Boolean) || [],
            views: product.views || 0,
            created_at: product.created_at,
            status: product.status
        };

        return NextResponse.json(formattedProduct);
        
    } catch (error) {
        console.error('Error fetching product:', error);
        return NextResponse.json({ error: 'Ошибка загрузки товара' }, { status: 500 });
    }
}