// app/api/master/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface ProfileUpdateData {
    full_name: string;
    updated_at: string;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
    newsletter_agreement?: boolean;
    avatar_url?: string | null;
}

interface MasterUpdateData {
    updated_at: string;
    description?: string | null;
    custom_orders_enabled?: boolean;
}

interface ProfileUpdateData {
    full_name: string;
    updated_at: string;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
    newsletter_agreement?: boolean;
    avatar_url?: string | null;
}

interface MasterUpdateData {
    updated_at: string;
    description?: string | null;
    custom_orders_enabled?: boolean;
}

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту
const putLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 обновлений в минуту

// Валидация данных
function validatePhone(phone: string): boolean {
    const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    return phoneRegex.test(phone);
}

function validateName(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Имя обязательно' };
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
        return { valid: false, error: 'Имя должно содержать минимум 2 символа' };
    }
    if (trimmed.length > 100) {
        return { valid: false, error: 'Имя не может превышать 100 символов' };
    }
    return { valid: true };
}

function validateDescription(description: string): { valid: boolean; error?: string } {
    if (!description) return { valid: true };
    if (description.length > 2000) {
        return { valid: false, error: 'Описание не может превышать 2000 символов' };
    }
    return { valid: true };
}

// GET - получить профиль мастера
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        if (session.user.role !== 'master' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Кэшируем профиль
        const cacheKey = `master_profile_${session.user.id}`;
        
        const profile = await cachedQuery(cacheKey, async () => {
            const { data: masterData, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                role,
                created_at,
                profiles!user_id (
                    full_name,
                    phone,
                    city,
                    address,
                    avatar_url,
                    newsletter_agreement,
                    created_at,
                    updated_at
                ),
                masters!user_id (
                    description,
                    is_verified,
                    is_partner,
                    rating,
                    total_sales,
                    custom_orders_enabled,
                    moderation_status,
                    is_banned
                )
            `)
            .eq('id', session.user.id)
            .single();

            if (error) {
                logError('Error fetching master profile', error);
                if (error.code === 'PGRST116') {
                    throw new Error('NOT_FOUND');
                }
                throw new Error('DATABASE_ERROR');
            }

            // Подсчет количества подписчиков
            let followersCount = 0;
            if (session.user.role === 'master') {
                const { count } = await supabase
                    .from('followers')
                    .select('id', { count: 'exact', head: true })
                    .eq('master_id', session.user.id);
                followersCount = count || 0;
            }

            // Подсчет количества товаров
            const { count: productsCount } = await supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', session.user.id)
                .eq('status', 'active');

            return {
                id: masterData.id,
                email: masterData.email,
                role: masterData.role,
                registered_at: masterData.created_at,
                fullname: masterData.profiles?.[0]?.full_name || masterData.email?.split('@')[0] || '',
                phone: masterData.profiles?.[0]?.phone || '',
                city: masterData.profiles?.[0]?.city || '',
                address: masterData.profiles?.[0]?.address || '',
                avatar_url: masterData.profiles?.[0]?.avatar_url || null,
                newsletter_agreement: masterData.profiles?.[0]?.newsletter_agreement || false,
                profile_updated_at: masterData.profiles?.[0]?.updated_at,
                description: masterData.masters?.[0]?.description || '',
                is_verified: masterData.masters?.[0]?.is_verified || false,
                is_partner: masterData.masters?.[0]?.is_partner || false,
                rating: masterData.masters?.[0]?.rating || 0,
                total_sales: masterData.masters?.[0]?.total_sales || 0,
                custom_orders_enabled: masterData.masters?.[0]?.custom_orders_enabled || false,
                moderation_status: masterData.masters?.[0]?.moderation_status || 'pending',
                is_banned: masterData.masters?.[0]?.is_banned || false,
                followers: followersCount,
                products_count: productsCount || 0
            };
        });

        return NextResponse.json({
            success: true,
            profile,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof Error && error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }
        logError('Error in master profile GET', error);
        return NextResponse.json({ error: 'Ошибка загрузки профиля' }, { status: 500 });
    }
}

// PUT - обновить профиль мастера
export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        if (session.user.role !== 'master') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Проверяем, не забанен ли мастер
        const { data: masterStatus } = await supabase
            .from('masters')
            .select('is_banned, moderation_status')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (masterStatus?.is_banned) {
            return NextResponse.json({ error: 'Ваш аккаунт заблокирован. Вы не можете редактировать профиль.' }, { status: 403 });
        }

        const formData = await request.formData();
        
        const fullname = formData.get('fullname') as string;
        const phone = formData.get('phone') as string;
        const city = formData.get('city') as string;
        const address = formData.get('address') as string;
        const description = formData.get('description') as string;
        const customOrdersEnabled = formData.get('custom_orders_enabled') === 'true';
        const newsletterAgreement = formData.get('newsletter_agreement') === 'true';
        const avatarFile = formData.get('avatar') as File | null;
        const removeAvatar = formData.get('remove_avatar') === 'true';

        // Валидация
        const nameValidation = validateName(fullname);
        if (!nameValidation.valid) {
            return NextResponse.json({ error: nameValidation.error }, { status: 400 });
        }

        if (phone && phone.trim() && !validatePhone(phone)) {
            return NextResponse.json({ error: 'Неверный формат телефона' }, { status: 400 });
        }

        const descValidation = validateDescription(description);
        if (!descValidation.valid) {
            return NextResponse.json({ error: descValidation.error }, { status: 400 });
        }

        if (city && city.length > 100) {
            return NextResponse.json({ error: 'Название города не может превышать 100 символов' }, { status: 400 });
        }

        if (address && address.length > 200) {
            return NextResponse.json({ error: 'Адрес не может превышать 200 символов' }, { status: 400 });
        }

        // Проверка аватара
        if (avatarFile && avatarFile.size > 0) {
            if (avatarFile.size > 5 * 1024 * 1024) {
                return NextResponse.json({ error: 'Аватар не может превышать 5MB' }, { status: 400 });
            }
            if (!avatarFile.type.startsWith('image/')) {
                return NextResponse.json({ error: 'Файл должен быть изображением' }, { status: 400 });
            }
        }

        const now = new Date().toISOString();
        let avatarUrl: string | null = null;

        // Обработка аватара
        if (removeAvatar) {
            // Получаем старый аватар и удаляем его
            const { data: oldProfile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('user_id', session.user.id)
                .single();
            
            if (oldProfile?.avatar_url) {
                await deleteFromS3(oldProfile.avatar_url).catch(err => 
                    logError('Error deleting old avatar', err, 'warning')
                );
            }
            avatarUrl = null;
        } else if (avatarFile && avatarFile.size > 0) {
            try {
                // Удаляем старый аватар
                const { data: oldProfile } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('user_id', session.user.id)
                    .single();
                
                if (oldProfile?.avatar_url) {
                    await deleteFromS3(oldProfile.avatar_url).catch(err => 
                        logError('Error deleting old avatar', err, 'warning')
                    );
                }

                // Загружаем новый аватар
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${session.user.id}/avatar.${fileExt}`;
                avatarUrl = await uploadToS3(avatarFile, 'avatars', fileName);
                
                if (!avatarUrl) {
                    logError('Failed to upload avatar to S3');
                }
            } catch (uploadError) {
                logError('S3 upload error', uploadError);
                // Не возвращаем ошибку, продолжаем без аватара
            }
        }

        // Обновляем профиль
        const profileUpdateData: ProfileUpdateData = {
            full_name: fullname.trim(),
            updated_at: now
        };

        if (phone !== undefined) profileUpdateData.phone = phone?.trim() || null;
        if (city !== undefined) profileUpdateData.city = city?.trim() || null;
        if (address !== undefined) profileUpdateData.address = address?.trim() || null;
        if (newsletterAgreement !== undefined) profileUpdateData.newsletter_agreement = newsletterAgreement;
        if (avatarUrl !== null) profileUpdateData.avatar_url = avatarUrl;
        if (removeAvatar) profileUpdateData.avatar_url = null;

        const { error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdateData)
            .eq('user_id', session.user.id);

        if (profileError) {
            logError('Profile update error', profileError);
            return NextResponse.json({ error: 'Ошибка обновления профиля: ' + profileError.message }, { status: 500 });
        }

        // Обновляем данные мастера
        const masterUpdateData: MasterUpdateData = {
            updated_at: now
        };

        if (description !== undefined) masterUpdateData.description = description?.trim() || null;
        if (customOrdersEnabled !== undefined) masterUpdateData.custom_orders_enabled = customOrdersEnabled;

        const { error: masterError } = await supabase
            .from('masters')
            .update(masterUpdateData)
            .eq('user_id', session.user.id);

        if (masterError) {
            logError('Master update error', masterError);
            // Не возвращаем ошибку, так как профиль уже обновлен
        }

        // Инвалидируем кэш профиля
        invalidateCache(`master_profile_${session.user.id}`);

        logInfo('Master profile updated', {
            userId: session.user.id,
            fieldsUpdated: Object.keys(profileUpdateData),
            avatarUpdated: !!avatarUrl || removeAvatar,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Профиль успешно обновлен',
            avatar_url: avatarUrl
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in master profile PUT', error);
        return NextResponse.json({ error: 'Ошибка обновления профиля' }, { status: 500 });
    }
}