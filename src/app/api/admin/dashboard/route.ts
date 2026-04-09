import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try { 
        console.log('1. Начало запроса к dashboard API')
        
        const session = await getServerSession(authOptions)
        console.log('2. Сессия получена:', session?.user?.email, 'Роль:', session?.user?.role)

        if (!session || session.user?.role !== 'admin') {
            console.log('3. Доступ запрещен - не админ')
            return NextResponse.json(
                { error: 'Доступ запрещен. Требуются права администратора.' }, 
                { status: 401 }
            )
        }

        console.log('4. Вызов db.getDashBoardStats()')
        const stats = await db.getDashBoardStats()
        console.log('5. Статистика получена:', stats)

        return NextResponse.json(stats, { status: 200 })
        
    } catch(error: any) {
        console.error('❌ Ошибка в dashboard API:', error)
        console.error('Сообщение ошибки:', error.message)
        console.error('Стек ошибки:', error.stack)
        
        return NextResponse.json(
            { error: error.message || 'Ошибка загрузки статистики. Попробуйте позже.' }, 
            { status: 500 }
        )
    }
}