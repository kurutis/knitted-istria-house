import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json([], { status: 401 });
    }

    try {
        // Получаем записи пользователя на мастер-классы
        const { data: registrations, error } = await supabase
            .from('master_class_registrations')
            .select(`
                id,
                payment_status,
                created_at as registered_at,
                master_class_id,
                master_classes!inner (
                    id,
                    title,
                    description,
                    type,
                    status,
                    price,
                    max_participants,
                    current_participants,
                    date_time,
                    duration_minutes,
                    location,
                    online_link,
                    materials,
                    image_url,
                    created_at,
                    updated_at,
                    master_id,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                )
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching my master classes:', error);
            return NextResponse.json([], { status: 500 });
        }

        // Форматируем данные
        const formattedClasses = registrations?.map(reg => {
            const mc = reg.master_classes
            return {
                id: reg.id,
                payment_status: reg.payment_status,
                registered_at: reg.registered_at,
                master_class: {
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
                    master_avatar: mc.users?.profiles?.avatar_url
                }
            }
        }) || []

        return NextResponse.json(formattedClasses)
        
    } catch (error) {
        console.error('Error fetching my master classes:', error);
        return NextResponse.json([], { status: 500 });
    }
}