import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
        return NextResponse.json({ is_following: false, followers_count: 0 });
    }

    try {
        // Проверяем, подписан ли пользователь
        const { data: follow, error: followError } = await supabase
            .from('master_followers')
            .select('id')
            .eq('master_id', id)
            .eq('follower_id', session.user.id)
            .maybeSingle()

        if (followError && followError.code !== 'PGRST116') {
            console.error('Error checking follow status:', followError);
        }

        // Получаем количество подписчиков
        const { count, error: countError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', id)

        if (countError) {
            console.error('Error counting followers:', countError);
        }

        return NextResponse.json({ 
            is_following: !!follow,
            followers_count: count || 0
        })
        
    } catch (error) {
        console.error('Error checking follow status:', error);
        return NextResponse.json({ is_following: false, followers_count: 0 });
    }
}