// app/api/auth/verify/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { z } from "zod";

// Схема валидации
const verifySchema = z.object({
    userId: z.string().uuid('Неверный формат ID пользователя'),
    code: z.string().length(4, 'Код должен состоять из 4 цифр'),
    method: z.enum(['sms', 'email']),
});

// Rate limiting - 5 попыток в минуту
const limiter = rateLimit({ limit: 5, windowMs: 60 * 1000 });

export async function POST(request: Request) {
    const startTime = Date.now();
    
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = limiter(request);
    if (!rateLimitResult.success) {
        logInfo('Rate limit exceeded for verification', { ip });
        return NextResponse.json({ 
            error: 'Слишком много попыток. Попробуйте через минуту.' 
        }, { status: 429 });
    }

    try {
        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = verifySchema.parse({
            userId: body.userId,
            code: body.code,
            method: body.method
        });

        const { userId, code, method } = validatedData;

        // Проверка существования пользователя
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, role_selected, email_verified, is_active')
            .eq('id', userId)
            .maybeSingle();

        if (userError || !user) {
            logInfo('User not found for verification', { userId, method });
            return NextResponse.json({ 
                error: 'Пользователь не найден' 
            }, { status: 404 });
        }

        // Проверка, не подтверждён ли уже аккаунт
        if (method === 'email' && user.email_verified === true) {
            return NextResponse.json({ 
                error: 'Аккаунт уже подтверждён. Выполните вход.' 
            }, { status: 400 });
        }

        const now = new Date().toISOString();
        let verificationSuccess = false;

        if (method === 'sms') {
            // Проверяем код для телефона
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('phone_verification_code, phone_verification_expires, phone_verified, phone')
                .eq('user_id', userId)
                .single();

            if (profileError || !profile) {
                logError('Profile not found for SMS verification', profileError);
                return NextResponse.json({ 
                    error: 'Профиль не найден' 
                }, { status: 404 });
            }

            // Проверка, не подтверждён ли уже телефон
            if (profile.phone_verified === true) {
                return NextResponse.json({ 
                    error: 'Телефон уже подтверждён' 
                }, { status: 400 });
            }

            // Проверка кода
            if (profile.phone_verification_code !== code) {
                logInfo('Failed SMS verification attempt', { 
                    userId, 
                    ip,
                    providedCode: code,
                    expectedCode: profile.phone_verification_code?.slice(-2)
                });
                return NextResponse.json({ 
                    error: 'Неверный код подтверждения' 
                }, { status: 400 });
            }

            // Проверка срока действия кода
            if (profile.phone_verification_expires && new Date(profile.phone_verification_expires) < new Date()) {
                return NextResponse.json({ 
                    error: 'Код истёк. Запросите новый.' 
                }, { status: 400 });
            }

            // Подтверждаем телефон
            const { error: updateProfileError } = await supabase
                .from('profiles')
                .update({
                    phone_verified: true,
                    phone_verification_code: null,
                    phone_verification_expires: null,
                    updated_at: now
                })
                .eq('user_id', userId);

            if (updateProfileError) {
                logError('Error updating profile during SMS verification', updateProfileError);
                return NextResponse.json({ 
                    error: 'Ошибка подтверждения' 
                }, { status: 500 });
            }

            verificationSuccess = true;
            
            logInfo('SMS verification successful', { 
                userId, 
                phone: profile.phone?.slice(-4)
            });

        } else {
            // Проверка для email
            const { data: userData, error: userDataError } = await supabase
                .from('users')
                .select('email_verification_token, email_verification_expires, email_verified, email')
                .eq('id', userId)
                .single();

            if (userDataError || !userData) {
                logError('User data not found for email verification', userDataError);
                return NextResponse.json({ 
                    error: 'Пользователь не найден' 
                }, { status: 404 });
            }

            // Проверка, не подтверждён ли уже email
            if (userData.email_verified === true) {
                return NextResponse.json({ 
                    error: 'Email уже подтверждён' 
                }, { status: 400 });
            }

            // Проверка кода
            if (userData.email_verification_token !== code) {
                logInfo('Failed email verification attempt', { 
                    userId, 
                    ip,
                    email: userData.email
                });
                return NextResponse.json({ 
                    error: 'Неверный код подтверждения' 
                }, { status: 400 });
            }

            // Проверка срока действия кода
            if (userData.email_verification_expires && new Date(userData.email_verification_expires) < new Date()) {
                return NextResponse.json({ 
                    error: 'Код истёк. Запросите новый.' 
                }, { status: 400 });
            }

            // Подтверждаем email и активируем пользователя
            const { error: updateUserError } = await supabase
                .from('users')
                .update({
                    email_verified: true,
                    email_verification_token: null,
                    email_verification_expires: null,
                    role_selected: true,
                    is_active: true,
                    updated_at: now
                })
                .eq('id', userId);

            if (updateUserError) {
                logError('Error updating user during email verification', updateUserError);
                return NextResponse.json({ 
                    error: 'Ошибка подтверждения' 
                }, { status: 500 });
            }

            verificationSuccess = true;
            
            logInfo('Email verification successful', { 
                userId, 
                email: userData.email
            });
        }

        // Если роль ещё не выбрана, активируем пользователя
        if (verificationSuccess && !user.role_selected) {
            await supabase
                .from('users')
                .update({ 
                    role_selected: true,
                    is_active: true,
                    updated_at: now
                })
                .eq('id', userId);
        }

        // Отправляем приветственное уведомление
        if (verificationSuccess) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    title: '🎉 Добро пожаловать!',
                    message: 'Ваш аккаунт успешно подтверждён. Теперь вы можете пользоваться всеми возможностями платформы.',
                    type: 'account_verified',
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('POST', '/api/auth/verify', 200, Date.now() - startTime);

        return NextResponse.json({ 
            success: true, 
            message: 'Аккаунт успешно подтверждён! Теперь вы можете войти.',
            redirectTo: '/auth/signin'
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: error.issues[0]?.message || 'Ошибка валидации'
            }, { status: 400 });
        }
        logError('Verification error', error);
        return NextResponse.json({ 
            error: 'Внутренняя ошибка сервера. Попробуйте позже.' 
        }, { status: 500 });
    }
}