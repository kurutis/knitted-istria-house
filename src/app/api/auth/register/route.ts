// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { sendSMS, generateSMSCode, sendVerificationSMS } from "@/lib/sms-utils";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { z } from "zod";

// Схема валидации
const registerSchema = z.object({
    name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(100),
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

        const hashedPassword = await bcrypt.hash(password, 10);
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
                error: 'Ошибка создания пользователя' 
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
                error: 'Ошибка создания профиля' 
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

        // Отправляем код подтверждения
        let success = false;
        let message = '';
        
        if (verificationMethod === 'sms') {
            if (!phone) {
                return NextResponse.json({ 
                    error: 'Номер телефона не указан' 
                }, { status: 400 });
            }
            const smsResult = await sendVerificationSMS(phone);
            if (smsResult.success) {
                success = true;
                message = `Код подтверждения отправлен на номер ${phone}`;
                // Обновляем код в базе (если нужно)
                await supabase
                    .from('profiles')
                    .update({
                        phone_verification_code: smsResult.code,
                        phone_verification_expires: new Date(Date.now() + 15 * 60 * 1000).toISOString()
                    })
                    .eq('user_id', newUser.id);
            } else {
                message = 'Ошибка отправки SMS. Проверьте номер телефона.';
            }
        } else {
            if (!email) {
                return NextResponse.json({ 
                    error: 'Email не указан' 
                }, { status: 400 });
            }
            const emailSent = await sendVerificationEmail(email, verificationCode, name);
            if (emailSent) {
                success = true;
                message = `Код подтверждения отправлен на ${email}`;
            } else {
                message = 'Ошибка отправки email. Проверьте адрес.';
            }
        }

        if (!success) {
            // Не удаляем пользователя, просто сообщаем об ошибке
            return NextResponse.json({ 
                error: message
            }, { status: 500 });
        }

        logApiRequest('POST', '/api/auth/register', 200, Date.now() - startTime);
        logInfo('User registered', { 
            userId: newUser.id,
            email: email,
            phone: phone ? phone.slice(-4) : null,
            role,
            verificationMethod
        });

        // Возвращаем успешный ответ
        return NextResponse.json({ 
            success: true,
            message,
            userId: newUser.id,
            method: verificationMethod,
            contact: verificationMethod === 'sms' ? phone : email
        }, { status: 200 });

    } catch (error) {
        // Обработка ошибок валидации Zod
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: error.issues[0]?.message || 'Ошибка валидации'
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