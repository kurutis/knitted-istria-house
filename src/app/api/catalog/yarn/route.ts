import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const { data: yarn, error } = await supabase
            .from('yarn_catalog')
            .select('id, name, article, brand, color, in_stock, price')
            .eq('in_stock', true)
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching yarn:', error);
            return NextResponse.json({ error: error.message || 'Ошибка загрузки пряжи' }, { status: 500 });
        }

        return NextResponse.json(yarn || [], { status: 200 })
        
    } catch (error: any) {
        console.error('Error fetching yarn:', error);
        return NextResponse.json({ error: error.message || 'Ошибка загрузки пряжи' }, { status: 500 });
    }
}