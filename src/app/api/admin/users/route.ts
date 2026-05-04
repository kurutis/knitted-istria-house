// app/api/admin/users/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Интерфейсы
interface UserUpdateData {
    updated_at: string
    is_banned?: boolean
    banned_at?: string | null
    ban_reason?: string | null
    role?: string
    role_selected?: boolean
}

interface MasterUpdateData {
    updated_at: string
    is_verified?: boolean
    is_partner?: boolean
}

interface UserUpdates {
    is_banned?: boolean
    role?: string
    is_verified?: boolean
    is_partner?: boolean
}

// Схема валидации для PUT запроса
const updateUserSchema = z.object({
    userId: z.string().uuid('Неверный формат ID пользователя'),
    updates: z.object({
        is_banned: z.boolean().optional(),
        ban_reason: z.string().max(500, 'Причина бана не может превышать 500 символов').optional(),
        is_verified: z.boolean().optional(),
        is_partner: z.boolean().optional(),
        role: z.enum(['buyer', 'master', 'admin']).optional(),
    })
});

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Вспомогательные функции
function getRoleText(role: string): string {
    const roles: Record<string, string> = {
        'buyer': 'Покупатель',
        'master': 'Мастер',
        'admin': 'Администратор'
    };
    return roles[role] || role;
}

function getRoleColor(role: string): string {
    const colors: Record<string, string> = {
        'buyer': 'green',
        'master': 'blue',
        'admin': 'red'
    };
    return colors[role] || 'gray';
}

