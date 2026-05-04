// app/api/admin/masters/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Интерфейсы для типов
interface MasterProfile {
    full_name: string | null
    phone: string | null
    city: string | null
    avatar_url: string | null
}

interface MasterData {
    description: string | null
    is_verified: boolean
    is_partner: boolean
    rating: number
    total_sales: number
    custom_orders_enabled: boolean
}

interface MasterWithRelations {
    id: string
    email: string
    created_at: string
    profiles: MasterProfile[] | null
    masters: MasterData[] | null
}

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

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Используем кэширование из db-optimized (30 секунд)
        const cacheKey = 'admin_masters_list';
        
        const result = await cachedQuery(cacheKey, async () => {
            // Получаем всех мастеров с их профилями
            const { data: masters, error } = await supabase
                .from('users')
                .select(`
                    id,
                    email,
                    created_at,
                    profiles!left (
                        full_name,
                        phone,
                        city,
                        avatar_url
                    ),
                    masters!left (
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
                throw new Error('DATABASE_ERROR');
            }

            // Получаем количество товаров для каждого мастера
            const masterIds = masters?.map(m => m.id) || [];
            const productsCountMap = new Map();
            
            if (masterIds.length > 0) {
                const { data: productsCount } = await supabase
                    .from('products')
                    .select('master_id')
                    .in('master_id', masterIds)
                    .eq('status', 'active');
                
                productsCount?.forEach(p => {
                    productsCountMap.set(p.master_id, (productsCountMap.get(p.master_id) || 0) + 1);
                });
            }

            // Получаем количество подписчиков для каждого мастера
            const followersCountMap = new Map();
            if (masterIds.length > 0) {
                const { data: followersCount } = await supabase
                    .from('master_followers')
                    .select('master_id')
                    .in('master_id', masterIds);
                
                followersCount?.forEach(f => {
                    followersCountMap.set(f.master_id, (followersCountMap.get(f.master_id) || 0) + 1);
                });
            }

            // Форматируем данные с санитизацией
            const formattedMasters = (masters as MasterWithRelations[] | null)?.map(master => ({
                id: master.id,
                user_id: master.id,
                name: sanitize.text(master.profiles?.[0]?.full_name || master.email?.split('@')[0] || 'Мастер'),
                full_name: sanitize.text(master.profiles?.[0]?.full_name || ''),
                email: sanitize.email(master.email),
                phone: sanitize.phone(master.profiles?.[0]?.phone || ''),
                city: sanitize.text(master.profiles?.[0]?.city || ''),
                description: sanitize.text(master.masters?.[0]?.description || ''),
                is_verified: master.masters?.[0]?.is_verified || false,
                is_partner: master.masters?.[0]?.is_partner || false,
                created_at: master.created_at,
                products_count: productsCountMap.get(master.id) || 0,
                followers_count: followersCountMap.get(master.id) || 0,
                rating: parseFloat(master.masters?.[0]?.rating?.toString() || '0') || 0,
                total_sales: master.masters?.[0]?.total_sales || 0,
                avatar_url: master.profiles?.[0]?.avatar_url || null,
                custom_orders_enabled: master.masters?.[0]?.custom_orders_enabled || false,
                has_products: (productsCountMap.get(master.id) || 0) > 0
            })) || [];

            // Статистика по статусам
            const stats = {
                total: formattedMasters.length,
                verified: formattedMasters.filter(m => m.is_verified).length,
                unverified: formattedMasters.filter(m => !m.is_verified).length,
                with_products: formattedMasters.filter(m => m.has_products).length,
                partners: formattedMasters.filter(m => m.is_partner).length
            };

            return {
                masters: formattedMasters,
                stats,
                lastUpdated: new Date().toISOString()
            };
        }, 30);

        logApiRequest('GET', '/api/admin/masters', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(result.masters, { 
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=30',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30',
                'X-Total-Count': result.masters.length.toString(),
                'X-Verified-Count': result.stats.verified.toString(),
                'X-Unverified-Count': result.stats.unverified.toString()
            }
        });
        
    } catch (error) {
        logError('Error fetching masters', error);
        return NextResponse.json({ error: 'Ошибка загрузки мастеров' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Rate limiting
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json()
        
        // Валидация входных данных
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

        // Предотвращение повторных действий
        if (action === 'approve' && existingMaster.is_verified === true) {
            return NextResponse.json({ error: 'Мастер уже верифицирован' }, { status: 400 })
        }
        if (action === 'remove_verification' && existingMaster.is_verified === false) {
            return NextResponse.json({ error: 'Мастер уже не верифицирован' }, { status: 400 })
        }

        // Получаем информацию о мастере для уведомления
        const { data: masterInfo } = await supabase
            .from('users')
            .select('email, profiles!left (full_name)')
            .eq('id', masterId)
            .single()

        const now = new Date().toISOString();
        let newVerifiedStatus = false;
        let notificationTitle = '';
        let notificationMessage = '';

        switch (action) {
            case 'approve':
                newVerifiedStatus = true;
                notificationTitle = '🎉 Ваша заявка одобрена!';
                notificationMessage = 'Поздравляем! Вы стали верифицированным мастером. Теперь ваши товары будут видны в каталоге, и вы сможете создавать мастер-классы.';
                
                const { error: approveError } = await supabase
                    .from('masters')
                    .update({
                        is_verified: true,
                        updated_at: now
                    })
                    .eq('user_id', masterId)

                if (approveError) throw approveError;
                break

            case 'reject':
                newVerifiedStatus = false;
                notificationTitle = 'Заявка на верификацию отклонена';
                
                if (reason) {
                    notificationMessage = `К сожалению, ваша заявка на верификацию не прошла. Причина: ${reason}`;
                    
                    // Баним мастера при отклонении с причиной
                    const { error: banError } = await supabase
                        .from('users')
                        .update({
                            is_banned: true,
                            ban_reason: reason,
                            banned_at: now,
                            updated_at: now
                        })
                        .eq('id', masterId)

                    if (banError) throw banError;
                } else {
                    notificationMessage = 'К сожалению, ваша заявка на верификацию не прошла. Пожалуйста, заполните профиль полностью и попробуйте снова.';
                }
                
                const { error: rejectError } = await supabase
                    .from('masters')
                    .update({
                        is_verified: false,
                        updated_at: now
                    })
                    .eq('user_id', masterId)

                if (rejectError) throw rejectError;
                break

            case 'remove_verification':
                newVerifiedStatus = false;
                notificationTitle = 'Статус верификации снят';
                notificationMessage = reason 
                    ? `Ваш статус верифицированного мастера был снят. Причина: ${reason}`
                    : 'Ваш статус верифицированного мастера был снят. Пожалуйста, обратитесь в поддержку для получения дополнительной информации.';
                
                const { error: removeError } = await supabase
                    .from('masters')
                    .update({
                        is_verified: false,
                        updated_at: now
                    })
                    .eq('user_id', masterId)

                if (removeError) throw removeError;
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

        // Логируем действие администратора
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: `MASTER_${action.toUpperCase()}`,
                entity_type: 'master',
                entity_id: masterId,
                old_values: { is_verified: existingMaster.is_verified, is_banned: existingMaster.is_banned },
                new_values: { is_verified: newVerifiedStatus, reason: reason || null },
                created_at: now
            });

        // Инвалидируем кэш
        invalidateCache('admin_masters_list');
        invalidateCache(`master_profile_${masterId}`);
        invalidateCache(`master_stats_${masterId}`);

        logApiRequest('PUT', '/api/admin/masters', 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin ${action} master`, { 
            masterId, 
            adminId: session.user.id,
            oldStatus: existingMaster.is_verified,
            newStatus: newVerifiedStatus,
            hasReason: !!reason
        });

        const responseMessages = {
            approve: 'Мастер успешно верифицирован',
            reject: reason ? 'Мастер отклонён и заблокирован' : 'Мастер отклонён',
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