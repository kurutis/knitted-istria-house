import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type OrderUpdateData = {
    status: string;
    updated_at: string;
    tracking_number?: string;
    shipped_at?: string;
    delivered_at?: string;
};

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, tracking_number } = body;

        // ИСПРАВЛЕНО: Проверяем роль из таблицы users, а не profiles
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('role, is_banned')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError);
            return NextResponse.json({ error: 'Ошибка проверки прав пользователя' }, { status: 500 });
        }

        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        if (user.is_banned) {
            return NextResponse.json({ error: 'Ваш аккаунт заблокирован' }, { status: 403 });
        }

        if (user.role !== 'master' && user.role !== 'admin') {
            console.log(`User role is ${user.role}, not master/admin`);
            return NextResponse.json({ error: 'Доступ только для мастеров' }, { status: 403 });
        }

        // Проверяем, что заказ содержит товары мастера
        const { data: masterProducts } = await supabase
            .from('products')
            .select('id')
            .eq('master_id', session.user.id);

        const productIds = masterProducts?.map(p => p.id) || [];

        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', id)
            .in('product_id', productIds)
            .limit(1);

        if (itemsError) {
            console.error('Error checking order items:', itemsError);
            return NextResponse.json({ error: 'Ошибка проверки заказа' }, { status: 500 });
        }

        if (!orderItems || orderItems.length === 0) {
            return NextResponse.json({ error: 'Заказ не найден или не содержит ваших товаров' }, { status: 404 });
        }

        // Обновляем статус заказа
        const updateData: OrderUpdateData = { 
            status, 
            updated_at: new Date().toISOString() 
        };
        
        if (status === 'shipped' && tracking_number) {
            updateData.tracking_number = tracking_number;
            updateData.shipped_at = new Date().toISOString();
        }
        
        if (status === 'delivered') {
            updateData.delivered_at = new Date().toISOString();
        }

        const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating order:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления заказа: ' + updateError.message }, { status: 500 });
        }

        // Создаем уведомление для покупателя
        let notificationTitle = '';
        let notificationMessage = '';

        switch (status) {
            case 'confirmed':
                notificationTitle = 'Заказ подтвержден';
                notificationMessage = `Ваш заказ #${updatedOrder.order_number} подтвержден мастером и готовится к отправке.`;
                break;
            case 'shipped':
                notificationTitle = 'Заказ отправлен';
                notificationMessage = `Ваш заказ #${updatedOrder.order_number} отправлен. Трек-номер: ${tracking_number || 'будет позже'}`;
                break;
            case 'delivered':
                notificationTitle = 'Заказ доставлен';
                notificationMessage = `Ваш заказ #${updatedOrder.order_number} доставлен. Пожалуйста, подтвердите получение.`;
                break;
            case 'cancelled':
                notificationTitle = 'Заказ отменен';
                notificationMessage = `Ваш заказ #${updatedOrder.order_number} был отменен мастером.`;
                break;
        }

        if (notificationTitle) {
            await supabase.from('notifications').insert({
                user_id: updatedOrder.buyer_id,
                type: 'order',
                title: notificationTitle,
                message: notificationMessage,
                link: `/profile/orders/${id}`,
                created_at: new Date().toISOString()
            });
        }

        return NextResponse.json({
            success: true,
            order: updatedOrder
        });
        
    } catch (error) {
        console.error('Error updating order:', error);
        return NextResponse.json({ error: 'Ошибка обновления заказа' }, { status: 500 });
    }
}