import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get('limit') || "10")
        const role = searchParams.get('role') || 'all'
        const search = searchParams.get('search') || ''

        // Начинаем строить запрос
        let query = supabase
            .from('users')
            .select(`
                id,
                email,
                role,
                created_at,
                is_banned,
                profiles!left (
                    full_name,
                    phone,
                    city,
                    avatar_url
                ),
                masters!left (
                    is_verified,
                    is_partner,
                    rating,
                    total_sales
                )
            `, { count: 'exact' })

        // Фильтр по роли
        if (role !== 'all') {
            query = query.eq('role', role)
        }

        // Поиск по имени, email или телефону
        if (search && search.trim()) {
            query = query.or(`email.ilike.%${search}%,profiles.full_name.ilike.%${search}%,profiles.phone.ilike.%${search}%`)
        }

        // Пагинация и сортировка
        const from = (page - 1) * limit
        const to = from + limit - 1
        
        query = query
            .order('created_at', { ascending: false })
            .range(from, to)

        const { data: users, error, count } = await query

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: error.message || "Ошибка загрузки пользователей" }, { status: 500 })
        }

        // Форматируем данные
        const formattedUsers = users?.map(user => ({
            id: user.id,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
            is_banned: user.is_banned,
            name: user.profiles?.full_name || null,
            phone: user.profiles?.phone || null,
            city: user.profiles?.city || null,
            avatar_url: user.profiles?.avatar_url || null,
            master_verified: user.masters?.is_verified || false,
            master_partner: user.masters?.is_partner || false,
            rating: user.masters?.rating || 0,
            total_sales: user.masters?.total_sales || 0
        })) || []

        return NextResponse.json({
            users: formattedUsers,
            total: count || 0,
            page: page,
            totalPages: Math.ceil((count || 0) / limit)
        }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error in GET /api/admin/users:', error)
        return NextResponse.json({ error: error.message || "Ошибка загрузки пользователей" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { userId, updates } = body

        if (!userId || !updates) {
            return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })
        }

        // Обновляем статус пользователя в таблице users
        if (updates.is_banned !== undefined) {
            const userUpdateData: any = {
                is_banned: updates.is_banned,
                updated_at: new Date().toISOString()
            }
            
            if (updates.is_banned) {
                userUpdateData.banned_at = new Date().toISOString()
            }
            
            if (updates.ban_reason !== undefined) {
                userUpdateData.ban_reason = updates.ban_reason
            } else if (!updates.is_banned) {
                userUpdateData.ban_reason = null
                userUpdateData.banned_at = null
            }
            
            const { error: userError } = await supabase
                .from('users')
                .update(userUpdateData)
                .eq('id', userId)

            if (userError) {
                console.error('Error updating user:', userError)
                return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 })
            }
        }

        // Обновляем статус мастера (верификация, партнер)
        if (updates.is_verified !== undefined || updates.is_partner !== undefined) {
            const masterUpdateData: any = {
                updated_at: new Date().toISOString()
            }
            
            if (updates.is_verified !== undefined) {
                masterUpdateData.is_verified = updates.is_verified
            }
            
            if (updates.is_partner !== undefined) {
                masterUpdateData.is_partner = updates.is_partner
            }
            
            const { error: masterError } = await supabase
                .from('masters')
                .update(masterUpdateData)
                .eq('user_id', userId)

            if (masterError) {
                console.error('Error updating master:', masterError)
                // Не возвращаем ошибку, так как пользователь может не быть мастером
            }
        }

        // Логируем действие в audit_logs
        await supabase
            .from('audit_logs')
            .insert({
                user_id: userId,
                action: 'USER_STATUS_UPDATE',
                entity_type: 'user',
                entity_id: userId,
                new_values: updates,
                created_at: new Date().toISOString()
            })

        return NextResponse.json({ message: 'Статус обновлен' }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error updating user status:', error)
        return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 })
    }
}