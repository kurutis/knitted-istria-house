import { authOptions } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Получаем товары на модерации или черновики
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id,
                title,
                description,
                price,
                status,
                category,
                technique,
                size,
                main_image_url,
                created_at,
                views,
                master_id,
                users!inner (
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                ),
                product_images (
                    id,
                    image_url,
                    sort_order
                )
            `)
            .in('status', ['moderation', 'draft'])
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Ошибка загрузки товаров' }, { status: 500 })
        }

        // Форматируем данные
        const formattedProducts = products?.map(product => ({
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            status: product.status,
            category: product.category,
            technique: product.technique,
            size: product.size,
            main_image_url: product.main_image_url,
            created_at: product.created_at,
            views: product.views,
            master_id: product.master_id,
            master_email: product.users?.email,
            master_name: product.users?.profiles?.full_name || product.users?.email,
            images: product.product_images?.sort((a, b) => a.sort_order - b.sort_order) || []
        })) || []

        return NextResponse.json(formattedProducts, { status: 200 })
        
    } catch (error: any) {
        console.error('Error fetching products:', error)
        return NextResponse.json({ error: error.message || 'Ошибка загрузки товаров' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { productId, action, reason } = body

        if (!productId || !action) {
            return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 })
        }

        let updateData: any = {
            updated_at: new Date().toISOString()
        }

        switch (action) {
            case 'approve':
                updateData.status = 'active'
                break
            case 'reject':
                updateData.status = 'rejected'
                updateData.moderation_comment = reason || 'Отклонено модератором'
                break
            case 'draft':
                updateData.status = 'draft'
                break
            default:
                return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
        }

        // Обновляем статус товара
        const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId)

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Ошибка обработки запроса' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Действие выполнено успешно' }, { status: 200 })
        
    } catch (error: any) {
        console.error('Error in PUT:', error)
        return NextResponse.json({ error: error.message || 'Ошибка обработки запроса' }, { status: 500 })
    }
}