import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";

interface CategoryNode {
    id: number
    name: string
    description: string
    parent_category_id: number | null
    icon_url?: string
    slug: string
    sort_order: number
    products_count: number
    subcategories: CategoryNode[]
    level: number
    path: string[]
}

// Rate limiting для публичного эндпоинта
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        // 1. Rate limiting - исправлено: передаем request, а не ip
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for categories', { ip: getClientIP(request) });
            return NextResponse.json({ 
                categories: [], 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // 2. Кэширование результата
        const cacheKey = 'categories_full_tree';
        const result = await cachedQuery(cacheKey, async () => {
            // 3. Оптимизированный запрос - получаем все категории одним запросом
            const { data: categories, error } = await supabase
                .from('categories')
                .select('id, name, description, parent_category_id, icon_url, slug, sort_order')
                .eq('is_active', true)
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true });

            if (error) {
                logError('Error fetching categories', error);
                throw new Error(error.message);
            }

            if (!categories || categories.length === 0) {
                return { categories: [] };
            }

            // 4. Оптимизированный подсчет товаров - один запрос
            const { data: productsCount } = await supabase
                .from('products')
                .select('category_id')
                .eq('status', 'active')
                .not('category_id', 'is', null);

            // Создаем Map для быстрого доступа к количеству товаров
            const countMap = new Map();
            if (productsCount) {
                productsCount.forEach(p => {
                    if (p.category_id) {
                        countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1);
                    }
                });
            }

            // 5. Оптимизированное построение дерева (один проход)
            const categoriesMap = new Map();
            const rootCategories = [];

            // Первый проход: создаем Map со всеми категориями с санитизацией
            for (const cat of categories) {
                categoriesMap.set(cat.id, {
                    id: cat.id,
                    name: sanitize.text(cat.name),
                    description: sanitize.text(cat.description || ''),
                    parent_category_id: cat.parent_category_id,
                    icon_url: cat.icon_url,
                    slug: cat.slug,
                    sort_order: cat.sort_order || 0,
                    products_count: countMap.get(cat.id) || 0,
                    subcategories: [],
                    level: 0,
                    path: [sanitize.text(cat.name)]
                });
            }

            // Второй проход: формируем дерево
            for (const cat of categories) {
                const categoryNode = categoriesMap.get(cat.id);
                if (cat.parent_category_id && categoriesMap.has(cat.parent_category_id)) {
                    const parent = categoriesMap.get(cat.parent_category_id);
                    parent.subcategories.push(categoryNode);
                    // Наследуем уровень и путь от родителя
                    categoryNode.level = parent.level + 1;
                    categoryNode.path = [...parent.path, categoryNode.name];
                } else if (!cat.parent_category_id) {
                    rootCategories.push(categoryNode);
                }
            }

            // Сортировка подкатегорий
            const sortSubcategories = (items: CategoryNode[]) => {
                items.sort((a, b) => {
                    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
                    return a.name.localeCompare(b.name);
                });
                items.forEach(item => {
                    if (item.subcategories?.length) {
                        sortSubcategories(item.subcategories);
                    }
                });
            };
            sortSubcategories(rootCategories);

            // Получаем список всех категорий для SEO (плоский список)
            const flatCategories = Array.from(categoriesMap.values()).map(cat => ({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                products_count: cat.products_count,
                level: cat.level
            }));

            return { 
                categories: rootCategories,
                flat_categories: flatCategories,
                total_categories: categories.length,
                total_products: countMap.size
            };
        }, 300); // TTL 5 минут для категорий (меняются редко)

        // Добавляем заголовки кэширования
        const headers = {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '60'
        };

        logApiRequest('GET', '/api/categories', 200, Date.now() - startTime);

        return NextResponse.json({ 
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 50,
                timestamp: new Date().toISOString()
            }
        }, { status: 200, headers });
        
    } catch (error) {
        logError('Error fetching categories', error);
        return NextResponse.json({ 
            categories: [], 
            error: 'Ошибка загрузки категорий' 
        }, { status: 500 });
    }
}