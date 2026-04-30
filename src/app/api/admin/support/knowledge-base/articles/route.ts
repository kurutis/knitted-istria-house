import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    try {
        // Начинаем строить запрос
        let query = supabase
            .from('knowledge_articles')
            .select(`
                *,
                knowledge_categories!inner (
                    id,
                    name,
                    slug
                ),
                users!inner (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                )
            `)

        // Фильтр по категории (по slug)
        if (category) {
            query = query.eq('knowledge_categories.slug', category)
        }

        // Поиск по заголовку или содержанию
        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
        }

        // Сортировка
        query = query.order('created_at', { ascending: false })

        const { data: articles, error } = await query

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json([], { status: 500 })
        }

        // Форматируем данные
        const formattedArticles = articles?.map(article => ({
            ...article,
            category_name: article.knowledge_categories?.name,
            category_slug: article.knowledge_categories?.slug,
            author_name: article.users?.profiles?.full_name || article.users?.email,
            author_avatar: article.users?.profiles?.avatar_url
        })) || []

        return NextResponse.json(formattedArticles)
        
    } catch (error) {
        console.error('Error fetching articles:', error)
        return NextResponse.json([], { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { title, content, category, tags, is_published } = await request.json();
    
    if (!title || !content || !category) {
        return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 });
    }

    try {
        // Находим ID категории по slug
        const { data: categoryData, error: categoryError } = await supabase
            .from('knowledge_categories')
            .select('id')
            .eq('slug', category)
            .single()

        if (categoryError || !categoryData) {
            return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 });
        }

        const categoryId = categoryData.id;

        // Создаем новую статью
        const { data: newArticle, error: insertError } = await supabase
            .from('knowledge_articles')
            .insert({
                title,
                content,
                category_id: categoryId,
                tags: tags || null,
                author_id: session.user.id,
                is_published: is_published !== false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select(`
                *,
                knowledge_categories (
                    id,
                    name,
                    slug
                )
            `)
            .single()

        if (insertError) {
            console.error('Supabase error:', insertError)
            return NextResponse.json({ error: 'Ошибка создания статьи' }, { status: 500 })
        }

        // Форматируем ответ
        const formattedArticle = {
            ...newArticle,
            category_name: newArticle.knowledge_categories?.name,
            category_slug: newArticle.knowledge_categories?.slug,
            author_name: session.user.email
        }

        return NextResponse.json(formattedArticle)
        
    } catch (error) {
        console.error('Error creating article:', error)
        return NextResponse.json({ error: 'Ошибка создания статьи' }, { status: 500 })
    }
}