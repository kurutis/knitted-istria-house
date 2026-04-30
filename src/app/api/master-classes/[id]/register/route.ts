import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Необходимо авторизоваться' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Проверяем наличие мест
        const { data: masterClass, error: classError } = await supabase
            .from('master_classes')
            .select('current_participants, max_participants, status')
            .eq('id', id)
            .single()

        if (classError) {
            if (classError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
            }
            console.error('Error fetching master class:', classError);
            return NextResponse.json({ error: 'Ошибка при проверке мастер-класса' }, { status: 500 });
        }

        if (masterClass.status !== 'published') {
            return NextResponse.json({ error: 'Мастер-класс не доступен для записи' }, { status: 400 });
        }

        if (masterClass.current_participants >= masterClass.max_participants) {
            return NextResponse.json({ error: 'Нет свободных мест' }, { status: 400 });
        }

        // Проверяем, не записан ли уже пользователь
        const { data: existing, error: checkError } = await supabase
            .from('master_class_registrations')
            .select('id')
            .eq('master_class_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing registration:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки записи' }, { status: 500 });
        }

        if (existing) {
            return NextResponse.json({ error: 'Вы уже записаны на этот мастер-класс' }, { status: 400 });
        }

        // Добавляем запись
        const { error: insertError } = await supabase
            .from('master_class_registrations')
            .insert({
                master_class_id: id,
                user_id: session.user.id,
                payment_status: 'pending',
                created_at: new Date().toISOString()
            })

        if (insertError) {
            console.error('Error creating registration:', insertError);
            return NextResponse.json({ error: 'Ошибка при записи' }, { status: 500 });
        }

        // Увеличиваем количество участников
        const newParticipants = (masterClass.current_participants || 0) + 1

        const { error: updateError } = await supabase
            .from('master_classes')
            .update({ current_participants: newParticipants })
            .eq('id', id)

        if (updateError) {
            console.error('Error updating participants count:', updateError);
            // Не возвращаем ошибку, так как запись уже создана
        }

        // Создаем уведомление для мастера
        const { data: masterClassInfo } = await supabase
            .from('master_classes')
            .select('master_id, title')
            .eq('id', id)
            .single()

        if (masterClassInfo) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: masterClassInfo.master_id,
                    title: 'Новая запись на мастер-класс',
                    message: `Пользователь ${session.user.email || session.user.name} записался на "${masterClassInfo.title}"`,
                    type: 'master_class_registration',
                    metadata: { master_class_id: id, user_id: session.user.id },
                    created_at: new Date().toISOString()
                })
        }

        return NextResponse.json({ success: true, message: 'Вы успешно записались' })
        
    } catch (error) {
        console.error('Error registering for master class:', error);
        return NextResponse.json({ error: 'Ошибка при записи' }, { status: 500 });
    }
}