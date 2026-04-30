import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Находим или создаем категорию "general" по умолчанию
        let defaultId: number;
        
        const { data: defaultCategory, error: findError } = await supabase
            .from('knowledge_categories')
            .select('id')
            .eq('slug', 'general')
            .maybeSingle();

        if (findError && findError.code !== 'PGRST116') {
            console.error('Error finding default category:', findError);
            return NextResponse.json({ error: 'Ошибка поиска категории' }, { status: 500 });
        }

        if (defaultCategory) {
            defaultId = defaultCategory.id;
        } else {
            // Создаем категорию по умолчанию
            const { data: newCategory, error: createError } = await supabase
                .from('knowledge_categories')
                .insert({
                    name: 'Общее',
                    slug: 'general',
                    description: 'Общие вопросы',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating default category:', createError);
                return NextResponse.json({ error: 'Ошибка создания категории по умолчанию' }, { status: 500 });
            }
            
            defaultId = newCategory.id;
        }

        // Переносим все статьи из удаляемой категории в категорию по умолчанию
        const { error: updateError } = await supabase
            .from('knowledge_articles')
            .update({ category_id: defaultId })
            .eq('category_id', id);

        if (updateError) {
            console.error('Error moving articles:', updateError);
            return NextResponse.json({ error: 'Ошибка переноса статей' }, { status: 500 });
        }

        // Удаляем категорию
        const { error: deleteError } = await supabase
            .from('knowledge_categories')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting category:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
    }
}