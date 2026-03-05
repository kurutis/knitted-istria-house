import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
    try{
        const session = await getServerSession(authOptions)

        if (!session?.user?.id){
            return NextResponse.json({error: 'Неавторизован'}, {status: 401})
        }

        const body = await request.json()
        const {role, phone, city, newsletterAgreement} = body

        if(!['buyer', 'master'].includes(role)){
            return NextResponse.json({error: 'Неверная роль'}, {status: 400})
        }

        await db.updateUserRole(session.user.id, {role, phone, city, newsletterAgreement})

        return NextResponse.json({message: 'Регистрация завершена', role}, {status: 200})
    }catch(error: any){
        return NextResponse.json({error: error.message || 'Ошибка при выборе роли'}, {status: 500})
    }
}