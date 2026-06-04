// app/api/master/profile/custom-orders/route.ts
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

        const { custom_orders_enabled } = await request.json();

        if (typeof custom_orders_enabled !== 'boolean') {
            return NextResponse.json({ error: 'Некорректное значение' }, { status: 400 });
        }

        // Прямое обновление без select, только update
        const { error } = await supabase
            .from('masters')
            .update({ 
                custom_orders_enabled: custom_orders_enabled,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Update error:', error);
            return NextResponse.json({ error: 'Ошибка БД: ' + error.message }, { status: 500 });
        }

        // Проверяем, что обновилось (читаем обратно)
        const { data: check, error: checkError } = await supabase
            .from('masters')
            .select('custom_orders_enabled')
            .eq('user_id', session.user.id)
            .single();

        if (checkError) {
            console.error('Check error:', checkError);
        }

        return NextResponse.json({ 
            success: true, 
            custom_orders_enabled: check?.custom_orders_enabled ?? custom_orders_enabled
        });
        
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}