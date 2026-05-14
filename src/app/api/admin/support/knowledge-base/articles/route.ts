import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json([], { status: 200 }); // Возвращаем пустой массив вместо ошибки
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        let query = supabase
            .from('knowledge_articles')
            .select(`
                *,
                knowledge_categories!left (
                    id,
                    name,
                    slug
                )
            `);

        if (category && category !== 'all' && category !== 'null') {
            query = query.eq('knowledge_categories.slug', category);
        }

        if (search && search !== 'null') {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        const { data: articles, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching articles:', error);
            return NextResponse.json([], { status: 200 });
        }

        const formattedArticles = articles?.map(article => ({
            id: article.id,
            title: article.title || 'Без названия',
            content: article.content || '',
            category: article.knowledge_categories?.slug || 'general',
            category_name: article.knowledge_categories?.name || 'Общее',
            tags: article.tags || [],
            author_id: article.author_id,
            author_name: 'Администратор',
            views: article.views || 0,
            helpful_count: article.helpful_count || 0,
            not_helpful_count: article.not_helpful_count || 0,
            is_published: article.is_published || false,
            created_at: article.created_at,
            updated_at: article.updated_at
        })) || [];

        return NextResponse.json(formattedArticles, { status: 200 });
        
    } catch (error) {
        console.error('Error in knowledge articles GET:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const body = await request.json();
        const { title, content, category, tags, is_published } = body;

        if (!title || !content || !category) {
            return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 });
        }

        // Находим ID категории
        const { data: categoryData, error: categoryError } = await supabase
            .from('knowledge_categories')
            .select('id')
            .eq('slug', category)
            .single();

        if (categoryError || !categoryData) {
            return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const tagsArray = tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

        const { data: article, error: insertError } = await supabase
            .from('knowledge_articles')
            .insert({
                title: title.trim(),
                content: content.trim(),
                excerpt: content.trim().substring(0, 200),
                category_id: categoryData.id,
                tags: tagsArray,
                author_id: session.user.id,
                is_published: is_published || false,
                created_at: now,
                updated_at: now,
                ...(is_published && { published_at: now })
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating article:', insertError);
            return NextResponse.json({ error: 'Ошибка создания статьи: ' + insertError.message }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            article,
            message: is_published ? 'Статья опубликована' : 'Черновик сохранён'
        }, { status: 201 });
        
    } catch (error) {
        console.error('Error in POST knowledge:', error);
        return NextResponse.json({ error: 'Ошибка создания статьи' }, { status: 500 });
    }
}