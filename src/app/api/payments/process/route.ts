// app/api/payments/process/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface PaymentData {
    provider: string;
    payment_id: string;
    paid_at: string;
    mode: string;
}

interface OrderUpdateData {
    payment_status: string;
    payment_method: string;
    updated_at: string;
    status: string;
    payment_data?: PaymentData;
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { orderId, amount, provider } = await request.json();

        // Получаем заказ
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('buyer_id', session.user.id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
        }

        // Демо-режим: всегда успешная оплата
        const now = new Date().toISOString();
        
        // Обновляем статус заказа
        const updateData: OrderUpdateData = {
            payment_status: provider === 'cash' ? 'pending' : 'paid',
            payment_method: provider,
            updated_at: now,
            status: provider === 'cash' ? 'new' : 'processing'
        };

        // Для онлайн-оплат добавляем метаданные
        if (provider !== 'cash') {
            updateData.payment_data = {
                provider: provider,
                payment_id: `demo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                paid_at: now,
                mode: 'demo'
            };
        }

        const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', orderId);

        if (updateError) {
            console.error('Error updating order:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления заказа' }, { status: 500 });
        }

        // Создаем уведомление
        await supabase
            .from('notifications')
            .insert({
                user_id: session.user.id,
                title: provider === 'cash' ? 'Заказ оформлен' : 'Заказ оплачен',
                message: provider === 'cash' 
                    ? `Заказ №${order.order_number} оформлен. Ожидайте подтверждения.`
                    : `Заказ №${order.order_number} успешно оплачен. Спасибо за покупку!`,
                type: 'order',
                metadata: { order_id: orderId, provider, payment_method: provider },
                created_at: now,
                is_read: false
            });

        // Для СБП генерируем демо-QR-код
        let qrCode: string | null = null;
        if (provider === 'sbp') {
            qrCode = `https://qr.sbp.ru/demo/${orderId}?amount=${amount}`;
        }

        return NextResponse.json({ 
            success: true, 
            message: provider === 'cash' ? 'Заказ оформлен' : 'Платеж успешно обработан',
            qrCode
        });

    } catch (error) {
        console.error('Payment processing error:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}