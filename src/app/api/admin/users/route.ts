import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request:Request) {
    try{
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin'){
            return NextResponse.json({error: 'Неавторизован'}, {status: 401})
        }

        const {searchParams} = new URL(request.url)
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get('limit') || "10")
        const role = parseInt(searchParams.get('role') || 'all')
        const search = searchParams.get('search') || ''

        const filters = {role, search}
        const result = db.getUsers(page, limit, filters)

        return NextResponse.json(result, {status: 200})
    }catch(error){
        return NextResponse.json({ error: "Ошибка загрузки пользователей" }, { status: 500 })
    } 
}

export async function PUT(request:Request) {
    try{
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin'){
            return NextResponse.json({error: 'Неавторизован'}, {status: 401})
        }

        const body = await request.json()
        const {userId, updates} = body

        if (!userId || !updates){
            return NextResponse.json({error: 'еверные параметры'}, {status: 400})
        }

        await db.updateUserStatus(userId, updates)

        return NextResponse.json({message: 'Статус обновлен'}, {status: 200})
    }catch(error: any){
        return NextResponse.json({error: 'Ошибка обновления статуса'}, {status: 500})
    }
}