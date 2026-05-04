import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type MasterQueryResult = {
    id: string;
    email: string;
    created_at: string;
    profiles: Array<{
        full_name: string | null;
        avatar_url: string | null;
        city: string | null;
        address: string | null;
    }>;
    masters: Array<{
        total_sales: number | null;
        rating: number | null;
        reviews_count: number | null;
        is_verified: boolean;
        is_partner: boolean;
        custom_orders_enabled: boolean;
    }>;
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 20);
        const sortBy = searchParams.get('sortBy') || 'sales';

        let query = supabase
            .from('users')
            .select(`
                id,
                email,
                created_at,
                profiles!inner (
                    full_name,
                    avatar_url,
                    city,
                    address
                ),
                masters!inner (
                    total_sales,
                    rating,
                    reviews_count,
                    is_verified,
                    is_partner,
                    custom_orders_enabled
                )
            `)
            .eq('role', 'master')
            .eq('masters.is_verified', true);

        // Сортировка
        if (sortBy === 'rating') {
            query = query.order('rating', { ascending: false, referencedTable: 'masters' });
        } else if (sortBy === 'newest') {
            query = query.order('created_at', { ascending: false });
        } else {
            query = query.order('total_sales', { ascending: false, referencedTable: 'masters' });
        }

        const { data: masters, error } = await query.limit(limit);

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!masters || masters.length === 0) {
            return NextResponse.json([]);
        }

        const formatted = (masters as MasterQueryResult[]).map((m) => ({
            id: m.id,
            name: m.profiles?.[0]?.full_name || m.email?.split('@')[0] || 'Мастер',
            avatar_url: m.profiles?.[0]?.avatar_url || null,
            city: m.profiles?.[0]?.city || '',
            address: m.profiles?.[0]?.address || null,
            sales: m.masters?.[0]?.total_sales || 0,
            rating: m.masters?.[0]?.rating || 0,
            reviews_count: m.masters?.[0]?.reviews_count || 0,
            is_verified: m.masters?.[0]?.is_verified || false,
            is_partner: m.masters?.[0]?.is_partner || false,
            custom_orders_enabled: m.masters?.[0]?.custom_orders_enabled || false
        }));

        return NextResponse.json(formatted);
        
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}