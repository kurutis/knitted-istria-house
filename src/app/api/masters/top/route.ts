// app/api/masters/top/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 20);
        const sortBy = searchParams.get('sortBy') || 'rating';

        // 1. Получаем пользователей с ролью master
        let usersQuery = supabase
            .from('users')
            .select('id, email, created_at')
            .eq('role', 'master')
            .eq('is_banned', false);

        if (sortBy === 'newest') {
            usersQuery = usersQuery.order('created_at', { ascending: false });
        }

        const { data: users, error: usersError } = await usersQuery.limit(limit);

        if (usersError) {
            console.error('Supabase error:', usersError);
            return NextResponse.json({ error: usersError.message }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json([]);
        }

        const userIds = users.map(u => u.id);

        // 2. Получаем профили для этих пользователей
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, city, address')
            .in('user_id', userIds);

        // 3. Получаем данные мастеров
        let mastersQuery = supabase
            .from('masters')
            .select('user_id, total_sales, rating, is_verified, is_partner, custom_orders_enabled')
            .in('user_id', userIds);

        if (sortBy === 'rating') {
            mastersQuery = mastersQuery.order('rating', { ascending: false });
        } else if (sortBy === 'sales') {
            mastersQuery = mastersQuery.order('total_sales', { ascending: false });
        }

        const { data: masters, error: mastersError } = await mastersQuery;

        // Создаем Map для быстрого доступа
        const profilesMap = new Map();
        profiles?.forEach(p => profilesMap.set(p.user_id, p));

        const mastersMap = new Map();
        masters?.forEach(m => mastersMap.set(m.user_id, m));

        // Формируем результат
        const formatted = users.map(user => {
            const profile = profilesMap.get(user.id);
            const master = mastersMap.get(user.id);
            
            return {
                id: user.id,
                name: profile?.full_name || user.email?.split('@')[0] || 'Мастер',
                avatar_url: profile?.avatar_url || null,
                city: profile?.city || '',
                address: profile?.address || null,
                sales: master?.total_sales || 0,
                rating: master?.rating || 0,
                is_verified: master?.is_verified || false,
                is_partner: master?.is_partner || false,
                custom_orders_enabled: master?.custom_orders_enabled || false,
            };
        });

        // Сортировка результатов
        if (sortBy === 'rating') {
            formatted.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'sales') {
            formatted.sort((a, b) => b.sales - a.sales);
        }

        return NextResponse.json(formatted);
        
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}