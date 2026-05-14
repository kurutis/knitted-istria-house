import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json([], { status: 200 });
        }

        const { data: categories, error } = await supabase
            .from('knowledge_categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching categories:', error);
            return NextResponse.json([], { status: 200 });
        }

        // Считаем количество статей в каждой категории
        const categoriesWithCount = await Promise.all(
            (categories || []).map(async (cat) => {
                const { count } = await supabase
                    .from('knowledge_articles')
                    .select('id', { count: 'exact', head: true })
                    .eq('category_id', cat.id)
                    .eq('is_published', true);

                return {
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug,
                    description: cat.description,
                    article_count: count || 0,
                    created_at: cat.created_at,
                    updated_at: cat.updated_at
                };
            })
        );

        return NextResponse.json(categoriesWithCount, { status: 200 });
        
    } catch (error) {
        console.error('Error in categories GET:', error);
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
        const { name, slug, description } = body;

        if (!name || !slug) {
            return NextResponse.json({ error: 'Название и slug обязательны' }, { status: 400 });
        }

        // Проверяем уникальность slug
        const { data: existing } = await supabase
            .from('knowledge_categories')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Категория с таким slug уже существует' }, { status: 400 });
        }

        const { data: category, error: insertError } = await supabase
            .from('knowledge_categories')
            .insert({
                name: name.trim(),
                slug: slug.toLowerCase().trim(),
                description: description?.trim() || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating category:', insertError);
            return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            category,
            message: 'Категория создана'
        }, { status: 201 });
        
    } catch (error) {
        console.error('Error in categories POST:', error);
        return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 });
    }
}