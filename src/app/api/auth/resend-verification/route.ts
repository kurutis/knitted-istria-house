// app/api/auth/resend-verification/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendSMS, sendVerificationSMS } from "@/lib/sms-utils";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { z } from "zod";

// Схема валидации
const resendSchema = z.object({
    userId: z.string().uuid('Неверный формат ID пользователя'),
    method: z.enum(['sms', 'email']),
    email: z.string().email('Неверный формат email').optional(),
    phone: z.string().optional(),
    name: z.string().optional(),
});

// Rate limiting - 3 запроса в минуту
const limiter = rateLimit({ limit: 3, windowMs: 60 * 1000 });

// Генерация кода подтверждения
function generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = limiter(request);
    if (!rateLimitResult.success) {
        logInfo('Rate limit exceeded for resend verification', { ip });
        return NextResponse.json({ 
            error: 'Слишком много попыток. Попробуйте через минуту.' 
        }, { status: 429 });
    }

    try {
        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = resendSchema.parse({
            userId: body.userId,
            method: body.method,
            email: body.email,
            phone: body.phone,
            name: body.name
        });

        const { userId, method, name } = validatedData;
        let email = validatedData.email ? sanitize.email(validatedData.email) : null;
        let phone = validatedData.phone ? sanitize.phone(validatedData.phone) : null;

        // Проверка существования пользователя
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', userId)
            .maybeSingle();

        if (userError || !user) {
            logInfo('User not found for resend verification', { userId });
            return NextResponse.json({ 
                error: 'Пользователь не найден' 
            }, { status: 404 });
        }

        // Если email не передан, берём из БД
        if (method === 'email' && !email) {
            email = user.email;
            if (!email) {
                return NextResponse.json({ 
                    error: 'Email не указан' 
                }, { status: 400 });
            }
        }

        // Если SMS и телефон не передан, берём из профиля
        if (method === 'sms' && !phone) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('phone')
                .eq('user_id', userId)
                .single();
            
            if (profileError || !profile?.phone) {
                return NextResponse.json({ 
                    error: 'Номер телефона не указан' 
                }, { status: 400 });
            }
            phone = profile.phone;
        }

        const newCode = generateVerificationCode();
        const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        let success = false;

        if (method === 'sms') {
            if (!phone) {
                return NextResponse.json({ 
                    error: 'Номер телефона не указан' 
                }, { status: 400 });
            }

            // Обновляем код для телефона
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    phone_verification_code: newCode,
                    phone_verification_expires: expires,
                    updated_at: now
                })
                .eq('user_id', userId);

            if (updateError) {
                logError('Error updating SMS verification code', updateError);
                return NextResponse.json({ 
                    error: 'Ошибка обновления кода' 
                }, { status: 500 });
            }

            // Отправляем SMS
            const smsResult = await sendVerificationSMS(phone);
            if (smsResult.success) {
                success = true;
                logInfo('Resend SMS verification code', { 
                    userId, 
                    phone: phone.slice(-4)
                });
            } else {
                logError('Failed to send resend SMS', new Error(smsResult.error), 'warning');
                return NextResponse.json({ 
                    error: smsResult.error || 'Ошибка отправки SMS. Проверьте номер телефона.' 
                }, { status: 500 });
            }

        } else {
            if (!email) {
                return NextResponse.json({ 
                    error: 'Email не указан' 
                }, { status: 400 });
            }

            // Обновляем код для email
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    email_verification_token: newCode,
                    email_verification_expires: expires,
                    updated_at: now
                })
                .eq('id', userId);

            if (updateError) {
                logError('Error updating email verification code', updateError);
                return NextResponse.json({ 
                    error: 'Ошибка обновления кода' 
                }, { status: 500 });
            }

            // Отправляем email
            const userName = name || sanitize.text(user.email?.split('@')[0] || 'Пользователь');
            const emailSent = await sendVerificationEmail(email, newCode, userName);
            
            if (emailSent) {
                success = true;
                logInfo('Resend email verification code', { userId, email });
            } else {
                logError('Failed to send resend email', new Error('Email sending failed'), 'warning');
                return NextResponse.json({ 
                    error: 'Ошибка отправки email. Проверьте адрес.' 
                }, { status: 500 });
            }
        }

        if (!success) {
            return NextResponse.json({ 
                error: 'Ошибка отправки кода. Попробуйте позже.' 
            }, { status: 500 });
        }

        logApiRequest('POST', '/api/auth/resend-verification', 200, Date.now() - startTime);

        return NextResponse.json({ 
            success: true, 
            message: method === 'sms' 
                ? 'Код подтверждения отправлен повторно на ваш номер телефона'
                : 'Код подтверждения отправлен повторно на вашу почту',
            expiresIn: 900 // 15 минут в секундах
        }, { status: 200 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: error.issues[0]?.message || 'Ошибка валидации'
            }, { status: 400 });
        }
        logError('Resend verification error', error);
        return NextResponse.json({ 
            error: 'Ошибка отправки кода. Попробуйте позже.' 
        }, { status: 500 });
    }
}