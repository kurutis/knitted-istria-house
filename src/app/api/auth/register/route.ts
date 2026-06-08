import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcryptjs from "bcryptjs";
import { sendSMS, generateSMSCode, sendVerificationSMS } from "@/lib/sms-utils";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string()
        .min(2, 'Имя должно содержать минимум 2 символа')
        .max(100, 'Имя не может превышать 100 символов')
        .regex(/^[А-Яа-яЁё\s\-]+$/, 'Имя и фамилия должны содержать только русские буквы, пробелы и дефисы')
        .refine((val) => val.trim().split(/\s+/).length >= 2, {
            message: 'Введите имя и фамилию (минимум два слова)'
        }),
    email: z.string().email('Неверный формат email').optional(),
    phone: z.string().optional(),
    city: z.string().min(2, 'Город обязателен').max(100),
    password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
    confirmPassword: z.string().optional(),
    role: z.enum(['buyer', 'master']),
    newsletterAgreement: z.boolean().optional(),
    verificationMethod: z.enum(['sms', 'email']).optional(),
});

// Rate limiting
const limiter = rateLimit({ limit: 5, windowMs: 60 * 1000 }); // 5 запросов в минуту

// Генерация кода подтверждения
function generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendCodeWithTimeout(
    method: 'sms' | 'email',
    contact: string,
    code: string,
    name: string
): Promise<{ success: boolean; message: string }> {
    const timeoutPromise = new Promise<{ success: boolean; message: string }>((resolve) => {
        setTimeout(() => {
            resolve({ 
                success: false, 
                message: `Превышено время ожидания при отправке ${method === 'sms' ? 'SMS' : 'email'}` 
            });
        }, 10000); // 10 секунд таймаут
    });

    const sendPromise = (async () => {
        if (method === 'sms') {
            const result = await sendVerificationSMS(contact);
            return { 
                success: result.success, 
                message: result.success 
                    ? `Код подтверждения отправлен на номер ${contact}` 
                    : result.error || 'Ошибка отправки SMS'
            };
        } else {
            const emailSent = await sendVerificationEmail(contact, code, name);
            return { 
                success: emailSent, 
                message: emailSent 
                    ? `Код подтверждения отправлен на ${contact}` 
                    : 'Ошибка отправки email. Проверьте адрес.'
            };
        }
    })();

    return Promise.race([sendPromise, timeoutPromise]);
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = limiter(request);
    if (!rateLimitResult.success) {
        logInfo('Rate limit exceeded for registration', { ip });
        return NextResponse.json({ 
            error: 'Слишком много попыток. Попробуйте через минуту.' 
        }, { status: 429 });
    }

    try {
        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = registerSchema.parse({
            name: body.name,
            email: body.email,
            phone: body.phone,
            city: body.city,
            password: body.password,
            confirmPassword: body.confirmPassword,
            role: body.role,
            newsletterAgreement: body.newsletterAgreement,
            verificationMethod: body.verificationMethod
        });
        
        // Проверка совпадения паролей
        if (body.password !== body.confirmPassword) {
            return NextResponse.json({ 
                error: 'Пароли не совпадают' 
            }, { status: 400 });
        }
        
        // Санитизация данных
        const name = sanitize.text(validatedData.name);
        const email = validatedData.email ? sanitize.email(validatedData.email) : null;
        const phone = validatedData.phone ? sanitize.phone(validatedData.phone) : null;
        const city = sanitize.text(validatedData.city);
        const password = validatedData.password;
        const role = validatedData.role;
        const newsletterAgreement = validatedData.newsletterAgreement || false;
        const verificationMethod = validatedData.verificationMethod || (email ? 'email' : 'sms');

        // Проверка наличия email или телефона
        if (!email && !phone) {
            return NextResponse.json({ 
                error: 'Укажите email или номер телефона' 
            }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ 
                error: 'Пароль должен быть не менее 6 символов' 
            }, { status: 400 });
        }

        if (!['sms', 'email'].includes(verificationMethod)) {
            return NextResponse.json({ 
                error: 'Выберите способ подтверждения' 
            }, { status: 400 });
        }

        // Проверка существующего пользователя по email
        if (email) {
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (existingUser) {
                return NextResponse.json({ 
                    error: 'Пользователь с таким email уже существует' 
                }, { status: 400 });
            }
        }

        // Проверка телефона
        if (phone) {
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('phone')
                .eq('phone', phone)
                .maybeSingle();

            if (existingProfile) {
                return NextResponse.json({ 
                    error: 'Пользователь с таким телефоном уже существует' 
                }, { status: 400 });
            }
        }

        // Хешируем пароль с помощью bcryptjs
        const hashedPassword = await bcryptjs.hash(password, 10);
        const now = new Date().toISOString();
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Создаём пользователя
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                email: email || null,
                password_hash: hashedPassword,
                role: role || 'buyer',
                role_selected: false,
                is_active: true,
                created_at: now,
                updated_at: now,
                email_verified: verificationMethod === 'email' ? false : true,
                email_verification_token: verificationMethod === 'email' ? verificationCode : null,
                email_verification_expires: verificationMethod === 'email' ? verificationExpires : null
            })
            .select()
            .single();

        if (userError) {
            logError('User creation error', userError);
            return NextResponse.json({ 
                error: 'Ошибка создания пользователя: ' + userError.message
            }, { status: 500 });
        }

        // Создаём профиль
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                user_id: newUser.id,
                full_name: name,
                phone: phone || null,
                city: city || null,
                newsletter_agreement: newsletterAgreement,
                phone_verified: verificationMethod === 'sms' ? false : true,
                phone_verification_code: verificationMethod === 'sms' ? verificationCode : null,
                phone_verification_expires: verificationMethod === 'sms' ? verificationExpires : null,
                created_at: now,
                updated_at: now
            });

        if (profileError) {
            // Откат: удаляем созданного пользователя
            await supabase.from('users').delete().eq('id', newUser.id);
            logError('Profile creation error', profileError);
            return NextResponse.json({ 
                error: 'Ошибка создания профиля: ' + profileError.message
            }, { status: 500 });
        }

        // Если роль "master", создаём запись в masters
        if (role === 'master') {
            const { error: masterError } = await supabase
                .from('masters')
                .insert({ 
                    user_id: newUser.id,
                    created_at: now,
                    updated_at: now
                });

            if (masterError) {
                logError('Master creation error', masterError, 'warning');
                // Не возвращаем ошибку, так как пользователь уже создан
            }
        }

        // Отправляем код подтверждения (НЕ блокируем регистрацию, если отправка не удалась)
        let codeSent = false;
        let codeMessage = '';
        
        try {
            if (verificationMethod === 'sms') {
                if (!phone) {
                    codeMessage = 'Номер телефона не указан для отправки SMS';
                } else {
                    const smsResult = await sendCodeWithTimeout('sms', phone, verificationCode, name);
                    codeSent = smsResult.success;
                    codeMessage = smsResult.message;
                    
                    // Если SMS не отправилась, но пользователь создан — всё равно продолжаем
                    if (!codeSent) {
                        logError('SMS sending failed but user created', new Error(codeMessage), 'warning');
                    }
                }
            } else {
                if (!email) {
                    codeMessage = 'Email не указан для отправки письма';
                } else {
                    const emailResult = await sendCodeWithTimeout('email', email, verificationCode, name);
                    codeSent = emailResult.success;
                    codeMessage = emailResult.message;
                    
                    if (!codeSent) {
                        logError('Email sending failed but user created', new Error(codeMessage), 'warning');
                    }
                }
            }
        } catch (sendError) {
            logError('Code sending error (non-critical)', sendError, 'warning');
            codeMessage = 'Не удалось отправить код, но аккаунт создан. Используйте восстановление пароля.';
            codeSent = false;
        }

        logApiRequest('POST', '/api/auth/register', 200, Date.now() - startTime);
        logInfo('User registered', { 
            userId: newUser.id,
            email: email,
            phone: phone ? phone.slice(-4) : null,
            role,
            verificationMethod,
            codeSent
        });

        // Возвращаем успешный ответ
        return NextResponse.json({ 
            success: true,
            message: codeSent 
                ? codeMessage 
                : `Аккаунт создан. ${codeMessage} Вы можете войти, но для подтверждения потребуется запросить код повторно.`,
            userId: newUser.id,
            method: verificationMethod,
            contact: verificationMethod === 'sms' ? phone : email,
            codeSent: codeSent
        }, { status: 200 });

    } catch (error) {
        // Обработка ошибок валидации Zod
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0]?.message || 'Ошибка валидации';
            return NextResponse.json({ 
                error: firstError
            }, { status: 400 });
        }
        
        // Обработка других ошибок
        logError('Registration error', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка регистрации. Попробуйте позже.';
        return NextResponse.json({ 
            error: errorMessage
        }, { status: 500 });
    }
}