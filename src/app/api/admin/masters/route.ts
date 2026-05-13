// app/api/admin/masters/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации для PUT запроса
const updateMasterSchema = z.object({
    masterId: z.string().uuid('Неверный формат ID мастера'),
    action: z.enum(['approve', 'reject', 'remove_verification']),
    reason: z.string().max(500, 'Причина не может превышать 500 символов').optional(),
});

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const putLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin masters access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Получаем всех мастеров с их профилями
        const { data: masters, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                created_at,
                profiles (
                    full_name,
                    phone,
                    city,
                    avatar_url
                ),
                masters (
                    description,
                    is_verified,
                    is_partner,
                    rating,
                    total_sales,
                    custom_orders_enabled
                )
            `)
            .eq('role', 'master')
            .order('created_at', { ascending: false })

        if (error) {
            logError('Supabase error in admin masters GET', error);
            return NextResponse.json({ error: 'Ошибка загрузки мастеров' }, { status: 500 });
        }

        if (!masters || masters.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        // Получаем количество товаров для каждого мастера
        const masterIds = masters.map(m => m.id);
        const productsCountMap = new Map<string, number>();
        
        const { data: productsCount } = await supabase
            .from('products')
            .select('master_id')
            .in('master_id', masterIds)
            .eq('status', 'active');
        
        productsCount?.forEach(p => {
            productsCountMap.set(p.master_id, (productsCountMap.get(p.master_id) || 0) + 1);
        });

        // Получаем количество подписчиков для каждого мастера
        const followersCountMap = new Map<string, number>();
        const { data: followersCount } = await supabase
            .from('master_followers')
            .select('master_id')
            .in('master_id', masterIds);
        
        followersCount?.forEach(f => {
            followersCountMap.set(f.master_id, (followersCountMap.get(f.master_id) || 0) + 1);
        });

        // Форматируем данные - берем первый элемент из массивов profiles и masters
        const formattedMasters = masters.map(master => {
            // profiles и masters могут быть массивами или null
            const profile = master.profiles && Array.isArray(master.profiles) && master.profiles.length > 0 
                ? master.profiles[0] 
                : null;
            const masterInfo = master.masters && Array.isArray(master.masters) && master.masters.length > 0 
                ? master.masters[0] 
                : null;
            
            return {
                id: master.id,
                user_id: master.id,
                name: profile?.full_name ? sanitize.text(profile.full_name) : master.email?.split('@')[0] || 'Мастер',
                full_name: profile?.full_name ? sanitize.text(profile.full_name) : '',
                email: sanitize.email(master.email),
                phone: profile?.phone ? sanitize.phone(profile.phone) : null,
                city: profile?.city ? sanitize.text(profile.city) : null,
                description: masterInfo?.description ? sanitize.text(masterInfo.description) : null,
                is_verified: masterInfo?.is_verified || false,
                is_partner: masterInfo?.is_partner || false,
                created_at: master.created_at,
                products_count: productsCountMap.get(master.id) || 0,
                followers_count: followersCountMap.get(master.id) || 0,
                rating: masterInfo?.rating || 0,
                total_sales: masterInfo?.total_sales || 0,
                avatar_url: profile?.avatar_url || null,
                custom_orders_enabled: masterInfo?.custom_orders_enabled || false,
                has_products: (productsCountMap.get(master.id) || 0) > 0
            };
        });

        logApiRequest('GET', '/api/admin/masters', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(formattedMasters, { 
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=30',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30'
            }
        });
        
    } catch (error) {
        logError('Error fetching masters', error);
        return NextResponse.json({ error: 'Ошибка загрузки мастеров' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json()
        
        const validatedData = updateMasterSchema.parse({
            masterId: body.masterId,
            action: body.action,
            reason: body.reason ? sanitize.text(body.reason) : undefined
        })

        const { masterId, action, reason } = validatedData

        // Проверяем, существует ли мастер
        const { data: existingMaster, error: checkError } = await supabase
            .from('masters')
            .select('user_id, is_verified, is_banned')
            .eq('user_id', masterId)
            .single()

        if (checkError || !existingMaster) {
            logInfo('Master not found for admin action', { masterId, action });
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 })
        }

        const now = new Date().toISOString();
        let newVerifiedStatus = false;
        let notificationTitle = '';
        let notificationMessage = '';

        switch (action) {
            case 'approve':
                newVerifiedStatus = true;
                notificationTitle = '🎉 Ваша заявка одобрена!';
                notificationMessage = 'Поздравляем! Вы стали верифицированным мастером.';
                
                await supabase
                    .from('masters')
                    .update({
                        is_verified: true,
                        updated_at: now
                    })
                    .eq('user_id', masterId)
                break

            case 'reject':
                newVerifiedStatus = false;
                notificationTitle = 'Заявка на верификацию отклонена';
                notificationMessage = reason 
                    ? `К сожалению, ваша заявка на верификацию не прошла. Причина: ${reason}`
                    : 'К сожалению, ваша заявка на верификацию не прошла.';
                
                await supabase
                    .from('masters')
                    .update({
                        is_verified: false,
                        updated_at: now
                    })
                    .eq('user_id', masterId)
                break

            case 'remove_verification':
                newVerifiedStatus = false;
                notificationTitle = 'Статус верификации снят';
                notificationMessage = reason 
                    ? `Ваш статус верифицированного мастера был снят. Причина: ${reason}`
                    : 'Ваш статус верифицированного мастера был снят.';
                
                await supabase
                    .from('masters')
                    .update({
                        is_verified: false,
                        updated_at: now
                    })
                    .eq('user_id', masterId)
                break

            default:
                return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
        }

        // Отправляем уведомление мастеру
        await supabase
            .from('notifications')
            .insert({
                user_id: masterId,
                title: notificationTitle,
                message: notificationMessage,
                type: 'master_verification',
                metadata: { action, reason: reason || null },
                created_at: now,
                is_read: false
            });

        // Инвалидируем кэш
        invalidateCache('admin_masters_list');
        invalidateCache(`master_profile_${masterId}`);

        logApiRequest('PUT', '/api/admin/masters', 200, Date.now() - startTime, session.user.id);

        const responseMessages = {
            approve: 'Мастер успешно верифицирован',
            reject: 'Мастер отклонён',
            remove_verification: 'Верификация снята'
        };

        return NextResponse.json({ 
            success: true,
            message: responseMessages[action],
            newStatus: newVerifiedStatus
        }, { status: 200 })
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 })
        }
        logError('Error updating master', error);
        return NextResponse.json({ error: 'Ошибка обработки запроса' }, { status: 500 })
    }
}