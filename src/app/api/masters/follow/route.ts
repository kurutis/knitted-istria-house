import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";

const postLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const deleteLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        

        const ip = getClientIP(request);
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for follow POST', { ip });
            return NextResponse.json({error: 'Слишком много запросов. Попробуйте через минуту.'}, { status: 429 });
        }

        const { masterId } = await request.json();

        if (!masterId) return NextResponse.json({ error: 'ID мастера обязателен' }, { status: 400 });
        

        if (!isValidUUID(masterId)) return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        

        if (masterId === session.user.id) return NextResponse.json({ error: 'Нельзя подписаться на самого себя' }, { status: 400 });
        

        const { data: master, error: masterError } = await supabase.from('users').select('id, email, role').eq('id', masterId).eq('role', 'master').maybeSingle();

        if (masterError || !master) {
            logInfo('Master not found for follow', { masterId });
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }

        const { data: masterProfile, error: profileError } = await supabase.from('masters').select('is_banned').eq('user_id', masterId).maybeSingle();

        if (profileError) logError('Error checking master ban status', profileError, 'warning');
        

        if (masterProfile?.is_banned) return NextResponse.json({ error: 'Невозможно подписаться на забаненного мастера' }, { status: 400 });
        

        const { data: existing, error: checkError } = await supabase.from('master_followers').select('id').eq('master_id', masterId).eq('follower_id', session.user.id).maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing follow', checkError);
            return NextResponse.json({ error: 'Ошибка проверки подписки' }, { status: 500 });
        }

        if (existing) return NextResponse.json({success: true, message: 'Вы уже подписаны на этого мастера', is_following: true, followers_count: null }, { status: 200 });
        

        const now = new Date().toISOString();

        const { error: insertError } = await supabase.from('master_followers').insert({master_id: masterId, follower_id: session.user.id, created_at: now});

        if (insertError) {
            logError('Error following master', insertError);
            return NextResponse.json({ error: 'Ошибка при подписке: ' + insertError.message }, { status: 500 });
        }

        const { count, error: countError } = await supabase.from('master_followers').select('id', { count: 'exact', head: true }).eq('master_id', masterId);

        if (countError) logError('Error counting followers', countError, 'warning');
        

        await supabase.from('notifications').insert({user_id: masterId, title: 'Новый подписчик', message: `${session.user.email || session.user.name} подписался на ваши обновления`, type: 'follow', metadata: {follower_id: session.user.id, followed_at: now}, created_at: now, is_read: false});

        invalidateCache(`follow_status_${masterId}_${session.user.id}`);
        invalidateCache(`follow_status_${masterId}_anon`);
        invalidateCache(`master_public_profile_${masterId}`);
        invalidateCache(`master_stats_${masterId}`);
        invalidateCache(`master_followers_${masterId}`);
        invalidateCache(new RegExp(`follow_status_${masterId}_.*`));

        logApiRequest('POST', '/api/masters/follow', 201, Date.now() - startTime, session.user.id);
        logInfo('User followed master', {masterId, followerId: session.user.id, totalFollowers: count || 0, duration: Date.now() - startTime});

        return NextResponse.json({success: true, message: 'Вы подписались на мастера', is_following: true, followers_count: count || 0}, { status: 201 });
        
    } catch (error) {
        logError('Error following master', error);
        return NextResponse.json({ error: 'Ошибка при подписке' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        

        const ip = getClientIP(request);
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for follow DELETE', { ip });
            return NextResponse.json({error: 'Слишком много запросов. Попробуйте через минуту.'}, { status: 429 });
        }

        const { masterId } = await request.json();

        if (!masterId) return NextResponse.json({ error: 'ID мастера обязателен' }, { status: 400 });
        

        if (!isValidUUID(masterId)) return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        

        const { data: existing, error: checkError } = await supabase.from('master_followers').select('id, created_at').eq('master_id', masterId).eq('follower_id', session.user.id).maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing follow', checkError);
            return NextResponse.json({ error: 'Ошибка проверки подписки' }, { status: 500 });
        }

        if (!existing) return NextResponse.json({success: true,  message: 'Вы не подписаны на этого мастера', is_following: false, followers_count: null}, { status: 200 });
        

        const { error: deleteError } = await supabase.from('master_followers').delete().eq('master_id', masterId).eq('follower_id', session.user.id);

        if (deleteError) {
            logError('Error unfollowing master', deleteError);
            return NextResponse.json({ error: 'Ошибка при отписке' }, { status: 500 });
        }

        const { count, error: countError } = await supabase.from('master_followers').select('id', { count: 'exact', head: true }).eq('master_id', masterId);

        if (countError) logError('Error counting followers after unfollow', countError, 'warning');
        

        invalidateCache(`follow_status_${masterId}_${session.user.id}`);
        invalidateCache(`follow_status_${masterId}_anon`);
        invalidateCache(`master_public_profile_${masterId}`);
        invalidateCache(`master_stats_${masterId}`);
        invalidateCache(`master_followers_${masterId}`);
        invalidateCache(new RegExp(`follow_status_${masterId}_.*`));

        logApiRequest('DELETE', '/api/masters/follow', 200, Date.now() - startTime, session.user.id);
        logInfo('User unfollowed master', {masterId, followerId: session.user.id, wasFollowingSince: existing.created_at, totalFollowers: count || 0, duration: Date.now() - startTime});

        return NextResponse.json({success: true, message: 'Вы отписались от мастера', is_following: false, followers_count: count || 0}, { status: 200 });
        
    } catch (error) {
        logError('Error unfollowing master', error);
        return NextResponse.json({ error: 'Ошибка при отписке' }, { status: 500 });
    }
}