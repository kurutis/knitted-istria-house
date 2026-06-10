import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        

        const { master_id, order_id, rating, comment } = await request.json();

        if (!master_id || !rating || !comment) return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
        if (rating < 1 || rating > 5) return NextResponse.json({ error: 'Оценка должна быть от 1 до 5' }, { status: 400 });
        if (session.user.id === master_id) return NextResponse.json({ error: 'Нельзя оставить отзыв самому себе' }, { status: 400 });
        

        const { data: existingReview } = await supabase.from('reviews').select('id').eq('target_type', 'master').eq('target_id', master_id).eq('author_id', session.user.id).maybeSingle();

        if (existingReview) return NextResponse.json({ error: 'Вы уже оставляли отзыв этому мастеру' }, { status: 400 });
        

        const { data: masterProducts } = await supabase.from('products').select('id').eq('master_id', master_id);

        const productIds = masterProducts?.map(p => p.id) || [];

        if (productIds.length === 0) return NextResponse.json({ error: 'У мастера пока нет товаров' }, { status: 400 });
        

        let hasValidOrder = false;

        if (order_id) {
            const { data: order, error: orderError } = await supabase.from('orders').select('id, status').eq('id', order_id).eq('buyer_id', session.user.id).in('status', ['delivered', 'completed']).maybeSingle();

            if (!orderError && order) hasValidOrder = true;
            
        } else {
            const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('order_id').in('product_id', productIds).eq('orders.buyer_id', session.user.id).in('orders.status', ['delivered', 'completed']);

            if (!itemsError && orderItems && orderItems.length > 0) hasValidOrder = true;
            
        }

        if (!hasValidOrder) return NextResponse.json({ error: 'Вы можете оставить отзыв только после покупки' }, { status: 403 });
        

        const now = new Date().toISOString();
        
        const { data: review, error: reviewError } = await supabase.from('reviews').insert({target_type: 'master', target_id: master_id, author_id: session.user.id, rating: rating, comment: comment.trim(), created_at: now, updated_at: now}).select().single();

        if (reviewError) {
            console.error('Error creating review:', reviewError);
            return NextResponse.json({ error: 'Ошибка при создании отзыва' }, { status: 500 });
        }
        const { data: allReviews, error: allReviewsError } = await supabase.from('reviews').select('rating').eq('target_type', 'master').eq('target_id', master_id);

        if (!allReviewsError && allReviews && allReviews.length > 0) {
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            
            await supabase.from('profiles').update({ rating: Math.round(avgRating * 10) / 10 }).eq('user_id', master_id);
        }

        const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', session.user.id).single();

        return NextResponse.json({success: true, message: 'Отзыв успешно добавлен', review: {id: review.id, rating: review.rating, comment: review.comment, created_at: review.created_at,  author_name: profile?.full_name || session.user.name || session.user.email?.split('@')[0] || 'Пользователь', author_avatar: profile?.avatar_url || null } }, { status: 201 });
        
    } catch (error) {
        console.error('Error in review API:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}