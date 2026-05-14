import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// WebSocket сервер будет работать через отдельный endpoint
// Этот файл нужен для GET запроса, который инициирует WebSocket соединение

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Проверяем, что это WebSocket upgrade запрос
    const upgradeHeader = request.headers.get('upgrade');
    
    if (upgradeHeader !== 'websocket') {
        return NextResponse.json({ error: 'WebSocket upgrade required' }, { status: 426 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем права администратора
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (userError || user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // WebSocket соединение будет обработано отдельным обработчиком
    // Этот endpoint возвращает 101 Switching Protocols
    return new NextResponse(null, {
        status: 101,
        headers: {
            'Upgrade': 'websocket',
            'Connection': 'Upgrade',
        },
    });
}