async function sendBanNotification(userId: string, isBanned: boolean, reason?: string) {
    try {
        const now = new Date().toISOString();
        
        await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title: isBanned ? '🔒 Аккаунт заблокирован' : '🔓 Аккаунт разблокирован',
                message: isBanned 
                    ? `Ваш аккаунт был заблокирован.${reason ? ` Причина: ${reason}` : ' Пожалуйста, обратитесь в поддержку для получения дополнительной информации.'}`
                    : 'Ваш аккаунт был разблокирован. Вы снова можете пользоваться всеми функциями платформы.',
                type: 'account_status',
                metadata: { is_banned: isBanned, reason: reason || null },
                created_at: now,
                is_read: false
            });
    } catch (error) {
        logError('Error sending ban notification', error, 'warning');
    }
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin users access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = Math.min(parseInt(searchParams.get('limit') || "50"), 100);
        const role = searchParams.get('role') || 'all';
        const status = searchParams.get('status') || 'all';
        const search = searchParams.get('search') || '';

        const cacheKey = `admin_users_${page}_${limit}_${role}_${status}_${search}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Исправленный SELECT запрос (убраны алиасы)
            let query = supabase
                .from('users')
                .select(`
                    id,
                    email,
                    role,
                    created_at,
                    is_banned,
                    ban_reason,
                    banned_at,
                    profiles!left (
                        full_name,
                        phone,
                        city,
                        avatar_url,
                        created_at
                    ),
                    masters!left (
                        is_verified,
                        is_partner,
                        rating,
                        total_sales,
                        custom_orders_enabled
                    )
                `, { count: 'exact' });

            if (role !== 'all') {
                query = query.eq('role', role);
            }

            if (status === 'banned') {
                query = query.eq('is_banned', true);
            } else if (status === 'active') {
                query = query.eq('is_banned', false);
            }

            if (search && search.trim()) {
                const safeSearch = sanitize.text(search);
                query = query.or(`email.ilike.%${safeSearch}%,profiles.full_name.ilike.%${safeSearch}%,profiles.phone.ilike.%${safeSearch}%`);
            }

            const from = (page - 1) * limit;
            const to = from + limit - 1;
            
            const { data: users, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                logError('Supabase error in admin users GET', error);
                throw new Error('DATABASE_ERROR');
            }

            // Исправленный маппинг с использованием [0]
            const formattedUsers = users?.map(user => ({
                id: user.id,
                email: sanitize.email(user.email),
                role: user.role,
                role_text: getRoleText(user.role),
                role_color: getRoleColor(user.role),
                created_at: user.created_at,
                is_banned: user.is_banned || false,
                ban_reason: user.ban_reason,
                banned_at: user.banned_at,
                name: user.profiles?.[0]?.full_name ? sanitize.text(user.profiles[0].full_name) : null,
                phone: user.profiles?.[0]?.phone ? sanitize.phone(user.profiles[0].phone) : null,
                city: user.profiles?.[0]?.city ? sanitize.text(user.profiles[0].city) : null,
                avatar_url: user.profiles?.[0]?.avatar_url,
                master_verified: user.masters?.[0]?.is_verified || false,
                master_partner: user.masters?.[0]?.is_partner || false,
                master_rating: user.masters?.[0]?.rating || 0,
                master_total_sales: user.masters?.[0]?.total_sales || 0,
                custom_orders_enabled: user.masters?.[0]?.custom_orders_enabled || false
            })) || [];

            const { data: allUsers } = await supabase
                .from('users')
                .select('role, is_banned');
            
            const stats = {
                total: allUsers?.length || 0,
                by_role: {
                    buyer: allUsers?.filter(u => u.role === 'buyer').length || 0,
                    master: allUsers?.filter(u => u.role === 'master').length || 0,
                    admin: allUsers?.filter(u => u.role === 'admin').length || 0
                },
                banned: allUsers?.filter(u => u.is_banned === true).length || 0,
                active: allUsers?.filter(u => u.is_banned === false).length || 0
            };

            return {
                users: formattedUsers,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: to + 1 < (count || 0)
                },
                stats,
                lastUpdated: new Date().toISOString()
            };
        }, 30);

        logApiRequest('GET', '/api/admin/users', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(result, { 
            status: 200,
            headers: { 
                'Cache-Control': 'private, max-age=30',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30',
                'X-Total-Count': result.pagination.total.toString()
            }
        });
        
    } catch (error) {
        logError('Error in admin users GET', error);
        return NextResponse.json({ error: 'Ошибка загрузки пользователей' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin user update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin user update attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        
        const validatedData = updateUserSchema.parse({
            userId: body.userId,
            updates: body.updates
        });

        const { userId, updates } = validatedData;

        // Получаем текущие данные пользователя для аудита
        const { data: oldUser, error: fetchError } = await supabase
            .from('users')
            .select('role, is_banned, email, ban_reason')
            .eq('id', userId)
            .single();

        if (fetchError) {
            logInfo('User not found for admin update', { userId });
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        const now = new Date().toISOString();

        // Обработка причины бана
        const banReason = updates.ban_reason !== undefined 
            ? (updates.ban_reason ? sanitize.text(updates.ban_reason) : undefined)
            : undefined;

        // Обновляем статус пользователя в таблице users
        if (updates.is_banned !== undefined || updates.role !== undefined) {
            const userUpdateData: UserUpdateData = {
                updated_at: now
            };
            
            if (updates.is_banned !== undefined) {
                userUpdateData.is_banned = updates.is_banned;
                if (updates.is_banned) {
                    userUpdateData.banned_at = now;
                } else {
                    userUpdateData.banned_at = null;
                }
            }
            
            if (banReason !== undefined) {
                userUpdateData.ban_reason = banReason;
            }
            
            if (updates.role !== undefined) {
                userUpdateData.role = updates.role;
                userUpdateData.role_selected = true;
            }
            
            const { error: userError } = await supabase
                .from('users')
                .update(userUpdateData)
                .eq('id', userId);

            if (userError) {
                logError('Error updating user status', userError);
                return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
            }
        }

        // Обновляем статус мастера (верификация, партнер)
        if (updates.is_verified !== undefined || updates.is_partner !== undefined) {
            const masterUpdateData: MasterUpdateData = {
                updated_at: now
            };
            
            if (updates.is_verified !== undefined) {
                masterUpdateData.is_verified = updates.is_verified;
            }
            
            if (updates.is_partner !== undefined) {
                masterUpdateData.is_partner = updates.is_partner;
            }
            
            const { error: masterError } = await supabase
                .from('masters')
                .update(masterUpdateData)
                .eq('user_id', userId);

            if (masterError && masterError.code !== 'PGRST116') {
                logError('Error updating master status', masterError, 'warning');
            }
        }

        // Инвалидируем кэш
        invalidateCache(/^admin_users/);
        invalidateCache(`user_${userId}`);
        invalidateCache(`master_profile_${userId}`);

        // Логируем действие в audit_logs
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'USER_STATUS_UPDATE',
                entity_type: 'user',
                entity_id: userId,
                old_values: { 
                    is_banned: oldUser.is_banned,
                    role: oldUser.role,
                    ban_reason: oldUser.ban_reason
                },
                new_values: updates,
                created_at: now
            });

        // Отправляем уведомление пользователю о блокировке/разблокировке
        if (updates.is_banned !== undefined && updates.is_banned !== oldUser.is_banned) {
            await sendBanNotification(userId, updates.is_banned, updates.ban_reason);
        }

        // Уведомление о смене роли
        if (updates.role !== undefined && updates.role !== oldUser.role) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    title: '🔑 Ваша роль изменена',
                    message: `Ваша роль на платформе изменена на "${getRoleText(updates.role)}".`,
                    type: 'account_status',
                    metadata: { old_role: oldUser.role, new_role: updates.role },
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('PUT', '/api/admin/users', 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin updated user status`, { 
            userId, 
            adminId: session.user.id,
            updates: Object.keys(updates)
        });

        return NextResponse.json({ 
            success: true,
            message: getSuccessMessage(updates),
            updates: updates
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating user status', error);
        return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
    }
}

function getSuccessMessage(updates: UserUpdates): string {
    if (updates.is_banned !== undefined) {
        return updates.is_banned ? 'Пользователь заблокирован' : 'Пользователь разблокирован';
    }
    if (updates.role !== undefined) {
        return `Роль пользователя изменена на "${getRoleText(updates.role)}"`;
    }
    if (updates.is_verified !== undefined) {
        return updates.is_verified ? 'Мастер верифицирован' : 'Верификация мастера снята';
    }
    if (updates.is_partner !== undefined) {
        return updates.is_partner ? 'Мастер добавлен в партнеры' : 'Мастер удален из партнеров';
    }
    return 'Статус пользователя обновлен';
}