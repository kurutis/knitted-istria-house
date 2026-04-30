import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;
    const { is_published } = await request.json();

    try {
        // Обновляем статус публикации статьи
        const { data: article, error } = await supabase
            .from('knowledge_articles')
            .update({
                is_published: is_published,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('id')
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
            }
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Ошибка изменения статуса' }, { status: 500 });
        }
        
        if (!article) {
            return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error toggling publish:', error);
        return NextResponse.json({ error: 'Ошибка изменения статуса' }, { status: 500 });
    }
}