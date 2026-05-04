// app/api/select-role/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface ProfileData {
    updated_at: string;
    phone?: string | null;
    city?: string | null;
    newsletter_agreement?: boolean;
}

// Rate limiting
const limiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 }); // 5 запросов в час

// Валидация телефона
function validatePhone(phone: string): { valid: boolean; error?: string } {
    if (!phone) return { valid: true };
    
    const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
    if (!phoneRegex.test(phone)) {
        return { valid: false, error: 'Неверный формат телефона' };
    }
    return { valid: true };
}

// Валидация города
function validateCity(city: string): { valid: boolean; error?: string } {
    if (!city) return { valid: true };
    
    if (city.length < 2) {
        return { valid: false, error: 'Название города слишком короткое' };
    }
    if (city.length > 100) {
        return { valid: false, error: 'Название города слишком длинное' };
    }
    return { valid: true };
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через час.' 
            }, { status: 429 });
        }

        const body = await request.json();
        const { role, phone, city, newsletterAgreement } = body;

        // Валидация роли
        if (!role || !['buyer', 'master'].includes(role)) {
            return NextResponse.json({ error: 'Неверная роль. Доступные роли: buyer, master' }, { status: 400 });
        }

        // Проверяем, не выбрана ли уже роль
        const { data: currentUser, error: checkError } = await supabase
            .from('users')
            .select('role, role_selected')
            .eq('id', session.user.id)
            .single();

        if (checkError) {
            logError('Error checking user role', checkError);
            return NextResponse.json({ error: 'Ошибка проверки пользователя' }, { status: 500 });
        }

        if (currentUser?.role_selected) {
            return NextResponse.json({ 
                error: 'Роль уже выбрана. Изменить роль невозможно.',
                current_role: currentUser.role
            }, { status: 400 });
        }

        // Валидация данных для мастера
        if (role === 'master') {
            const phoneValidation = validatePhone(phone);
            if (!phoneValidation.valid) {
                return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
            }

            const cityValidation = validateCity(city);
            if (!cityValidation.valid) {
                return NextResponse.json({ error: cityValidation.error }, { status: 400 });
            }

            if (!phone || !city) {
                return NextResponse.json({ 
                    error: 'Для роли мастера необходимо указать телефон и город' 
                }, { status: 400 });
            }
        }

        const now = new Date().toISOString();

        // Обновляем роль пользователя
        const { error: userError } = await supabase
            .from('users')
            .update({
                role: role,
                role_selected: true,
                updated_at: now
            })
            .eq('id', session.user.id);

        if (userError) {
            logError('Error updating user role', userError);
            return NextResponse.json({ error: 'Ошибка обновления роли' }, { status: 500 });
        }

        // Обновляем или создаем профиль с контактными данными
        const { data: existingProfile, error: checkProfileError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (checkProfileError && checkProfileError.code !== 'PGRST116') {
            logError('Error checking profile', checkProfileError);
        }

        const profileData: ProfileData = {
            updated_at: now
        };

        if (phone !== undefined) profileData.phone = phone?.trim() || null;
        if (city !== undefined) profileData.city = city?.trim() || null;
        if (newsletterAgreement !== undefined) profileData.newsletter_agreement = newsletterAgreement;

        if (existingProfile) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update(profileData)
                .eq('user_id', session.user.id);

            if (updateError) {
                logError('Error updating profile', updateError);
                return NextResponse.json({ error: 'Ошибка обновления профиля' }, { status: 500 });
            }
        } else {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    user_id: session.user.id,
                    ...profileData,
                    created_at: now
                });

            if (insertError) {
                logError('Error creating profile', insertError);
                return NextResponse.json({ error: 'Ошибка создания профиля' }, { status: 500 });
            }
        }

        // Если роль "master", создаем запись в таблице masters
        if (role === 'master') {
            const { data: existingMaster, error: masterCheckError } = await supabase
                .from('masters')
                .select('user_id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (masterCheckError && masterCheckError.code !== 'PGRST116') {
                logError('Error checking master', masterCheckError);
            }

            if (!existingMaster) {
                const { error: masterError } = await supabase
                    .from('masters')
                    .insert({
                        user_id: session.user.id,
                        description: null,
                        is_verified: false,
                        is_partner: false,
                        rating: 0,
                        total_sales: 0,
                        custom_orders_enabled: false,
                        moderation_status: 'pending',
                        is_banned: false,
                        created_at: now,
                        updated_at: now
                    });

                if (masterError) {
                    logError('Error creating master record', masterError);
                    // Не возвращаем ошибку, так как роль уже обновлена
                }
            }

            // Отправляем приветственное сообщение для мастера
            await supabase
                .from('notifications')
                .insert({
                    user_id: session.user.id,
                    title: 'Добро пожаловать в Knitly Master!',
                    message: 'Ваша учетная запись мастера создана. Заполните профиль и добавьте свои товары.',
                    type: 'system',
                    metadata: { role: 'master', step: 'profile_setup' },
                    created_at: now,
                    is_read: false
                });
        } else {
            // Для покупателя - приветственное сообщение
            await supabase
                .from('notifications')
                .insert({
                    user_id: session.user.id,
                    title: 'Добро пожаловать на Knitly!',
                    message: 'Рады видеть вас на нашей платформе. Изучайте товары мастеров и находите вдохновение.',
                    type: 'system',
                    metadata: { role: 'buyer' },
                    created_at: now,
                    is_read: false
                });
        }

        // Инвалидируем кэш
        invalidateCache(`user_profile_${session.user.id}`);
        if (role === 'master') {
            invalidateCache(`master_public_profile_${session.user.id}`);
        }

        logInfo('User role selected', {
            userId: session.user.id,
            role,
            hasPhone: !!phone,
            hasCity: !!city,
            newsletterAgreement,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true,
            message: role === 'master' 
                ? 'Поздравляем! Вы успешно зарегистрировались как мастер. Заполните профиль и начинайте продавать.'
                : 'Регистрация успешно завершена. Добро пожаловать на Knitly!',
            role,
            redirect: role === 'master' ? '/master/profile' : '/'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error selecting role', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Ошибка при выборе роли'
        }, { status: 500 });
    }
}

// GET - проверить статус выбора роли
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('role, role_selected')
            .eq('id', session.user.id)
            .single();

        if (error) {
            logError('Error checking role selection status', error);
            return NextResponse.json({ error: 'Ошибка проверки статуса' }, { status: 500 });
        }

        let masterModerationStatus = null;
        if (user.role === 'master') {
            const { data: master } = await supabase
                .from('masters')
                .select('moderation_status, is_verified')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            masterModerationStatus = master?.moderation_status || null;
        }

        return NextResponse.json({
            role_selected: user.role_selected || false,
            role: user.role || null,
            master_moderation_status: masterModerationStatus
        }, { status: 200 });
        
    } catch (error) {
        logError('Error checking role selection', error);
        return NextResponse.json({ error: 'Ошибка проверки статуса' }, { status: 500 });
    }
}