import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    try {
        // Получаем данные мастера с профилем
        const { data: master, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                created_at,
                role,
                profiles!left (
                    full_name,
                    phone,
                    city,
                    avatar_url
                ),
                masters!left (
                    description,
                    is_verified,
                    is_partner,
                    rating,
                    total_sales,
                    custom_orders_enabled
                )
            `)
            .eq('id', id)
            .eq('role', 'master')
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
            }
            console.error('Error fetching master:', error);
            return NextResponse.json({ error: 'Ошибка загрузки мастера' }, { status: 500 });
        }

        // Получаем количество подписчиков
        const { count: followersCount, error: followersError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', id)

        if (followersError) {
            console.error('Error fetching followers count:', followersError);
        }

        // Форматируем ответ
        const formattedMaster = {
            id: master.id,
            email: master.email,
            member_since: master.created_at,
            name: master.profiles?.full_name || master.email,
            phone: master.profiles?.phone || '',
            city: master.profiles?.city || '',
            avatar_url: master.profiles?.avatar_url || null,
            description: master.masters?.description || '',
            is_verified: master.masters?.is_verified || false,
            is_partner: master.masters?.is_partner || false,
            rating: master.masters?.rating || 0,
            total_sales: master.masters?.total_sales || 0,
            custom_orders_enabled: master.masters?.custom_orders_enabled || false,
            pieces_created: master.masters?.total_sales || 0,
            followers_count: followersCount || 0
        }

        return NextResponse.json(formattedMaster)
        
    } catch (error) {
        console.error('Error fetching master:', error);
        return NextResponse.json({ error: 'Ошибка загрузки мастера' }, { status: 500 });
    }
}