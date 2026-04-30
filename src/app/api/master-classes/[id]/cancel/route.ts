import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Необходимо авторизоваться' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Проверяем, существует ли запись
        const { data: existing, error: checkError } = await supabase
            .from('master_class_registrations')
            .select('id')
            .eq('master_class_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking registration:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки записи' }, { status: 500 });
        }

        if (!existing) {
            return NextResponse.json({ error: 'Вы не записаны на этот мастер-класс' }, { status: 400 });
        }

        // Удаляем запись
        const { error: deleteError } = await supabase
            .from('master_class_registrations')
            .delete()
            .eq('master_class_id', id)
            .eq('user_id', session.user.id)

        if (deleteError) {
            console.error('Error deleting registration:', deleteError);
            return NextResponse.json({ error: 'Ошибка при отмене записи' }, { status: 500 });
        }

        // Уменьшаем количество участников
        const { data: masterClass, error: fetchError } = await supabase
            .from('master_classes')
            .select('current_participants')
            .eq('id', id)
            .single()

        if (fetchError) {
            console.error('Error fetching master class:', fetchError);
            return NextResponse.json({ error: 'Ошибка при обновлении количества участников' }, { status: 500 });
        }

        const newParticipants = Math.max((masterClass?.current_participants || 1) - 1, 0)

        const { error: updateError } = await supabase
            .from('master_classes')
            .update({ current_participants: newParticipants })
            .eq('id', id)

        if (updateError) {
            console.error('Error updating participants count:', updateError);
            return NextResponse.json({ error: 'Ошибка при обновлении количества участников' }, { status: 500 });
        }

        return NextResponse.json({ success: true })
        
    } catch (error) {
        console.error('Error canceling registration:', error);
        return NextResponse.json({ error: 'Ошибка при отмене записи' }, { status: 500 });
    }
}