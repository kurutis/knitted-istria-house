// app/api/masters/top/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    try {
        console.log('API /api/masters/top called');
        
        // Простой запрос без join'ов
        const { data: masters, error } = await supabase
            .from('users')
            .select('id, email, role, created_at')
            .eq('role', 'master')
            .limit(6);

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('Masters found:', masters?.length);

        // Базовый ответ
        const formatted = masters?.map(m => ({
            id: m.id,
            name: m.email?.split('@')[0] || 'Мастер',
            email: m.email,
            avatar_url: null,
            sales: 0,
            rating: 0
        })) || [];

        return NextResponse.json(formatted);
        
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}