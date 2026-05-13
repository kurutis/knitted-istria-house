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

const updateMasterSchema = z.object({
    masterId: z.string().uuid('Неверный формат ID мастера'),
    action: z.enum(['approve', 'reject', 'remove_verification']),
    reason: z.string().max(500, 'Причина не может превышать 500 символов').optional(),
});

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

        // Получаем пользователей с ролью master
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, created_at')
            .eq('role', 'master')
            .order('created_at', { ascending: false });

        if (usersError) {
            logError('Error fetching masters users', usersError);
            return NextResponse.json({ error: 'Ошибка загрузки мастеров' }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        const userIds = users.map(u => u.id);

        // Получаем профили
        const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone, city, avatar_url')
            .in('user_id', userIds);

        // Получаем данные мастеров (ВАЖНО: используем user_id)
        const { data: mastersData } = await supabase
            .from('masters')
            .select('user_id, description, is_verified, is_partner, rating, total_sales, custom_orders_enabled')
            .in('user_id', userIds);

        // Получаем количество товаров
        const { data: productsCount } = await supabase
            .from('products')
            .select('master_id')
            .in('master_id', userIds)
            .eq('status', 'active');

        // Получаем количество подписчиков
        const { data: followersCount } = await supabase
            .from('master_followers')
            .select('master_id')
            .in('master_id', userIds);

        // Создаем Map для быстрого доступа
        const profileMap = new Map();
        profiles?.forEach(p => {
            profileMap.set(p.user_id, p);
        });

        const masterMap = new Map();
        mastersData?.forEach(m => {
            masterMap.set(m.user_id, m);
        });

        const productsCountMap = new Map();
        productsCount?.forEach(p => {
            productsCountMap.set(p.master_id, (productsCountMap.get(p.master_id) || 0) + 1);
        });

        const followersCountMap = new Map();
        followersCount?.forEach(f => {
            followersCountMap.set(f.master_id, (followersCountMap.get(f.master_id) || 0) + 1);
        });

        // Форматируем результат
        const formattedMasters = users.map(user => {
            const profile = profileMap.get(user.id);
            const masterInfo = masterMap.get(user.id);
            
            return {
                id: user.id,
                user_id: user.id,
                name: profile?.full_name ? sanitize.text(profile.full_name) : user.email?.split('@')[0] || 'Мастер',
                full_name: profile?.full_name ? sanitize.text(profile.full_name) : '',
                email: sanitize.email(user.email),
                phone: profile?.phone ? sanitize.phone(profile.phone) : null,
                city: profile?.city ? sanitize.text(profile.city) : null,
                description: masterInfo?.description ? sanitize.text(masterInfo.description) : null,
                is_verified: masterInfo?.is_verified || false,
                is_partner: masterInfo?.is_partner || false,
                created_at: user.created_at,
                products_count: productsCountMap.get(user.id) || 0,
                followers_count: followersCountMap.get(user.id) || 0,
                rating: masterInfo?.rating || 0,
                total_sales: masterInfo?.total_sales || 0,
                avatar_url: profile?.avatar_url || null,
                custom_orders_enabled: masterInfo?.custom_orders_enabled || false,
                has_products: (productsCountMap.get(user.id) || 0) > 0
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