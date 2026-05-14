import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                id,
                rating,
                comment,
                created_at,
                updated_at,
                author_id,
                users!inner (
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

        if (error) {
            console.error('Error fetching reviews:', error);
            return NextResponse.json({ error: 'Ошибка загрузки отзывов' }, { status: 500 });
        }

        const formattedReviews = reviews?.map(review => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            updated_at: review.updated_at,
            author_id: review.author_id,
            author_name: review.users?.[0]?.profiles?.[0]?.full_name || review.users?.[0]?.email,
            author_avatar: review.users?.[0]?.profiles?.[0]?.avatar_url
        })) || [];

        return NextResponse.json(formattedReviews, { status: 200 });
        
    } catch (error) {
        console.error('Error in reviews GET:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}