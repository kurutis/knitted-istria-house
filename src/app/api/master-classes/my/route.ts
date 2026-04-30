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
        // Получаем ID мастер-классов, на которые записан пользователь
        const { data: registrations, error: regError } = await supabase
            .from('master_class_registrations')
            .select('master_class_id, payment_status, created_at')
            .eq('user_id', session.user.id);

        if (regError) {
            console.error('Error fetching registrations:', regError);
            return NextResponse.json([], { status: 500 });
        }

        if (!registrations || registrations.length === 0) {
            return NextResponse.json([]);
        }

        const masterClassIds = registrations.map(r => r.master_class_id);
        
        // Получаем информацию о мастер-классах
        const { data: masterClasses, error: mcError } = await supabase
            .from('master_classes')
            .select(`
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
            `)
            .in('id', masterClassIds)
            .order('date_time', { ascending: true });

        if (mcError) {
            console.error('Error fetching master classes:', mcError);
            return NextResponse.json([], { status: 500 });
        }

        // Создаем Map для быстрого доступа к информации о регистрации
        const registrationMap = new Map();
        registrations.forEach(reg => {
            registrationMap.set(reg.master_class_id, {
                payment_status: reg.payment_status,
                registered_at: reg.created_at
            });
        });

        // Форматируем результат
        const formattedClasses = masterClasses?.map(mc => ({
            id: registrationMap.get(mc.id)?.id,
            payment_status: registrationMap.get(mc.id)?.payment_status || 'pending',
            registered_at: registrationMap.get(mc.id)?.registered_at,
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
        })) || [];

        return NextResponse.json(formattedClasses);
        
    } catch (error) {
        console.error('Error fetching my master classes:', error);
        return NextResponse.json([], { status: 500 });
    }
}