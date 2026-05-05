import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";

interface Master {
    id: string;
    name: string;
    avatar_url: string | null;
    city: string | null;
    products_count: number;
    posts_count: number;
    is_following: boolean;
}

const limiter = rateLimit({ limit: 100, windowMs: 60 * 1000 });

export async function GET(request: Request) {
    try {
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        
        let following: Master[] = [];
        
        // Получаем мастеров, на которых подписан пользователь
        if (session?.user) {
            const { data: followingIds, error: followError } = await supabase
                .from('master_followers')
                .select('master_id')
                .eq('follower_id', session.user.id)
                .limit(10);

            if (!followError && followingIds && followingIds.length > 0) {
                const masterIds = followingIds.map(f => f.master_id);
                
                // Получаем данные мастеров из profiles
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('user_id, full_name, avatar_url, city')
                    .in('user_id', masterIds);

                if (!profilesError && profilesData) {
                    following = profilesData.map(profile => ({
                        id: profile.user_id,
                        name: profile.full_name || 'Мастер',
                        avatar_url: profile.avatar_url,
                        city: profile.city || '',
                        products_count: 0,
                        posts_count: 0,
                        is_following: true
                    }));
                }
            }
        }

        // Получаем рекомендуемых мастеров из profiles
        const { data: recommendedData, error: recommendedError } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, city')
            .limit(10);

        if (recommendedError) {
            console.error('Error fetching recommended masters:', recommendedError);
            return NextResponse.json({ following: [], recommended: [] });
        }

        // Получаем ID мастеров, на которых подписан пользователь
        let followingSet = new Set<string>();
        if (session?.user?.id) {
            const { data: followingIds } = await supabase
                .from('master_followers')
                .select('master_id')
                .eq('follower_id', session.user.id);

            if (followingIds) {
                followingSet = new Set(followingIds.map(f => f.master_id));
            }
        }

        const recommended: Master[] = recommendedData?.map(profile => ({
            id: profile.user_id,
            name: profile.full_name || 'Мастер',
            avatar_url: profile.avatar_url,
            city: profile.city || '',
            products_count: 0,
            posts_count: 0,
            is_following: followingSet.has(profile.user_id)
        })) || [];

        return NextResponse.json({ 
            following, 
            recommended
        }, {
            status: 200,
            headers: { 'Cache-Control': 'public, max-age=300' }
        });
        
    } catch (error) {
        console.error('Error fetching masters:', error);
        return NextResponse.json({ following: [], recommended: [] }, { status: 500 });
    }
}