import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!isValidUUID(id)) {
            return NextResponse.json({ 
                error: 'Неверный формат ID мастера',
                is_following: false,
                followers_count: 0
            }, { status: 400 });
        }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                is_following: false,
                followers_count: 0
            }, { status: 429 });
        }

        const cacheKey = `follow_status_${id}_${session?.user?.id || 'anon'}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let isFollowing = false;
            
            if (session?.user) {
                const { data: follow } = await supabase
                    .from('master_followers')
                    .select('id')
                    .eq('master_id', id)
                    .eq('follower_id', session.user.id)
                    .maybeSingle();
                
                isFollowing = !!follow;
            }

            const { count } = await supabase
                .from('master_followers')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', id);

            return { 
                is_following: isFollowing,
                followers_count: count || 0
            };
        }, 30);

        return NextResponse.json({
            success: true,
            ...result
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in follow-status API', error);
        return NextResponse.json({ 
            is_following: false,
            followers_count: 0
        }, { status: 500 });
    }
}