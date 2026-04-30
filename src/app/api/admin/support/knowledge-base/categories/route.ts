import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    try {
        // Получаем все категории
        const { data: categories, error } = await supabase
            .from('knowledge_categories')
            .select(`
                *,
                knowledge_articles!left (
                    id,
                    is_published
                )
            `)
            .order('name', { ascending: true })

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json([], { status: 500 })
        }

        // Подсчитываем количество опубликованных статей для каждой категории
        const formattedCategories = categories?.map(category => {
            const publishedArticles = category.knowledge_articles?.filter(
                article => article.is_published === true
            ) || []
            
            return {
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                created_at: category.created_at,
                article_count: publishedArticles.length
            }
        }) || []

        return NextResponse.json(formattedCategories)
        
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json([], { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { name, slug, description } = await request.json();
    
    if (!name || !slug) {
        return NextResponse.json({ error: 'Название и slug обязательны' }, { status: 400 });
    }

    try {
        // Проверяем, существует ли категория с таким slug
        const { data: existing, error: checkError } = await supabase
            .from('knowledge_categories')
            .select('id')
            .eq('slug', slug)
            .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing category:', checkError)
            return NextResponse.json({ error: 'Ошибка проверки категории' }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: 'Категория с таким slug уже существует' }, { status: 400 })
        }

        // Создаем новую категорию
        const { data: newCategory, error: insertError } = await supabase
            .from('knowledge_categories')
            .insert({
                name,
                slug,
                description: description || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating category:', insertError)
            return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 })
        }

        return NextResponse.json(newCategory)
        
    } catch (error) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 })
    }
}