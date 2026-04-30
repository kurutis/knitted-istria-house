import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Получаем все заказы с информацией о покупателе и количестве товаров
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                status,
                created_at,
                total_amount,
                buyer_id,
                users!inner (
                    email,
                    profiles!left (
                        full_name
                    )
                ),
                order_items (
                    id,
                    quantity
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
        }

        // Форматируем данные
        const formattedOrders = orders?.map(order => ({
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            created_at: order.created_at,
            items_count: order.order_items?.length || 0,
            total_amount: order.total_amount,
            buyer_name: order.users?.profiles?.full_name || order.users?.email,
            buyer_email: order.users?.email
        })) || []

        return NextResponse.json(formattedOrders, { status: 200 })
        
    } catch (error) {
        console.error('Error fetching orders:', error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

// Дополнительно: получение деталей конкретного заказа
export async function GET_ORDER_BY_ID(id: string) {
    try {
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                users!inner (
                    email,
                    profiles!left (
                        full_name,
                        phone,
                        address
                    )
                ),
                order_items (
                    *,
                    products!inner (
                        title,
                        price,
                        main_image_url
                    )
                )
            `)
            .eq('id', id)
            .single()

        if (error) throw error
        return order
        
    } catch (error) {
        console.error('Error fetching order details:', error)
        throw error
    }
}

// Дополнительно: обновление статуса заказа
export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { orderId, status } = body

        if (!orderId || !status) {
            return NextResponse.json({ error: "Missing orderId or status" }, { status: 400 })
        }

        // Обновляем статус заказа
        const { data: updatedOrder, error } = await supabase
            .from('orders')
            .update({
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .select()
            .single()

        if (error) {
            console.error('Error updating order:', error)
            return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Статус заказа обновлен',
            order: updatedOrder 
        }, { status: 200 })
        
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}