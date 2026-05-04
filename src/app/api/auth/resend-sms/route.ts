// app/api/auth/resend-sms/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { sendSMS, generateSMSCode } from "@/lib/sms-utils";
import { z } from "zod";

interface ResendResponse {
    success: boolean;
    message: string;
    expiresIn: number;
    testCode?: string;
}

// Схема валидации
const resendSmsSchema = z.object({
    email: z.string().email('Неверный формат email'),
});

// Rate limiting
const limiter = rateLimit({ limit: 3, windowMs: 60 * 1000 }); // 3 запроса в минуту

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for resend SMS', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json();
        
        // Валидация email
        const validatedData = resendSmsSchema.parse(body);
        const email = sanitize.email(validatedData.email);

        if (!email) {
            return NextResponse.json({ error: 'Email обязателен' }, { status: 400 });
        }

        // Находим пользователя по email
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('id, email, role, is_banned')
            .eq('email', email)
            .maybeSingle();

        if (findError && findError.code !== 'PGRST116') {
            logError('Error finding user for resend SMS', findError);
            return NextResponse.json({ error: 'Ошибка поиска пользователя' }, { status: 500 });
        }

        if (!user) {
            logInfo('User not found for resend SMS', { email });
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        // Проверка на бан
        if (user.is_banned) {
            logInfo('Banned user attempted to resend SMS', { userId: user.id });
            return NextResponse.json({ error: 'Ваш аккаунт заблокирован' }, { status: 403 });
        }

        // Получаем профиль пользователя
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('phone, phone_verified')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileError) {
            logError('Error fetching profile for resend SMS', profileError);
            return NextResponse.json({ error: 'Ошибка получения профиля' }, { status: 500 });
        }

        if (!profile?.phone) {
            return NextResponse.json({ error: 'Номер телефона не указан в профиле' }, { status: 400 });
        }

        if (profile.phone_verified) {
            return NextResponse.json({ error: 'Телефон уже подтверждён' }, { status: 400 });
        }

        // Генерируем SMS код
        const smsCode = generateSMSCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Обновляем SMS код в профиле пользователя
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                phone_verification_code: smsCode,
                phone_verification_expires: expiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

        if (updateError) {
            logError('Error updating SMS code', updateError);
            return NextResponse.json({ error: 'Ошибка обновления SMS кода' }, { status: 500 });
        }

        // Отправляем SMS
        const phone = profile.phone;
        const smsSent = await sendSMS(phone, smsCode);
        
        if (!smsSent) {
            logError('Failed to send SMS', new Error('SMS sending failed'), 'warning');
            return NextResponse.json({ error: 'Ошибка отправки SMS. Попробуйте позже.' }, { status: 500 });
        }

        // Логируем успешную отправку (без номера телефона для безопасности)
        logApiRequest('POST', '/api/auth/resend-sms', 200, Date.now() - startTime);
        logInfo('SMS resent successfully', { 
            userId: user.id,
            email: email,
            phoneLast4: phone.slice(-4)
        });

        // Возвращаем успешный ответ
        const response: ResendResponse = { 
            success: true,
            message: 'Код подтверждения отправлен повторно',
            expiresIn: 900
        };

        // В режиме разработки возвращаем тестовый код
        if (process.env.NODE_ENV === 'development') {
            response.testCode = smsCode;
        }

        return NextResponse.json(response, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error in resend SMS', error);
        return NextResponse.json({ error: 'Ошибка отправки SMS' }, { status: 500 });
    }
}