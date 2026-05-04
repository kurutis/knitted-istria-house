// app/api/auth/verify-sms/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { z } from "zod";

// Схема валидации
const verifySmsSchema = z.object({
    email: z.string().email('Неверный формат email'),
    smsCode: z.string().length(4, 'Код должен состоять из 4 цифр'),
});

// Rate limiting
const limiter = rateLimit({ limit: 5, windowMs: 60 * 1000 }); // 5 попыток в минуту

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for verify SMS', { ip });
            return NextResponse.json({ 
                error: 'Слишком много попыток. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = verifySmsSchema.parse(body);
        const email = sanitize.email(validatedData.email);
        const smsCode = validatedData.smsCode;

        // Находим пользователя по email с его профилем
        const { data: user, error: findError } = await supabase
            .from('users')
            .select(`
                id,
                email,
                role,
                is_banned,
                profiles!left (
                    sms_code,
                    sms_code_expires,
                    phone,
                    phone_verified
                )
            `)
            .eq('email', email)
            .maybeSingle();

        if (findError && findError.code !== 'PGRST116') {
            logError('Error finding user for SMS verification', findError);
            return NextResponse.json({ error: 'Ошибка поиска пользователя' }, { status: 500 });
        }

        if (!user) {
            logInfo('User not found for SMS verification', { email });
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        // Проверка на бан
        if (user.is_banned) {
            logInfo('Banned user attempted SMS verification', { userId: user.id });
            return NextResponse.json({ error: 'Ваш аккаунт заблокирован' }, { status: 403 });
        }

        // Проверяем, есть ли профиль
        if (!user.profiles) {
            logInfo('Profile not found for SMS verification', { userId: user.id });
            return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 });
        }

        // Проверяем, не подтверждён ли уже телефон
        if (user.profiles?.[0]?.phone_verified) {
            return NextResponse.json({ 
                error: 'Телефон уже подтверждён. Выполните вход.' 
            }, { status: 400 });
        }

        // Получаем SMS код из профиля
        const smsCodeFromDb = user.profiles?.[0]?.sms_code;
        const smsCodeExpires = user.profiles?.[0]?.sms_code_expires;

        // Проверка кода
        if (smsCode !== smsCodeFromDb) {
            logInfo('Invalid SMS code attempt', { 
                userId: user.id, 
                email,
                providedCode: smsCode,
                expectedCode: smsCodeFromDb?.slice(-2)
            });
            return NextResponse.json({ error: 'Неверный SMS код' }, { status: 400 });
        }

        // Проверка срока действия кода
        if (smsCodeExpires && new Date(smsCodeExpires) < new Date()) {
            return NextResponse.json({ error: 'SMS код истёк. Запросите новый.' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Обновляем профиль: подтверждаем телефон и очищаем код
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                phone_verified: true,
                sms_code: null,
                sms_code_expires: null,
                updated_at: now
            })
            .eq('user_id', user.id);

        if (updateError) {
            logError('Error updating profile after SMS verification', updateError);
            return NextResponse.json({ error: 'Ошибка подтверждения кода' }, { status: 500 });
        }

        // Если пользователь ещё не выбрал роль, отмечаем, что он прошёл верификацию
        const { data: userData } = await supabase
            .from('users')
            .select('role_selected')
            .eq('id', user.id)
            .single();

        if (userData && !userData.role_selected) {
            // Пользователь ещё не выбрал роль, не активируем полностью
            logInfo('User verified phone but role not selected', { userId: user.id });
        } else {
            // Активируем пользователя
            await supabase
                .from('users')
                .update({ 
                    is_active: true,
                    updated_at: now
                })
                .eq('id', user.id);
        }

        // Отправляем приветственное уведомление
        await supabase
            .from('notifications')
            .insert({
                user_id: user.id,
                title: '📱 Телефон подтверждён',
                message: 'Ваш номер телефона успешно подтверждён. Теперь вы можете пользоваться всеми возможностями платформы.',
                type: 'phone_verified',
                created_at: now,
                is_read: false
            });

        logApiRequest('POST', '/api/auth/verify-sms', 200, Date.now() - startTime);
        logInfo('SMS code verified successfully', { 
            userId: user.id,
            email: email,
            phone: user.profiles?.[0]?.phone.slice(-4)
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Телефон успешно подтверждён'
        }, { status: 200 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error in verify SMS', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}