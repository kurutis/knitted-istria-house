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
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        
        let following: Master[] = [];
        
        // Получаем мастеров, на которых подписан пользователь (только мастера)
        if (session?.user) {
            const { data: followingIds, error: followError } = await supabase
                .from('master_followers')
                .select('master_id')
                .eq('follower_id', session.user.id)
                .limit(10);

            if (!followError && followingIds && followingIds.length > 0) {
                const masterIds = followingIds.map(f => f.master_id);
                
                // Получаем данные только мастеров
                const { data: mastersData, error: mastersError } = await supabase
                    .from('users')
                    .select(`
                        id,
                        email,
                        full_name,
                        avatar_url,
                        city
                    `)
                    .in('id', masterIds)
                    .eq('role', 'master');

                if (!mastersError && mastersData) {
                    following = mastersData.map(user => ({
                        id: user.id,
                        name: user.full_name || user.email?.split('@')[0] || 'Мастер',
                        avatar_url: user.avatar_url,
                        city: user.city || '',
                        products_count: 0,
                        posts_count: 0,
                        is_following: true
                    }));
                }
            }
        }

        // Получаем рекомендуемых мастеров (только мастера)
        const { data: recommendedData, error: recommendedError } = await supabase
            .from('users')
            .select(`
                id,
                email,
                full_name,
                avatar_url,
                city
            `)
            .eq('role', 'master')
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

        const recommended: Master[] = recommendedData?.map(user => ({
            id: user.id,
            name: user.full_name || user.email?.split('@')[0] || 'Мастер',
            avatar_url: user.avatar_url,
            city: user.city || '',
            products_count: 0,
            posts_count: 0,
            is_following: followingSet.has(user.id)
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