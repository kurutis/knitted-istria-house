import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {return NextResponse.json({error: 'Неавторизован'}, {status: 401})}

        const body = await request.json()
        const { email, password, name, phone, role } = body

        if (!email || !password) {return NextResponse.json({error: 'Email и пароль обязательны'}, {status: 400})}

        const existingUser = await db.getUserByEmail(email)
        if (existingUser) {return NextResponse.json({error: 'Пользователь с таким email уже существует'}, {status: 400})}

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.createUser({fullName: name || email.split('@')[0], email, password: hashedPassword, phone: phone || '', city: '', role: role || 'buyer', newsletterAgreement: false})

        return NextResponse.json({message: 'Пользователь создан', userId: user.id}, {status: 201})
    } catch (error: any) {
        console.error('Error creating user:', error)
        return NextResponse.json({error: error.message || 'Ошибка создания пользователя'}, {status: 500})
    }
}