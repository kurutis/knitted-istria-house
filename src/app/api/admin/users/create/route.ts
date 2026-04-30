import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { email, password, name, phone, role } = body

        if (!email || !password) {
            return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 })
        }

        // Проверяем, существует ли пользователь
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking user:', checkError)
            return NextResponse.json({ error: 'Ошибка проверки пользователя' }, { status: 500 })
        }

        if (existingUser) {
            return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 })
        }

        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10)
        const userRole = role || 'buyer'
        const userName = name || email.split('@')[0]
        const now = new Date().toISOString()

        // Создаем пользователя
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                email,
                password_hash: hashedPassword,
                role: userRole,
                role_selected: true, // Админ создал, значит роль выбрана
                created_at: now,
                updated_at: now
            })
            .select('id, email, role, created_at')
            .single()

        if (createError) {
            console.error('Error creating user:', createError)
            return NextResponse.json({ error: 'Ошибка создания пользователя' }, { status: 500 })
        }

        // Создаем профиль пользователя
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                user_id: newUser.id,
                full_name: userName,
                phone: phone || '',
                city: '',
                newsletter_agreement: false,
                created_at: now,
                updated_at: now
            })

        if (profileError) {
            console.error('Error creating profile:', profileError)
            // Пробуем удалить созданного пользователя, если профиль не создался
            await supabase.from('users').delete().eq('id', newUser.id)
            return NextResponse.json({ error: 'Ошибка создания профиля' }, { status: 500 })
        }

        // Если роль "master", создаем запись в таблице masters
        if (userRole === 'master') {
            const { error: masterError } = await supabase
                .from('masters')
                .insert({
                    user_id: newUser.id,
                    created_at: now,
                    updated_at: now
                })

            if (masterError) {
                console.error('Error creating master record:', masterError)
                // Не удаляем пользователя, просто логируем ошибку
                // Мастер сможет позже завершить регистрацию
            }
        }

        return NextResponse.json({ 
            message: 'Пользователь создан', 
            userId: newUser.id 
        }, { status: 201 })
        
    } catch (error: any) {
        console.error('Error creating user:', error)
        return NextResponse.json({ error: error.message || 'Ошибка создания пользователя' }, { status: 500 })
    }
}