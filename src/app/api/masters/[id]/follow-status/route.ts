import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
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

        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                is_following: false,
                followers_count: 0
            }, { status: 429 });
        }

        let isFollowing = false;
        
        // Проверяем подписку только если пользователь авторизован
        if (session?.user) {
            console.log('Checking follow status for user:', session.user.id, 'master:', id);
            
            const { data: follow, error: followError } = await supabase
                .from('master_followers')
                .select('id, created_at')
                .eq('master_id', id)
                .eq('follower_id', session.user.id)
                .maybeSingle();

            if (followError) {
                logError('Error checking follow status', followError, 'warning');
            }
            
            isFollowing = !!follow;
            console.log('Follow status result:', isFollowing);
        }

        // Получаем общее количество подписчиков
        const { count, error: countError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', id);

        if (countError) {
            logError('Error counting followers', countError, 'warning');
        }

        logApiRequest('GET', `/api/masters/${id}/follow-status`, 200, Date.now() - startTime, session?.user?.id);

        return NextResponse.json({
            success: true,
            is_following: isFollowing,
            followers_count: count || 0
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in follow-status API', error);
        return NextResponse.json({ 
            is_following: false,
            followers_count: 0
        }, { status: 500 });
    }
}