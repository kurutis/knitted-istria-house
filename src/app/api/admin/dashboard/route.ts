import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try { 
        
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json(
                { error: 'Доступ запрещен. Требуются права администратора.' }, 
                { status: 401 }
            )
        }

        const stats = await db.getDashBoardStats()

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