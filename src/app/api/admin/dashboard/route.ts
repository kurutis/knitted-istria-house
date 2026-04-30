import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
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

        // Получаем все статистики параллельно для оптимизации
        const [
            usersCountResult,
            mastersCountResult,
            productsCountResult,
            ordersCountResult,
            pendingMastersResult,
            pendingProductsResult,
            recentUsersResult,
            recentOrdersResult
        ] = await Promise.all([
            // Общее количество пользователей (не админов)
            supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .neq('role', 'admin'),
            
            // Количество верифицированных мастеров
            supabase
                .from('masters')
                .select('*', { count: 'exact', head: true })
                .eq('is_verified', true),
            
            // Количество активных товаров
            supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active'),
            
            // Общее количество заказов
            supabase
                .from('orders')
                .select('*', { count: 'exact', head: true }),
            
            // Мастера на верификации
            supabase
                .from('masters')
                .select('*', { count: 'exact', head: true })
                .eq('is_verified', false),
            
            // Товары на модерации
            supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'moderation'),
            
            // Последние 5 пользователей
            supabase
                .from('users')
                .select(`
                    id,
                    role,
                    created_at,
                    profiles!left (
                        full_name
                    )
                `)
                .neq('role', 'admin')
                .order('created_at', { ascending: false })
                .limit(5),
            
            // Последние 5 заказов
            supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    total_amount,
                    status,
                    created_at,
                    buyer_id,
                    users!inner (
                        email,
                        profiles!left (
                            full_name
                        )
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(5)
        ])

        // Обрабатываем возможные ошибки
        if (usersCountResult.error) console.error('Users count error:', usersCountResult.error)
        if (mastersCountResult.error) console.error('Masters count error:', mastersCountResult.error)
        if (productsCountResult.error) console.error('Products count error:', productsCountResult.error)
        if (ordersCountResult.error) console.error('Orders count error:', ordersCountResult.error)
        if (pendingMastersResult.error) console.error('Pending masters error:', pendingMastersResult.error)
        if (pendingProductsResult.error) console.error('Pending products error:', pendingProductsResult.error)
        if (recentUsersResult.error) console.error('Recent users error:', recentUsersResult.error)
        if (recentOrdersResult.error) console.error('Recent orders error:', recentOrdersResult.error)

        // Форматируем последних пользователей
        const recentUsers = recentUsersResult.data?.map(user => ({
            id: user.id,
            role: user.role,
            created_at: user.created_at,
            name: user.profiles?.full_name || null
        })) || []

        // Форматируем последние заказы
        const recentOrders = recentOrdersResult.data?.map(order => ({
            id: order.id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            status: order.status,
            created_at: order.created_at,
            buyer_name: order.users?.profiles?.full_name || order.users?.email
        })) || []

        const stats = {
            totalUsers: usersCountResult.count || 0,
            totalMasters: mastersCountResult.count || 0,
            totalProducts: productsCountResult.count || 0,
            totalOrders: ordersCountResult.count || 0,
            pendingModeration: {
                masters: pendingMastersResult.count || 0,
                products: pendingProductsResult.count || 0
            },
            recentUsers: recentUsers,
            recentOrders: recentOrders
        }

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