import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { masterId } = await request.json();

    if (!masterId) {
        return NextResponse.json({ error: 'ID мастера обязателен' }, { status: 400 });
    }

    try {
        // Добавляем подписку (игнорируем, если уже существует)
        const { error: insertError } = await supabase
            .from('master_followers')
            .insert({
                master_id: masterId,
                follower_id: session.user.id
            })

        if (insertError && insertError.code !== '23505') { // 23505 = unique violation
            console.error('Error following master:', insertError);
            return NextResponse.json({ error: 'Ошибка при подписке' }, { status: 500 });
        }
        
        // Получаем обновленное количество подписчиков
        const { count, error: countError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', masterId)

        if (countError) {
            console.error('Error counting followers:', countError);
        }
        
        return NextResponse.json({ 
            is_following: true,
            followers_count: count || 0
        })
        
    } catch (error) {
        console.error('Error following master:', error);
        return NextResponse.json({ error: 'Ошибка при подписке' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { masterId } = await request.json();

    if (!masterId) {
        return NextResponse.json({ error: 'ID мастера обязателен' }, { status: 400 });
    }

    try {
        // Удаляем подписку
        const { error: deleteError } = await supabase
            .from('master_followers')
            .delete()
            .eq('master_id', masterId)
            .eq('follower_id', session.user.id)

        if (deleteError) {
            console.error('Error unfollowing master:', deleteError);
            return NextResponse.json({ error: 'Ошибка при отписке' }, { status: 500 });
        }
        
        // Получаем обновленное количество подписчиков
        const { count, error: countError } = await supabase
            .from('master_followers')
            .select('id', { count: 'exact', head: true })
            .eq('master_id', masterId)

        if (countError) {
            console.error('Error counting followers:', countError);
        }
        
        return NextResponse.json({ 
            is_following: false,
            followers_count: count || 0
        })
        
    } catch (error) {
        console.error('Error unfollowing master:', error);
        return NextResponse.json({ error: 'Ошибка при отписке' }, { status: 500 });
    }
}