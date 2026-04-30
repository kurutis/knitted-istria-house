import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Получаем всех мастеров с их профилями
        const { data: masters, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                created_at,
                profiles!left (
                    full_name,
                    phone,
                    city,
                    avatar_url
                ),
                masters!left (
                    description,
                    is_verified,
                    is_partner,
                    rating,
                    total_sales
                )
            `)
            .eq('role', 'master')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: error.message || 'Ошибка загрузки мастеров' }, { status: 500 })
        }

        // Форматируем данные в нужный формат
        const formattedMasters = masters?.map(master => ({
            id: master.id,
            user_id: master.id,
            name: master.profiles?.full_name || master.email,
            full_name: master.profiles?.full_name || '',
            email: master.email,
            phone: master.profiles?.phone || '',
            city: master.profiles?.city || '',
            description: master.masters?.description || '',
            is_verified: master.masters?.is_verified || false,
            is_partner: master.masters?.is_partner || false,
            created_at: master.created_at,
            products_count: master.masters?.total_sales || 0,
            rating: parseFloat(master.masters?.rating) || 0,
            avatar_url: master.profiles?.avatar_url || ''
        })) || []

        return NextResponse.json(formattedMasters, { status: 200 })
        
    } catch (error: any) {
        console.error('Error:', error)
        return NextResponse.json({ error: error.message || 'Ошибка загрузки мастеров' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { masterId, action, reason } = body

        if (!masterId || !action) {
            return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })
        }

        switch (action) {
            case 'approve':
                // Подтверждаем мастера
                const { error: approveError } = await supabase
                    .from('masters')
                    .update({
                        is_verified: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', masterId)

                if (approveError) throw approveError
                break

            case 'reject':
                // Отклоняем мастера
                const { error: rejectError } = await supabase
                    .from('masters')
                    .update({
                        is_verified: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', masterId)

                if (rejectError) throw rejectError

                // Если есть причина, добавляем в бан
                if (reason) {
                    const { error: banError } = await supabase
                        .from('users')
                        .update({
                            ban_reason: reason,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', masterId)

                    if (banError) throw banError
                }
                break

            case 'remove_verification':
                // Снимаем верификацию
                const { error: removeError } = await supabase
                    .from('masters')
                    .update({
                        is_verified: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', masterId)

                if (removeError) throw removeError
                break

            default:
                return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
        }

        return NextResponse.json({ message: 'Действие выполнено успешно' }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error:', error)
        return NextResponse.json({ error: error.message || 'Ошибка обработки запроса' }, { status: 500 })
    }
}