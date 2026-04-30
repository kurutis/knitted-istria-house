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
    const { title, content, category, tags, is_published } = await request.json();

    try {
        // Сначала находим ID категории по slug
        const { data: categoryData, error: categoryError } = await supabase
            .from('knowledge_categories')
            .select('id')
            .eq('slug', category)
            .single()

        if (categoryError || !categoryData) {
            return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 });
        }

        const categoryId = categoryData.id;

        // Обновляем статью
        const { data: updatedArticle, error: updateError } = await supabase
            .from('knowledge_articles')
            .update({
                title,
                content,
                category_id: categoryId,
                tags: tags || null,
                is_published: is_published !== false,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                *,
                knowledge_categories (
                    id,
                    name,
                    slug
                )
            `)
            .single()

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
            }
            console.error('Supabase error:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статьи' }, { status: 500 });
        }

        // Форматируем ответ в нужный формат
        const formattedArticle = {
            ...updatedArticle,
            category_name: updatedArticle.knowledge_categories?.name,
            category_slug: updatedArticle.knowledge_categories?.slug
        }

        return NextResponse.json(formattedArticle);
        
    } catch (error) {
        console.error('Error updating article:', error);
        return NextResponse.json({ error: 'Ошибка обновления статьи' }, { status: 500 });
    }
}

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
        // Удаляем статью
        const { data: deletedArticle, error } = await supabase
            .from('knowledge_articles')
            .delete()
            .eq('id', id)
            .select('id')
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
            }
            console.error('Supabase error:', error);
            return NextResponse.json({ error: 'Ошибка удаления статьи' }, { status: 500 });
        }

        if (!deletedArticle) {
            return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error deleting article:', error);
        return NextResponse.json({ error: 'Ошибка удаления статьи' }, { status: 500 });
    }
}