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

        const yarns = await db.getYarnCatalog()

        return NextResponse.json(yarns, {status:200})
    }catch(error: any){
        return NextResponse.json({'Ошибка загрузки каталога пряжи'}, {status:500})
    }
}

export async function POST(request:Request) {
    try{
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin'){
            return NextResponse.json({error: 'Неавторизован'}, {status: 401})
        }

        const body = await request.json()
        const yarn = await db.addYarn(body)
        return NextResponse.json(yarn, {status: 201})
    }catch(error: any){
        return NextResponse.json({error: 'Ошибка добавления пряжи'}, {status: 500})
    }
}

export async function PUT(request:Request) {
    try{
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin'){
            return NextResponse.json({error: 'Неавторизован'}, {status: 401})
        }

        const body = await request.json()
        const {id, ...updates} = body

        if (!id){
            return NextResponse.json({error: 'ID пряжи обязателен'}, {status: 400})
        }

        const yarn = await db.updateYarn(id, updates)

        return NextResponse.json(yarn, {status: 200})
    }catch(error: any){
        return NextResponse.json({error: 'Ошибка обновления пряжи'}, {status: 500})
    }
}

export async function DELETE(request:Request) {
    try{
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'admin'){
            return NextResponse.json({error: 'Неавторизован'}, {status: 401})
        }

        const {searchParams} = new URL(request.url)
        const id = searchParams.get('id')

        if(!id){
            return NextResponse.json({error: 'ID пряжи обязателен'}, {status: 400})
        }

        await db.deleteYarn(id)

        return NextResponse.json({message: 'Пряжа удалена'}, {status: 200})
    }catch(error: any){
        return NextResponse.json({error: 'Ошибка удаления пряжи'}, {status: 500})
    }
}