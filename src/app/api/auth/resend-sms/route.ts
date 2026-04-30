import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email } = body

        if (!email) {
            return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
        }

        // Находим пользователя по email
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('id, phone')
            .eq('email', email)
            .maybeSingle()

        if (findError && findError.code !== 'PGRST116') {
            console.error('Error finding user:', findError)
            return NextResponse.json({ error: 'Ошибка поиска пользователя' }, { status: 500 })
        }

        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
        }

        const smsCode = '1111' // В development всегда 1111
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // +15 минут

        // Обновляем SMS код в профиле пользователя
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                sms_code: smsCode,
                sms_code_expires: expiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('Error updating SMS code:', updateError)
            return NextResponse.json({ error: 'Ошибка обновления SMS кода' }, { status: 500 })
        }

        return NextResponse.json({ 
            message: 'SMS отправлен', 
            testCode: smsCode 
        }, { status: 200 })
        
    } catch (error) {
        console.error('Error in resend-sms:', error)
        return NextResponse.json({ error: 'Ошибка отправки SMS' }, { status: 500 })
    }
}