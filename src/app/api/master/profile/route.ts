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

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });
const putLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

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

        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const cacheKey = `master_profile_${session.user.id}`;
        
        const profile = await cachedQuery(cacheKey, async () => {
            // Получаем пользователя
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email, role, created_at')
                .eq('id', session.user.id)
                .single();

            if (userError) {
                logError('Error fetching user', userError);
                throw new Error('DATABASE_ERROR');
            }

            // Получаем профиль
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, phone, city, address, avatar_url, newsletter_agreement, created_at, updated_at')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (profileError) {
                logError('Error fetching profile', profileError);
            }

            // Получаем данные мастера
            const { data: masterData, error: masterError } = await supabase
                .from('masters')
                .select('description, is_verified, is_partner, rating, total_sales, custom_orders_enabled, moderation_status, is_banned')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (masterError) {
                logError('Error fetching master', masterError);
            }

            // Подсчет количества подписчиков
            let followersCount = 0;
            const { count } = await supabase
                .from('followers')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', session.user.id);
            followersCount = count || 0;

            // Подсчет количества товаров
            const { count: productsCount } = await supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', session.user.id)
                .eq('status', 'active');

            return {
                id: user.id,
                email: user.email,
                role: user.role,
                registered_at: user.created_at,
                fullname: profileData?.full_name || user.email?.split('@')[0] || '',
                phone: profileData?.phone || '',
                city: profileData?.city || '',
                address: profileData?.address || '',
                avatar_url: profileData?.avatar_url || null,
                newsletter_agreement: profileData?.newsletter_agreement || false,
                profile_updated_at: profileData?.updated_at,
                description: masterData?.description || '',
                is_verified: masterData?.is_verified || false,
                is_partner: masterData?.is_partner || false,
                rating: masterData?.rating || 0,
                total_sales: masterData?.total_sales || 0,
                custom_orders_enabled: masterData?.custom_orders_enabled || false,
                moderation_status: masterData?.moderation_status || 'pending',
                is_banned: masterData?.is_banned || false,
                followers: followersCount,
                products_count: productsCount || 0
            };
        }, 60); // TTL 60 секунд

        return NextResponse.json({
            success: true,
            profile,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
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
            const { data: oldProfile } = await supabase
                .from('profiles')
                .select('avatar_url')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (oldProfile?.avatar_url) {
                await deleteFromS3(oldProfile.avatar_url).catch(err => 
                    logError('Error deleting old avatar', err, 'warning')
                );
            }
            avatarUrl = null;
        } else if (avatarFile && avatarFile.size > 0) {
            try {
                const { data: oldProfile } = await supabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('user_id', session.user.id)
                    .maybeSingle();
                
                if (oldProfile?.avatar_url) {
                    await deleteFromS3(oldProfile.avatar_url).catch(err => 
                        logError('Error deleting old avatar', err, 'warning')
                    );
                }

                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${session.user.id}/avatar.${fileExt}`;
                avatarUrl = await uploadToS3(avatarFile, 'avatars', fileName);
                
                if (!avatarUrl) {
                    logError('Failed to upload avatar to S3');
                }
            } catch (uploadError) {
                logError('S3 upload error', uploadError);
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
        }

        // Инвалидируем кэш профиля
        await invalidateCache(`master_profile_${session.user.id}`);

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