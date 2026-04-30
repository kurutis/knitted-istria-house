import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { role, phone, city, newsletterAgreement } = body

        if (!['buyer', 'master'].includes(role)) {
            return NextResponse.json({ error: 'Неверная роль' }, { status: 400 })
        }

        const now = new Date().toISOString()

        // Обновляем роль пользователя
        const { error: userError } = await supabase
            .from('users')
            .update({
                role: role,
                role_selected: true,
                updated_at: now
            })
            .eq('id', session.user.id)

        if (userError) {
            console.error('Error updating user role:', userError)
            return NextResponse.json({ error: 'Ошибка обновления роли' }, { status: 500 })
        }

        // Обновляем или создаем профиль с контактными данными
        const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking profile:', checkError)
        }

        const profileData = {
            phone: phone || null,
            city: city || null,
            newsletter_agreement: newsletterAgreement || false,
            updated_at: now
        }

        if (existingProfile) {
            // Обновляем существующий профиль
            const { error: updateError } = await supabase
                .from('profiles')
                .update(profileData)
                .eq('user_id', session.user.id)

            if (updateError) {
                console.error('Error updating profile:', updateError)
                return NextResponse.json({ error: 'Ошибка обновления профиля' }, { status: 500 })
            }
        } else {
            // Создаем новый профиль
            const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                    user_id: session.user.id,
                    ...profileData,
                    created_at: now
                })

            if (insertError) {
                console.error('Error creating profile:', insertError)
                return NextResponse.json({ error: 'Ошибка создания профиля' }, { status: 500 })
            }
        }

        // Если роль "master", создаем запись в таблице masters
        if (role === 'master') {
            const { data: existingMaster, error: masterCheckError } = await supabase
                .from('masters')
                .select('user_id')
                .eq('user_id', session.user.id)
                .maybeSingle()

            if (masterCheckError && masterCheckError.code !== 'PGRST116') {
                console.error('Error checking master:', masterCheckError)
            }

            if (!existingMaster) {
                const { error: masterError } = await supabase
                    .from('masters')
                    .insert({
                        user_id: session.user.id,
                        created_at: now,
                        updated_at: now
                    })

                if (masterError) {
                    console.error('Error creating master record:', masterError)
                    // Не возвращаем ошибку, так как роль уже обновлена
                }
            }
        }

        return NextResponse.json({ message: 'Регистрация завершена', role }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error selecting role:', error)
        return NextResponse.json({ error: error.message || 'Ошибка при выборе роли' }, { status: 500 })
    }
}