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
            .select('id')
            .eq('master_id', session.user.id)

        if (productsError || !products || products.length === 0) {
            return NextResponse.json([])
        }

        const productIds = products.map(p => p.id)

        // Получаем все заказы через order_items
        const { data: orderItems, error } = await supabase
            .from('order_items')
            .select(`
                id,
                quantity,
                price,
                order_id,
                orders!inner (
                    id,
                    order_number,
                    status,
                    total_amount,
                    created_at,
                    updated_at,
                    buyer_id,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name
                        )
                    )
                )
            `)
            .in('product_id', productIds)

        if (error) {
            console.error('Error fetching orders:', error);
            return NextResponse.json([], { status: 500 });
        }

        // Группируем по заказам
        const ordersMap = new Map()
        
        orderItems?.forEach(item => {
            const order = item.orders
            if (!order) return
            
            if (!ordersMap.has(order.id)) {
                ordersMap.set(order.id, {
                    id: order.id,
                    order_number: order.order_number,
                    status: order.status,
                    total_amount: order.total_amount,
                    created_at: order.created_at,
                    updated_at: order.updated_at,
                    buyer_name: order.users?.profiles?.full_name || order.users?.email,
                    product_title: 'Товар'
                })
            }
        })

        const result = Array.from(ordersMap.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        return NextResponse.json(result)
        
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json([], { status: 500 });
    }
}