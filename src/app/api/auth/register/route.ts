import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { generateSMSCode, sendSMS } from "@/lib/sms-utils";
import { sendVerificationEmail } from "@/lib/email";

function generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            name, email, phone, city, password, role, 
            newsletterAgreement, verificationMethod 
        } = body;

        // Валидация
        if (!email || !password || !name || !phone) {
            return NextResponse.json({ error: 'Все обязательные поля должны быть заполнены' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Пароль должен быть не менее 6 символов' }, { status: 400 });
        }

        if (!['sms', 'email'].includes(verificationMethod)) {
            return NextResponse.json({ error: 'Выберите способ подтверждения' }, { status: 400 });
        }

        // Проверка существующего пользователя
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 });
        }

        // Проверка телефона
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('phone', phone)
            .maybeSingle();

        if (existingProfile) {
            return NextResponse.json({ error: 'Пользователь с таким телефоном уже существует' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date().toISOString();
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Создаём пользователя
        const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
                email,
                password_hash: hashedPassword,
                role: role || 'buyer',
                role_selected: false,
                created_at: now,
                updated_at: now,
                email_verified: verificationMethod === 'email' ? false : true,
                email_verification_token: verificationMethod === 'email' ? verificationCode : null,
                email_verification_expires: verificationMethod === 'email' ? verificationExpires : null
            })
            .select()
            .single();

        if (userError) {
            console.error('User creation error:', userError);
            return NextResponse.json({ error: 'Ошибка создания пользователя' }, { status: 500 });
        }

        // Создаём профиль
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                user_id: newUser.id,
                full_name: name,
                phone,
                city: city || null,
                newsletter_agreement: newsletterAgreement || false,
                phone_verified: verificationMethod === 'sms' ? false : true,
                phone_verification_code: verificationMethod === 'sms' ? verificationCode : null,
                phone_verification_expires: verificationMethod === 'sms' ? verificationExpires : null
            });

        if (profileError) {
            await supabase.from('users').delete().eq('id', newUser.id);
            return NextResponse.json({ error: 'Ошибка создания профиля' }, { status: 500 });
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
                console.error('Master creation error:', masterError);
            }
        }

        // Отправляем код подтверждения
        let message = '';
        if (verificationMethod === 'sms') {
            const smsSent = await sendSMS(phone, verificationCode);
            message = smsSent ? `Код подтверждения отправлен на +${phone}` : 'Ошибка отправки SMS. Попробуйте позже.';
            if (!smsSent) {
                return NextResponse.json({ error: 'Ошибка отправки SMS. Проверьте номер телефона.' }, { status: 500 });
            }
        } else {
            const emailSent = await sendVerificationEmail(email, verificationCode, name);
            message = emailSent ? `Код подтверждения отправлен на ${email}` : 'Ошибка отправки email. Попробуйте позже.';
            if (!emailSent) {
                return NextResponse.json({ error: 'Ошибка отправки email. Проверьте адрес.' }, { status: 500 });
            }
        }

        return NextResponse.json({ 
            message,
            userId: newUser.id,
            method: verificationMethod
        }, { status: 200 });

    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: error.message || 'Ошибка регистрации' }, { status: 500 });
    }
}