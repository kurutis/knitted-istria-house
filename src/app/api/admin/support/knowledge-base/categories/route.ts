import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

interface CategoryWithArticles {
    id: number
    name: string
    slug: string
    description: string | null
    created_at: string
    updated_at: string
    article_count: number
    total_articles: number
    has_published: boolean
}

interface CachedData {
    data: CategoryWithArticles[]
    expires: number
}

interface KnowledgeArticle {
    id: string
    is_published: boolean
}

// Схема валидации для POST запроса
const createCategorySchema = z.object({
    name: z.string().min(2, 'Название должно содержать минимум 2 символа').max(100),
    slug: z.string().min(2, 'Slug должен содержать минимум 2 символа').max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug может содержать только строчные буквы, цифры и дефисы'),
    description: z.string().max(500, 'Описание не может превышать 500 символов').optional(),
});

// Rate limiting для POST запросов
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Кэширование для GET запросов
const cacheStore = new Map<string, CachedData>();

async function getCachedCategories() {
    const cached = cacheStore.get('knowledge_categories');
    if (cached && cached.expires > Date.now()) {
        return cached.data;
    }
    return null;
}

async function setCachedCategories(data: CategoryWithArticles[]) {
    cacheStore.set('knowledge_categories', {
        data,
        expires: Date.now() + 300 * 1000 // 5 минут
    });
}

export async function clearCategoriesCache() {
    cacheStore.delete('knowledge_categories');
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        // Проверяем кэш
        const cachedCategories = await getCachedCategories();
        if (cachedCategories) {
            return NextResponse.json(cachedCategories, {
                status: 200,
                headers: { 'Cache-Control': 'private, max-age=300' }
            });
        }

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
            .order('name', { ascending: true });

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json([], { status: 500 });
        }

        // Подсчитываем количество опубликованных статей для каждой категории
        const formattedCategories = categories?.map(category => {
            const publishedArticles = (category.knowledge_articles as KnowledgeArticle[] | null)?.filter(
                article => article.is_published === true
            ) || [];
            
            // Подсчёт всех статей (включая черновики) для администратора
            const allArticles = category.knowledge_articles?.length || 0;
            
            return {
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                created_at: category.created_at,
                updated_at: category.updated_at,
                article_count: publishedArticles.length,
                total_articles: allArticles,
                has_published: publishedArticles.length > 0
            };
        }) || [];

        // Сохраняем в кэш
        await setCachedCategories(formattedCategories);

        return NextResponse.json(formattedCategories, {
            status: 200,
            headers: { 'Cache-Control': 'private, max-age=300' }
        });
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = createCategorySchema.parse({
            name: body.name,
            slug: body.slug,
            description: body.description
        });

        const { name, slug, description } = validatedData;

        // Проверяем, существует ли категория с таким slug
        const { data: existing, error: checkError } = await supabase
            .from('knowledge_categories')
            .select('id, slug')
            .eq('slug', slug)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing category:', checkError);
            return NextResponse.json({ error: 'Ошибка проверки категории' }, { status: 500 });
        }

        if (existing) {
            return NextResponse.json({ 
                error: `Категория с slug "${slug}" уже существует` 
            }, { status: 400 });
        }

        // Проверяем на дубликат по имени
        const { data: existingByName } = await supabase
            .from('knowledge_categories')
            .select('id')
            .eq('name', name)
            .maybeSingle();

        if (existingByName) {
            return NextResponse.json({ 
                error: `Категория с названием "${name}" уже существует` 
            }, { status: 400 });
        }

        // Создаем новую категорию
        const { data: newCategory, error: insertError } = await supabase
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

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'KNOWLEDGE_CATEGORY_CREATED',
                entity_type: 'knowledge_category',
                entity_id: newCategory.id,
                new_values: { name: name, slug: slug },
                created_at: new Date().toISOString()
            });

        // Очищаем кэш
        await clearCategoriesCache();

        return NextResponse.json({ 
            success: true,
            message: 'Категория успешно создана',
            category: {
                id: newCategory.id,
                name: newCategory.name,
                slug: newCategory.slug,
                description: newCategory.description,
                created_at: newCategory.created_at
            }
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 });
    }
}