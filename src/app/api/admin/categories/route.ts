// app/api/admin/categories/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

interface CategoryNode {
    id: number
    name: string
    description: string
    parent_category_id: number | null
    icon_url?: string
    products_count: number
    subcategories: CategoryNode[]
}

// Схемы валидации
const createCategorySchema = z.object({
    name: z.string().min(2, 'Название должно содержать минимум 2 символа').max(100),
    description: z.string().max(500, 'Описание не может превышать 500 символов').optional(),
    parent_category_id: z.string().optional(),
});

const updateCategorySchema = z.object({
    id: z.string().regex(/^\d+$/, 'ID должен быть числом'),
    name: z.string().min(2, 'Название должно содержать минимум 2 символа').max(100),
    description: z.string().max(500, 'Описание не может превышать 500 символов').optional(),
    parent_category_id: z.string().optional(),
    existingIconUrl: z.string().url('Неверный URL иконки').optional(),
});

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });
const putLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });
const deleteLimiter = rateLimit({ limit: 5, windowMs: 60 * 1000 });


export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin categories access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Используем кэширование из db-optimized
        const cacheKey = 'admin_categories_tree';
        
        const rootCategories = await cachedQuery(cacheKey, async () => {
            const { data: categories, error } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true })

            if (error) {
                logError('Error fetching categories', error);
                throw new Error('DATABASE_ERROR');
            }

            // Получаем количество товаров для каждой категории
            const { data: productCounts, error: countError } = await supabase
                .from('products')
                .select('category')
                .eq('status', 'active')

            const countMap = new Map()
            productCounts?.forEach(product => {
                countMap.set(product.category, (countMap.get(product.category) || 0) + 1)
            })

            // Строим дерево категорий
            const categoriesMap = new Map()

            categories?.forEach(cat => {
                categoriesMap.set(cat.id, {
                    ...cat,
                    name: sanitize.text(cat.name),
                    description: sanitize.text(cat.description || ''),
                    products_count: countMap.get(cat.name) || 0,
                    subcategories: []
                })
            })

            const rootCategories: CategoryNode[] = []
            categories?.forEach(cat => {
                if (cat.parent_category_id && categoriesMap.has(cat.parent_category_id)) {
                    const parent = categoriesMap.get(cat.parent_category_id)
                    parent.subcategories.push(categoriesMap.get(cat.id))
                } else if (!cat.parent_category_id) {
                    rootCategories.push(categoriesMap.get(cat.id))
                }
            })

            return rootCategories;
        }, 60); // TTL 60 секунд

        logApiRequest('GET', '/api/admin/categories', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(rootCategories, { 
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=60',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30'
            }
        })
        
    } catch (error) {
        logError('Error fetching categories', error);
        return NextResponse.json({ error: 'Ошибка загрузки категорий' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Rate limiting
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const formData = await request.formData()
        const name = sanitize.text(formData.get('name') as string)
        const description = sanitize.text(formData.get('description') as string)
        const parent_category_id = formData.get('parent_category_id') as string
        const iconFile = formData.get('icon') as File | null

        // Валидация
        const validatedData = createCategorySchema.parse({ name, description, parent_category_id: parent_category_id || undefined });

        // Проверка существования категории
        const { data: existing, error: checkError } = await supabase
            .from('categories')
            .select('id')
            .ilike('name', validatedData.name.trim())
            .eq('parent_category_id', parent_category_id ? parseInt(parent_category_id) : null)

        if (checkError) {
            logError('Error checking existing category', checkError);
            return NextResponse.json({ error: 'Ошибка проверки категории' }, { status: 500 });
        }

        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'Категория с таким названием уже существует' }, { status: 400 })
        }

        let iconUrl: string | null = null

        // Загружаем иконку в S3
        if (iconFile && iconFile.size > 0) {
            if (!iconFile.type.includes('svg') && !iconFile.type.includes('image')) {
                return NextResponse.json({ error: 'Поддерживаются только SVG изображения' }, { status: 400 });
            }
            if (iconFile.size > 5 * 1024 * 1024) {
                return NextResponse.json({ error: 'Размер иконки не должен превышать 5MB' }, { status: 400 });
            }
            iconUrl = await uploadToS3(iconFile, 'category-icons', `${Date.now()}-${validatedData.name.replace(/\s/g, '-')}`)
        }

        // Создаем категорию
        const { data: newCategory, error: insertError } = await supabase
            .from('categories')
            .insert({
                name: validatedData.name.trim(),
                description: validatedData.description || null,
                parent_category_id: parent_category_id ? parseInt(parent_category_id) : null,
                icon_url: iconUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single()

        if (insertError) {
            logError('Error creating category', insertError);
            return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 })
        }

        // Инвалидируем кэш
        invalidateCache('admin_categories_tree');
        invalidateCache(/^categories/);

        logApiRequest('POST', '/api/admin/categories', 201, Date.now() - startTime, session.user.id);
        logInfo('Category created', { categoryId: newCategory.id, name: newCategory.name });

        return NextResponse.json(newCategory, { status: 201 })
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0]?.message || 'Ошибка валидации';
            return NextResponse.json({ error: firstError }, { status: 400 });
        }
        logError('Error updating category', error);
        return NextResponse.json({ error: 'Ошибка обновления категории' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Rate limiting
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const formData = await request.formData()
        const id = formData.get('id') as string
        const name = sanitize.text(formData.get('name') as string)
        const description = sanitize.text(formData.get('description') as string)
        const parent_category_id = formData.get('parent_category_id') as string
        const iconFile = formData.get('icon') as File | null
        const existingIconUrl = formData.get('existingIconUrl') as string

        if (!id || !name) {
            return NextResponse.json({ error: 'ID и название категории обязательны' }, { status: 400 })
        }

        // Валидация
        const validatedData = updateCategorySchema.parse({
            id,
            name,
            description,
            parent_category_id: parent_category_id || undefined,
            existingIconUrl: existingIconUrl || undefined
        });

        // Получаем старую категорию
        const { data: oldCategory, error: fetchError } = await supabase
            .from('categories')
            .select('icon_url')
            .eq('id', parseInt(validatedData.id))
            .single()

        if (fetchError) {
            return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
        }

        // Проверка на циклическую ссылку
        if (parent_category_id && parseInt(parent_category_id) === parseInt(validatedData.id)) {
            return NextResponse.json({ error: 'Категория не может быть родителем самой себя' }, { status: 400 })
        }

        let iconUrl = validatedData.existingIconUrl || oldCategory?.icon_url

        // Загружаем новую иконку если есть
        if (iconFile && iconFile.size > 0) {
            if (!iconFile.type.includes('svg') && !iconFile.type.includes('image')) {
                return NextResponse.json({ error: 'Поддерживаются только SVG изображения' }, { status: 400 });
            }
            if (oldCategory?.icon_url) {
                await deleteFromS3(oldCategory.icon_url)
            }
            iconUrl = await uploadToS3(iconFile, 'category-icons', `${Date.now()}-${validatedData.name.replace(/\s/g, '-')}`)
        }

        // Обновляем категорию
        const { data: updatedCategory, error: updateError } = await supabase
            .from('categories')
            .update({
                name: validatedData.name.trim(),
                description: validatedData.description || null,
                parent_category_id: parent_category_id ? parseInt(parent_category_id) : null,
                icon_url: iconUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', parseInt(validatedData.id))
            .select()
            .single()

        if (updateError) {
            if (updateError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
            }
            logError('Error updating category', updateError);
            return NextResponse.json({ error: 'Ошибка обновления категории' }, { status: 500 })
        }

        // Инвалидируем кэш
        invalidateCache('admin_categories_tree');
        invalidateCache(/^categories/);

        logApiRequest('PUT', '/api/admin/categories', 200, Date.now() - startTime, session.user.id);
        logInfo('Category updated', { categoryId: updatedCategory.id, name: updatedCategory.name });

        return NextResponse.json(updatedCategory, { status: 200 })
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0]?.message || 'Ошибка валидации';
            return NextResponse.json({ error: firstError }, { status: 400 });
        }
        logError('Error creating category', error);
        return NextResponse.json({ error: 'Ошибка создания категории' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 })
        }

        // Rate limiting
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id || !/^\d+$/.test(id)) {
            return NextResponse.json({ error: 'ID категории обязателен и должен быть числом' }, { status: 400 })
        }

        // Получаем категорию
        const { data: category, error: fetchError } = await supabase
            .from('categories')
            .select('name, icon_url')
            .eq('id', parseInt(id))
            .single()

        if (fetchError) {
            return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 })
        }

        // Проверяем наличие подкатегорий
        const { count: subcategoriesCount, error: subError } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true })
            .eq('parent_category_id', parseInt(id))

        if (subError) {
            logError('Error checking subcategories', subError);
        }

        if (subcategoriesCount && subcategoriesCount > 0) {
            return NextResponse.json({ 
                error: 'Невозможно удалить категорию, так как у неё есть подкатегории' 
            }, { status: 400 })
        }

        // Проверяем, есть ли товары в этой категории
        const { count: productsCount, error: prodError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category', category.name)
            .eq('status', 'active')

        if (prodError) {
            logError('Error checking products', prodError);
        }

        if (productsCount && productsCount > 0) {
            return NextResponse.json({ 
                error: 'Невозможно удалить категорию, так как есть товары в этой категории' 
            }, { status: 400 })
        }

        // Удаляем иконку из S3
        if (category?.icon_url) {
            await deleteFromS3(category.icon_url)
        }

        const { error: deleteError } = await supabase
            .from('categories')
            .delete()
            .eq('id', parseInt(id))

        if (deleteError) {
            logError('Error deleting category', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 })
        }

        // Инвалидируем кэш
        invalidateCache('admin_categories_tree');
        invalidateCache(/^categories/);

        logApiRequest('DELETE', '/api/admin/categories', 200, Date.now() - startTime, session.user.id);
        logInfo('Category deleted', { categoryId: id, name: category.name });

        return NextResponse.json({ success: true, message: 'Категория удалена' }, { status: 200 })
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0]?.message || 'Ошибка валидации';
            return NextResponse.json({ error: firstError }, { status: 400 });
        }
        logError('Error deleting category', error);
        return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
    }
}