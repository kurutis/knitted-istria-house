import { NextResponse } from "next/server"
import { pool } from "@/lib/db"

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

        const client = await pool.connect()

        try {
            const userResult = await client.query(`SELECT u.id, p.sms_code, p.sms_code_expires FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.email = $1`,[email] )

            console.log("User query result:", userResult.rows)

            if (userResult.rows.length === 0) {
                return NextResponse.json({ error: "Пользователь не найден" },{ status: 404 })
            }

            const user = userResult.rows[0]

            if (smsCode !== user.sms_code) {
                console.log("Invalid SMS code:", { received: smsCode, expected: user.sms_code })
                return NextResponse.json({ error: "Неверный SMS код" },{ status: 400 })
            }
            if (user.sms_code_expires && new Date(user.sms_code_expires) < new Date()) {
                return NextResponse.json({ error: "SMS код истек" },{ status: 400 } )
            }
            await client.query(`UPDATE profiles SET sms_code = NULL, sms_code_expires = NULL WHERE user_id = $1`,[user.id])

            return NextResponse.json({ success: true, message: "SMS код подтвержден" })

        } finally {
            client.release()
        }
    } catch (error) {
        console.error("Error in verify-sms:", error)
        return NextResponse.json({ error: "Внутренняя ошибка сервера" },{ status: 500 })
    }
}