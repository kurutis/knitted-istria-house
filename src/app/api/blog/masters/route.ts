import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    const session = await getServerSession(authOptions);
    
    try {
        let following: any[] = []
        
        // Если пользователь авторизован, получаем мастеров на которых он подписан
        if (session?.user) {
            // Сначала получаем ID мастеров, на которых подписан пользователь
            const { data: followingIds, error: followError } = await supabase
                .from('master_followers')
                .select('master_id')
                .eq('follower_id', session.user.id)
                .limit(10)

            if (!followError && followingIds && followingIds.length > 0) {
                const masterIds = followingIds.map(f => f.master_id)
                
                // Получаем данные мастеров
                const { data: mastersData, error: mastersError } = await supabase
                    .from('users')
                    .select(`
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url,
                            city
                        )
                    `)
                    .in('id', masterIds)
                    .eq('role', 'master')

                if (!mastersError && mastersData) {
                    following = mastersData.map(user => ({
                        id: user.id,
                        name: user.profiles?.full_name || user.email,
                        avatar_url: user.profiles?.avatar_url,
                        city: user.profiles?.city,
                        products_count: 0,
                        posts_count: 0,
                        is_following: true
                    }))
                }
            }
        }

        // Получаем рекомендуемых мастеров (последние зарегистрированные)
        const { data: recommendedData, error: recommendedError } = await supabase
            .from('users')
            .select(`
                id,
                email,
                profiles!left (
                    full_name,
                    avatar_url,
                    city
                )
            `)
            .eq('role', 'master')
            .order('created_at', { ascending: false })
            .limit(10)

        if (recommendedError) {
            console.error('Error fetching recommended masters:', recommendedError);
            return NextResponse.json({ following: [], recommended: [] });
        }

        // Получаем ID мастеров, на которых подписан пользователь (для проверки is_following)
        let followingSet = new Set()
        if (session?.user?.id) {
            const { data: followingIds } = await supabase
                .from('master_followers')
                .select('master_id')
                .eq('follower_id', session.user.id)

            if (followingIds) {
                followingSet = new Set(followingIds.map(f => f.master_id))
            }
        }

        const recommended = recommendedData?.map(user => ({
            id: user.id,
            name: user.profiles?.full_name || user.email,
            avatar_url: user.profiles?.avatar_url,
            city: user.profiles?.city,
            products_count: 0,
            posts_count: 0,
            is_following: followingSet.has(user.id)
        })) || []

        return NextResponse.json({ following, recommended })
        
    } catch (error) {
        console.error('Error fetching masters:', error);
        return NextResponse.json({ following: [], recommended: [] }, { status: 500 });
    }
}