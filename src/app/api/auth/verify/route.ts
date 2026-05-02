import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const { userId, code, method } = await request.json();

        if (!userId || !code) {
            return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
        }

        if (method === 'sms') {
            // Проверяем код для телефона
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('phone_verification_code, phone_verification_expires')
                .eq('user_id', userId)
                .single();

            if (error || !profile) {
                return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 });
            }

            if (profile.phone_verification_code !== code) {
                return NextResponse.json({ error: 'Неверный код подтверждения' }, { status: 400 });
            }

            if (profile.phone_verification_expires && new Date(profile.phone_verification_expires) < new Date()) {
                return NextResponse.json({ error: 'Код истёк. Запросите новый' }, { status: 400 });
            }

            // Подтверждаем телефон и активируем пользователя
            await supabase
                .from('profiles')
                .update({
                    phone_verified: true,
                    phone_verification_code: null,
                    phone_verification_expires: null
                })
                .eq('user_id', userId);

            // Активируем пользователя
            await supabase
                .from('users')
                .update({ role_selected: true })
                .eq('id', userId);

        } else {
            // Проверяем код для email
            const { data: user, error } = await supabase
                .from('users')
                .select('email_verification_token, email_verification_expires')
                .eq('id', userId)
                .single();

            if (error || !user) {
                return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
            }

            if (user.email_verification_token !== code) {
                return NextResponse.json({ error: 'Неверный код подтверждения' }, { status: 400 });
            }

            if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
                return NextResponse.json({ error: 'Код истёк. Запросите новый' }, { status: 400 });
            }

            // Подтверждаем email и активируем пользователя
            await supabase
                .from('users')
                .update({
                    email_verified: true,
                    email_verification_token: null,
                    email_verification_expires: null,
                    role_selected: true
                })
                .eq('id', userId);
        }

        return NextResponse.json({ success: true, message: 'Аккаунт успешно подтверждён' });

    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}