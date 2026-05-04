// app/api/become-master/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

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
        
        if (!session?.user) {
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

        // Проверяем, не является ли уже мастером
        const { data: currentUser, error: checkError } = await supabase
            .from('users')
            .select('role, role_selected')
            .eq('id', session.user.id)
            .single();

        if (checkError) {
            logError('Error checking user role', checkError);
            return NextResponse.json({ error: 'Ошибка проверки статуса' }, { status: 500 });
        }

        if (currentUser?.role === 'master') {
            return NextResponse.json({ 
                error: 'Вы уже являетесь мастером',
                already_master: true
            }, { status: 400 });
        }

        if (currentUser?.role_selected) {
            return NextResponse.json({ 
                error: 'Вы уже пытались стать мастером. Пожалуйста, обратитесь в поддержку.',
                already_requested: true
            }, { status: 400 });
        }

        const { city, phone } = await request.json();

        // Валидация
        const phoneValidation = validatePhone(phone);
        if (!phoneValidation.valid) {
            return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
        }

        const cityValidation = validateCity(city);
        if (!cityValidation.valid) {
            return NextResponse.json({ error: cityValidation.error }, { status: 400 });
        }

        // Проверяем, есть ли уже профиль у пользователя
        const { data: existingProfile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (profileCheckError) {
            logError('Error checking profile', profileCheckError);
        }

        const now = new Date().toISOString();

        // Обновляем роль пользователя
        const { error: userError } = await supabase
            .from('users')
            .update({ 
                role: 'master',
                role_selected: true,
                updated_at: now
            })
            .eq('id', session.user.id);

        if (userError) {
            logError('Error updating user role', userError);
            return NextResponse.json({ error: 'Ошибка при обновлении роли' }, { status: 500 });
        }

        // Обновляем или создаем профиль
        if (existingProfile) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ 
                    city: city?.trim() || null,
                    phone: phone?.trim() || null,
                    updated_at: now
                })
                .eq('user_id', session.user.id);

            if (profileError) {
                logError('Error updating profile', profileError, 'warning');
            }
        } else {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: session.user.id,
                    city: city?.trim() || null,
                    phone: phone?.trim() || null,
                    created_at: now,
                    updated_at: now
                });

            if (profileError) {
                logError('Error creating profile', profileError, 'warning');
            }
        }

        // Создаем запись в таблице masters
        const { data: existingMaster, error: masterCheckError } = await supabase
            .from('masters')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (masterCheckError) {
            logError('Error checking master record', masterCheckError, 'warning');
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

        // Создаем уведомление для администраторов
        await supabase
            .from('notifications')
            .insert({
                user_id: null, // системное уведомление
                title: 'Новый мастер',
                message: `Пользователь ${session.user.email} запросил статус мастера`,
                type: 'admin',
                metadata: { 
                    user_id: session.user.id,
                    city: city || null,
                    phone: phone || null
                },
                created_at: now,
                is_read: false
            });

        // Отправляем приветственное сообщение мастеру
        await supabase
            .from('notifications')
            .insert({
                user_id: session.user.id,
                title: 'Добро пожаловать в Knitly Master!',
                message: 'Ваша заявка на статус мастера принята. Мы проверим ваши данные в ближайшее время. Теперь вы можете добавлять товары и создавать мастер-классы.',
                type: 'system',
                metadata: { 
                    role: 'master',
                    next_steps: 'Добавьте товары и настройте профиль'
                },
                created_at: now,
                is_read: false
            });

        // Инвалидируем кэш
        invalidateCache(`user_profile_${session.user.id}`);
        invalidateCache(`master_public_profile_${session.user.id}`);
        invalidateCache(`master_stats_${session.user.id}`);

        logInfo('User became master', {
            userId: session.user.id,
            email: session.user.email,
            city: city || null,
            hasPhone: !!phone,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Поздравляем! Вы успешно стали мастером. Теперь вы можете добавлять товары и создавать мастер-классы.',
            redirect: '/master/dashboard'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in become-master', error);
        return NextResponse.json({ 
            error: 'Внутренняя ошибка сервера. Пожалуйста, попробуйте позже.' 
        }, { status: 500 });
    }
}

// GET - проверить статус запроса на становление мастером
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('role, role_selected')
            .eq('id', session.user.id)
            .single();

        if (error) {
            logError('Error checking user role', error);
            return NextResponse.json({ error: 'Ошибка проверки статуса' }, { status: 500 });
        }

        let masterStatus = null;
        if (user.role === 'master') {
            const { data: master } = await supabase
                .from('masters')
                .select('moderation_status, is_verified, is_banned')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            masterStatus = master;
        }

        return NextResponse.json({
            role: user.role,
            role_selected: user.role_selected,
            is_master: user.role === 'master',
            master_moderation_status: masterStatus?.moderation_status || null,
            is_verified: masterStatus?.is_verified || false,
            is_banned: masterStatus?.is_banned || false
        }, { status: 200 });
        
    } catch (error) {
        logError('Error checking become-master status', error);
        return NextResponse.json({ 
            error: 'Ошибка проверки статуса' 
        }, { status: 500 });
    }
}