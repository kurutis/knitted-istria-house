// app/api/master/follow/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const postLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 подписок в минуту
const deleteLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 отписок в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { masterId } = await request.json();

        if (!masterId) {
            return NextResponse.json({ error: 'ID мастера обязателен' }, { status: 400 });
        }

        if (!isValidUUID(masterId)) {
            return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        }

        // Нельзя подписаться на самого себя
        if (masterId === session.user.id) {
            return NextResponse.json({ error: 'Нельзя подписаться на самого себя' }, { status: 400 });
        }

        // Проверяем, существует ли мастер
        const { data: master, error: masterError } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', masterId)
            .eq('role', 'master')
            .maybeSingle();

        if (masterError || !master) {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }

        // Проверяем, не забанен ли мастер
        const { data: masterProfile, error: profileError } = await supabase
            .from('masters')
            .select('is_banned')
            .eq('user_id', masterId)
            .maybeSingle();

        if (profileError) {
            logError('Error checking master ban status', profileError, 'warning');
        }

        if (masterProfile?.is_banned) {
            return NextResponse.json({ error: 'Невозможно подписаться на забаненного мастера' }, { status: 400 });
        }

        // Добавляем подписку
        const now = new Date().toISOString();
        const { error: insertError } = await supabase
            .from('master_followers')
            .insert({
                master_id: masterId,
                follower_id: session.user.id,
                created_at: now
            });

        let isNewFollow = true;
        
        if (insertError) {
            if (insertError.code === '23505') { // unique violation - уже подписан
                isNewFollow = false;
            } else {
                logError('Error following master', insertError);
                return NextResponse.json({ error: 'Ошибка при подписке' }, { status: 500 });
            }
        }

        // Получаем обновленное количество подписчиков
        const { count, error: countError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', masterId);

        if (countError) {
            logError('Error counting followers', countError, 'warning');
        }

        // Создаем уведомление для мастера (только при новой подписке)
        if (isNewFollow) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: masterId,
                    title: 'Новый подписчик',
                    message: `${session.user.email || session.user.name} подписался на ваши обновления`,
                    type: 'follow',
                    metadata: { 
                        follower_id: session.user.id,
                        followed_at: now
                    },
                    created_at: now,
                    is_read: false
                });
        }

        // Инвалидируем кэши
        invalidateCache(`follow_status_${masterId}_${session.user.id}`);
        invalidateCache(`master_public_profile_${masterId}`);
        invalidateCache(`master_stats_${masterId}`);
        invalidateCache(`master_followers_${masterId}`);

        logInfo('User followed master', {
            masterId,
            followerId: session.user.id,
            isNewFollow,
            totalFollowers: count || 0,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true,
            message: isNewFollow ? 'Вы подписались на мастера' : 'Вы уже подписаны на этого мастера',
            is_following: true,
            followers_count: count || 0,
            is_new: isNewFollow
        }, { status: isNewFollow ? 201 : 200 });
        
    } catch (error) {
        logError('Error following master', error);
        return NextResponse.json({ error: 'Ошибка при подписке' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { masterId } = await request.json();

        if (!masterId) {
            return NextResponse.json({ error: 'ID мастера обязателен' }, { status: 400 });
        }

        if (!isValidUUID(masterId)) {
            return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        }

        // Проверяем, существует ли подписка
        const { data: existing, error: checkError } = await supabase
            .from('master_followers')
            .select('id, created_at')
            .eq('master_id', masterId)
            .eq('follower_id', session.user.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing follow', checkError);
            return NextResponse.json({ error: 'Ошибка проверки подписки' }, { status: 500 });
        }

        if (!existing) {
            return NextResponse.json({ 
                error: 'Вы не подписаны на этого мастера',
                is_following: false,
                followers_count: null
            }, { status: 400 });
        }

        // Удаляем подписку
        const { error: deleteError } = await supabase
            .from('master_followers')
            .delete()
            .eq('master_id', masterId)
            .eq('follower_id', session.user.id);

        if (deleteError) {
            logError('Error unfollowing master', deleteError);
            return NextResponse.json({ error: 'Ошибка при отписке' }, { status: 500 });
        }

        // Получаем обновленное количество подписчиков
        const { count, error: countError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', masterId);

        if (countError) {
            logError('Error counting followers after unfollow', countError, 'warning');
        }

        // Инвалидируем кэши
        invalidateCache(`follow_status_${masterId}_${session.user.id}`);
        invalidateCache(`master_public_profile_${masterId}`);
        invalidateCache(`master_stats_${masterId}`);
        invalidateCache(`master_followers_${masterId}`);

        logInfo('User unfollowed master', {
            masterId,
            followerId: session.user.id,
            wasFollowingSince: existing.created_at,
            totalFollowers: count || 0,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true,
            message: 'Вы отписались от мастера',
            is_following: false,
            followers_count: count || 0
        }, { status: 200 });
        
    } catch (error) {
        logError('Error unfollowing master', error);
        return NextResponse.json({ error: 'Ошибка при отписке' }, { status: 500 });
    }
}