import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select(`
                id,
                rating,
                comment,
                created_at,
                users!inner (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                )
            `)
            .eq('target_type', 'master')
            .eq('target_id', id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching master reviews:', error);
            return NextResponse.json([], { status: 500 });
        }

        // Форматируем данные
        const formattedReviews = reviews?.map(review => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            author_name: review.users?.profiles?.full_name || review.users?.email,
            author_avatar: review.users?.profiles?.avatar_url
        })) || []

        return NextResponse.json(formattedReviews)
        
    } catch (error) {
        console.error('Error fetching master reviews:', error);
        return NextResponse.json([], { status: 500 });
    }
}