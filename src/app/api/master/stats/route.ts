import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Получаем ID всех товаров мастера
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, views')
            .eq('master_id', session.user.id)

        if (productsError) {
            console.error('Error fetching products:', productsError)
        }

        const productIds = products?.map(p => p.id) || []
        
        // Всего товаров
        const totalProducts = productIds.length
        
        // Всего просмотров
        const totalViews = products?.reduce((sum, product) => sum + (product.views || 0), 0) || 0

        // Новые заказы и всего заказов
        let newOrders = 0
        let totalOrders = 0

        if (productIds.length > 0) {
            // Получаем все order_items для товаров мастера
            const { data: orderItems, error: itemsError } = await supabase
                .from('order_items')
                .select(`
                    id,
                    order_id,
                    orders!inner (
                        id,
                        status
                    )
                `)
                .in('product_id', productIds)

            if (!itemsError && orderItems) {
                // Уникальные заказы
                const uniqueOrderIds = new Set()
                const newOrderIds = new Set()
                
                orderItems.forEach(item => {
                    if (item.order_id) {
                        uniqueOrderIds.add(item.order_id)
                        if (item.orders?.status === 'new') {
                            newOrderIds.add(item.order_id)
                        }
                    }
                })
                
                totalOrders = uniqueOrderIds.size
                newOrders = newOrderIds.size
            }
        }

        // Количество подписчиков (участников мастер-классов)
        const { data: masterClasses, error: classesError } = await supabase
            .from('master_classes')
            .select('id')
            .eq('master_id', session.user.id)

        let followers = 0
        if (!classesError && masterClasses && masterClasses.length > 0) {
            const classIds = masterClasses.map(mc => mc.id)
            const { count, error: registrationsError } = await supabase
                .from('master_class_registrations')
                .select('id', { count: 'exact', head: true })
                .in('master_class_id', classIds)

            if (!registrationsError) {
                followers = count || 0
            }
        }

        return NextResponse.json({
            new_orders: newOrders,
            total_orders: totalOrders,
            total_products: totalProducts,
            total_views: totalViews,
            total_followers: followers
        })
        
    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json({
            new_orders: 0,
            total_orders: 0,
            total_products: 0,
            total_views: 0,
            total_followers: 0
        })
    }
}