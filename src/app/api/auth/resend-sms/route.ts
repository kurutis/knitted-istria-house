import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

export async function POST(request:Request) {
    try{
        const body = await request.json()
        const {email} = body

        if (!email){
            return NextResponse.json({error: 'Email обязателен'}, {status: 400})
        }

        const client = await pool.connect()

        try{
            const userResult = await client.query(`SELECT id, phone FROM users WHERE email = $1`, [email])
            if (userResult.rows.length === 0){
                return NextResponse.json({error: 'Пользователь не найден'}, {status: 404})
            }

            const user = userResult.rows[0]
            const smsCode = '1111'

            await client.query(`UPDATE users SET sms_code = $1, sms_code_expires = NOW() + INTERVAL '15 minutes', updated_at = NOW() WHERE id = $2`, [smsCode, user.id])

            return NextResponse.json({message: 'SMS отправлен', testCode: smsCode}, {status: 200})
        }finally{
            client.release()
        }
    }catch (error){
        return NextResponse.json({error: 'Ошибка отправки SMS'}, {status: 500})
    }
}