import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, smsCode } = body

        console.log("Verify SMS request:", { email, smsCode })

        if (!email || !smsCode) {
            return NextResponse.json(
                { error: "Email и SMS код обязательны" },
                { status: 400 }
            )
        }

        // Находим пользователя по email с его профилем
        const { data: user, error: findError } = await supabase
            .from('users')
            .select(`
                id,
                profiles!left (
                    sms_code,
                    sms_code_expires
                )
            `)
            .eq('email', email)
            .maybeSingle()

        console.log("User query result:", user)

        if (findError && findError.code !== 'PGRST116') {
            console.error("Error finding user:", findError)
            return NextResponse.json({ error: "Ошибка поиска пользователя" }, { status: 500 })
        }

        if (!user) {
            return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
        }

        // Получаем SMS код из профиля
        const smsCodeFromDb = user.profiles?.sms_code
        const smsCodeExpires = user.profiles?.sms_code_expires

        if (smsCode !== smsCodeFromDb) {
            console.log("Invalid SMS code:", { received: smsCode, expected: smsCodeFromDb })
            return NextResponse.json({ error: "Неверный SMS код" }, { status: 400 })
        }

        if (smsCodeExpires && new Date(smsCodeExpires) < new Date()) {
            return NextResponse.json({ error: "SMS код истек" }, { status: 400 })
        }

        // Очищаем SMS код в профиле
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                sms_code: null,
                sms_code_expires: null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error("Error clearing SMS code:", updateError)
            return NextResponse.json({ error: "Ошибка подтверждения кода" }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: "SMS код подтвержден" })

    } catch (error) {
        console.error("Error in verify-sms:", error)
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
    }
}