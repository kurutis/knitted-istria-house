import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try{ 
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin'){
            return NextResponse.json({error: 'Неавторизован'}, {status: 401})
        }

        const stats = await db.getDashBoardStats()

        return NextResponse.json(stats, {status: 200})
    }catch(error: any){
        return NextResponse.json({'Ошибка загрузки статистики'}, {status: 500})
    }
}