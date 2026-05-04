// app/api/master/[id]/follow/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// GET - проверить статус подписки
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        // Валидация ID мастера
        if (!isValidUUID(id)) {
            return NextResponse.json({ 
                error: 'Неверный формат ID мастера',
                is_following: false, 
                followers_count: 0 
            }, { status: 400 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                is_following: false, 
                followers_count: 0 
            }, { status: 429 });
        }

        // Проверяем, существует ли мастер
        const { data: masterExists, error: masterError } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .eq('role', 'master')
            .maybeSingle();

        if (masterError || !masterExists) {
            return NextResponse.json({ 
                error: 'Мастер не найден',
                is_following: false, 
                followers_count: 0 
            }, { status: 404 });
        }

        // Кэшируем результат
        const cacheKey = `follow_status_${id}_${session?.user?.id || 'anon'}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Проверяем, подписан ли пользователь
            let isFollowing = false;
            if (session?.user) {
                const { data: follow, error: followError } = await supabase
                    .from('master_followers')
                    .select('id, created_at')
                    .eq('master_id', id)
                    .eq('follower_id', session.user.id)
                    .maybeSingle();

                if (followError && followError.code !== 'PGRST116') {
                    logError('Error checking follow status', followError, 'warning');
                }
                
                isFollowing = !!follow;
            }

            // Получаем количество подписчиков
            const { count, error: countError } = await supabase
                .from('master_followers')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', id);

            if (countError) {
                logError('Error counting followers', countError, 'warning');
            }

            return { 
                is_following: isFollowing,
                followers_count: count || 0
            };
        });

        logInfo('Follow status checked', {
            masterId: id,
            userId: session?.user?.id || 'anonymous',
            isFollowing: result.is_following,
            followersCount: result.followers_count,
            duration: Date.now() - startTime
        });

        return NextResponse.json({
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error checking follow status', error);
        return NextResponse.json({ 
            error: 'Ошибка проверки подписки',
            is_following: false, 
            followers_count: 0 
        }, { status: 500 });
    }
}

// POST - подписаться на мастера
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Необходимо авторизоваться' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        }

        // Нельзя подписаться на самого себя
        if (id === session.user.id) {
            return NextResponse.json({ error: 'Нельзя подписаться на самого себя' }, { status: 400 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Проверяем, существует ли мастер
        const { data: master, error: masterError } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', id)
            .eq('role', 'master')
            .maybeSingle();

        if (masterError || !master) {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }

        // Проверяем, не подписан ли уже
        const { data: existing, error: checkError } = await supabase
            .from('master_followers')
            .select('id')
            .eq('master_id', id)
            .eq('follower_id', session.user.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing follow', checkError);
            return NextResponse.json({ error: 'Ошибка проверки подписки' }, { status: 500 });
        }

        if (existing) {
            return NextResponse.json({ 
                error: 'Вы уже подписаны на этого мастера',
                is_following: true
            }, { status: 400 });
        }

        // Создаем подписку
        const now = new Date().toISOString();
        const { data: follow, error: insertError } = await supabase
            .from('master_followers')
            .insert({
                master_id: id,
                follower_id: session.user.id,
                created_at: now
            })
            .select()
            .single();

        if (insertError) {
            logError('Error creating follow', insertError);
            return NextResponse.json({ error: 'Ошибка при подписке' }, { status: 500 });
        }

        // Получаем обновленное количество подписчиков
        const { count, error: countError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', id);

        if (countError) {
            logError('Error counting followers after follow', countError, 'warning');
        }

        // Создаем уведомление для мастера
        await supabase
            .from('notifications')
            .insert({
                user_id: id,
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

        // Инвалидируем кэш
        invalidateCache(`follow_status_${id}_${session.user.id}`);
        invalidateCache(`master_profile_${id}`);
        invalidateCache(`master_stats_${id}`);

        logInfo('User followed master', {
            masterId: id,
            followerId: session.user.id,
            totalFollowers: count || 0,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Вы подписались на мастера',
            is_following: true,
            followers_count: count || 0
        }, { status: 201 });
        
    } catch (error) {
        logError('Error following master', error);
        return NextResponse.json({ error: 'Ошибка при подписке' }, { status: 500 });
    }
}

// DELETE - отписаться от мастера
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Необходимо авторизоваться' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Проверяем, существует ли подписка
        const { data: existing, error: checkError } = await supabase
            .from('master_followers')
            .select('id, created_at')
            .eq('master_id', id)
            .eq('follower_id', session.user.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing follow', checkError);
            return NextResponse.json({ error: 'Ошибка проверки подписки' }, { status: 500 });
        }

        if (!existing) {
            return NextResponse.json({ 
                error: 'Вы не подписаны на этого мастера',
                is_following: false
            }, { status: 400 });
        }

        // Удаляем подписку
        const { error: deleteError } = await supabase
            .from('master_followers')
            .delete()
            .eq('master_id', id)
            .eq('follower_id', session.user.id);

        if (deleteError) {
            logError('Error deleting follow', deleteError);
            return NextResponse.json({ error: 'Ошибка при отписке' }, { status: 500 });
        }

        // Получаем обновленное количество подписчиков
        const { count, error: countError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', id);

        if (countError) {
            logError('Error counting followers after unfollow', countError, 'warning');
        }

        // Инвалидируем кэш
        invalidateCache(`follow_status_${id}_${session.user.id}`);
        invalidateCache(`master_profile_${id}`);
        invalidateCache(`master_stats_${id}`);

        logInfo('User unfollowed master', {
            masterId: id,
            followerId: session.user.id,
            wasFollowingFor: existing.created_at,
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