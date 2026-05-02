import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { city, phone } = await request.json();

        // Обновляем роль пользователя
        const { error: userError } = await supabase
            .from('users')
            .update({ 
                role: 'master',
                role_selected: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', session.user.id);

        if (userError) {
            console.error('Error updating user role:', userError);
            return NextResponse.json({ error: 'Ошибка при обновлении роли' }, { status: 500 });
        }

        // Обновляем профиль (город и телефон)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
                city: city || null,
                phone: phone || null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user.id);

        if (profileError) {
            console.error('Error updating profile:', profileError);
        }

        // Создаем запись в таблице masters, если её нет
        const { data: existingMaster } = await supabase
            .from('masters')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (!existingMaster) {
            const { error: masterError } = await supabase
                .from('masters')
                .insert({
                    user_id: session.user.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (masterError) {
                console.error('Error creating master record:', masterError);
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Вы успешно стали мастером!' 
        });
        
    } catch (error) {
        console.error('Error in become-master:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}