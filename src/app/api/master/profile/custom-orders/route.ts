import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        if (session.user.role !== 'master') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
        }

        const { custom_orders_enabled } = await request.json();

        if (typeof custom_orders_enabled !== 'boolean') {
            return NextResponse.json({ error: 'Некорректное значение' }, { status: 400 });
        }

        console.log('Updating custom_orders_enabled to:', custom_orders_enabled);
        console.log('User ID:', session.user.id);

        const { data, error } = await supabase
            .from('masters')
            .update({ 
                custom_orders_enabled,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user.id)
            .select('custom_orders_enabled');

        if (error) {
            console.error('Error updating custom orders status:', error);
            return NextResponse.json({ error: 'Ошибка обновления статуса: ' + error.message }, { status: 500 });
        }

        console.log('Update result:', data);

        return NextResponse.json({ 
            success: true, 
            custom_orders_enabled,
            message: custom_orders_enabled 
                ? 'Вы теперь принимаете индивидуальные заказы' 
                : 'Вы больше не принимаете индивидуальные заказы'
        });
        
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}