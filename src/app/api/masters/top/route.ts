import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const { data: masters, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                profiles!left (
                    full_name,
                    avatar_url,
                    city
                ),
                masters!inner (
                    total_sales,
                    rating,
                    is_verified,
                    is_partner
                )
            `)
            .eq('role', 'master')
            .eq('masters.is_verified', true)
            .order('total_sales', { ascending: false, nullsFirst: false, referencedTable: 'masters' })
            .limit(6);

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json([], { status: 200 });
        }

        if (!masters || !Array.isArray(masters)) {
            return NextResponse.json([], { status: 200 });
        }

        const formattedMasters = masters.map(master => ({
            id: master.id,
            name: master.profiles?.full_name || master.email,
            avatar_url: master.profiles?.avatar_url || null,
            city: master.profiles?.city || '',
            total_sales: master.masters?.total_sales || 0,
            rating: master.masters?.rating || 0,
            is_verified: master.masters?.is_verified || false,
            is_partner: master.masters?.is_partner || false
        }));

        return NextResponse.json(formattedMasters, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching top masters:', error);
        return NextResponse.json([], { status: 200 });
    }
}