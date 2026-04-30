import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        // Получаем опубликованные мастер-классы на будущие даты
        let query = supabase
            .from('master_classes')
            .select(`
                *,
                users!inner (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                ),
                master_class_registrations!left (
                    user_id
                )
            `)
            .eq('status', 'published')
            .gt('date_time', new Date().toISOString())
            .order('date_time', { ascending: true })

        const { data: masterClasses, error } = await query

        if (error) {
            console.error('Error fetching master classes:', error);
            return NextResponse.json([], { status: 500 });
        }

        // Форматируем данные и проверяем, записан ли пользователь
        const formattedClasses = masterClasses?.map(mc => {
            let isRegistered = false
            if (userId) {
                isRegistered = mc.master_class_registrations?.some(
                    (reg: any) => reg.user_id === userId
                ) || false
            }

            return {
                id: mc.id,
                title: mc.title,
                description: mc.description,
                type: mc.type,
                status: mc.status,
                price: mc.price,
                max_participants: mc.max_participants,
                current_participants: mc.current_participants,
                date_time: mc.date_time,
                duration_minutes: mc.duration_minutes,
                location: mc.location,
                online_link: mc.online_link,
                materials: mc.materials,
                image_url: mc.image_url,
                created_at: mc.created_at,
                updated_at: mc.updated_at,
                master_id: mc.master_id,
                master_name: mc.users?.profiles?.full_name || mc.users?.email,
                master_avatar: mc.users?.profiles?.avatar_url,
                is_registered: isRegistered
            }
        }) || []

        return NextResponse.json(formattedClasses)
        
    } catch (error) {
        console.error('Error fetching master classes:', error);
        return NextResponse.json([], { status: 500 });
    }
}