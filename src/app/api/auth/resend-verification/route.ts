import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateSMSCode, sendSMS } from "@/lib/sms-utils";
import { sendVerificationEmail } from "@/lib/email";

function generateVerificationCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request: Request) {
    try {
        const { userId, method, email, phone, name } = await request.json();

        if (!userId || !method) {
            return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
        }

        const newCode = generateVerificationCode();
        const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        if (method === 'sms') {
            if (!phone) {
                return NextResponse.json({ error: 'Номер телефона не указан' }, { status: 400 });
            }

            // Обновляем код для телефона
            await supabase
                .from('profiles')
                .update({
                    phone_verification_code: newCode,
                    phone_verification_expires: expires
                })
                .eq('user_id', userId);

            const smsSent = await sendSMS(phone, newCode);
            
            if (!smsSent) {
                return NextResponse.json({ error: 'Ошибка отправки SMS' }, { status: 500 });
            }

        } else {
            if (!email) {
                return NextResponse.json({ error: 'Email не указан' }, { status: 400 });
            }

            // Обновляем код для email
            await supabase
                .from('users')
                .update({
                    email_verification_token: newCode,
                    email_verification_expires: expires
                })
                .eq('id', userId);

            const emailSent = await sendVerificationEmail(email, newCode, name || 'Пользователь');
            
            if (!emailSent) {
                return NextResponse.json({ error: 'Ошибка отправки email' }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, message: 'Код отправлен повторно' });

    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json({ error: 'Ошибка отправки кода' }, { status: 500 });
    }
}