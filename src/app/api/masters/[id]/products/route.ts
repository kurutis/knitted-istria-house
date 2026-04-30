import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id,
                title,
                price,
                main_image_url,
                created_at,
                views
            `)
            .eq('master_id', id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching master products:', error);
            return NextResponse.json([], { status: 500 });
        }

        return NextResponse.json(products || [])
        
    } catch (error) {
        console.error('Error fetching master products:', error);
        return NextResponse.json([], { status: 500 });
    }
}