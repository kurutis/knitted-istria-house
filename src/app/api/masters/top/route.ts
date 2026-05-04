// app/api/masters/top/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 20);
        const sortBy = searchParams.get('sortBy') || 'rating';

        // Базовый запрос
        let query = supabase
            .from('users')
            .select(`
                id,
                email,
                created_at,
                profiles!user_id (
                    full_name,
                    avatar_url,
                    city,
                    address
                ),
                masters!user_id (
                    total_sales,
                    rating,
                    reviews_count,
                    is_verified,
                    is_partner,
                    custom_orders_enabled
                )
            `)
            .eq('role', 'master')
            .eq('is_banned', false);

        // Сортировка
        if (sortBy === 'rating') {
            query = query.order('rating', { ascending: false, referencedTable: 'masters' });
        } else if (sortBy === 'sales') {
            query = query.order('total_sales', { ascending: false, referencedTable: 'masters' });
        } else if (sortBy === 'newest') {
            query = query.order('created_at', { ascending: false });
        }

        const { data: users, error: usersError } = await query.limit(limit);

        if (usersError) {
            console.error('Supabase error:', usersError);
            return NextResponse.json({ error: usersError.message }, { status: 500 });
        }

        if (!users || users.length === 0) {
            return NextResponse.json([]);
        }

        // Форматируем ответ
        const formatted = users.map(user => ({
            id: user.id,
            name: user.profiles?.[0]?.full_name || user.email?.split('@')[0] || 'Мастер',
            avatar_url: user.profiles?.[0]?.avatar_url || null,
            city: user.profiles?.[0]?.city || '',
            address: user.profiles?.[0]?.address || null,
            sales: user.masters?.[0]?.total_sales || 0,
            rating: user.masters?.[0]?.rating || 0,
            reviews_count: user.masters?.[0]?.reviews_count || 0,
            is_verified: user.masters?.[0]?.is_verified || false,
            is_partner: user.masters?.[0]?.is_partner || false,
            custom_orders_enabled: user.masters?.[0]?.custom_orders_enabled || false,
        }));

        return NextResponse.json(formatted);
        
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}