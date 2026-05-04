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
    sort_order: number
    products_count: number
    subcategories: CategoryNode[]
    level: number
    path: string[]
}

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for categories', { ip: getClientIP(request) });
            return NextResponse.json({ 
                categories: [], 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const cacheKey = 'categories_full_tree';
        const result = await cachedQuery(cacheKey, async () => {
            // Получаем категории - убрал slug и is_active
            const { data: categories, error } = await supabase
                .from('categories')
                .select('id, name, description, parent_category_id, icon_url, sort_order')
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true });

            if (error) {
                logError('Error fetching categories', error);
                throw new Error(error.message);
            }

            if (!categories || categories.length === 0) {
                return { categories: [] };
            }

            // Подсчет товаров
            const { data: productsCount } = await supabase
                .from('products')
                .select('category')
                .eq('status', 'active')
                .not('category', 'is', null);

            const countMap = new Map();
            if (productsCount) {
                productsCount.forEach(p => {
                    if (p.category) {
                        countMap.set(p.category, (countMap.get(p.category) || 0) + 1);
                    }
                });
            }

            // Построение дерева
            const categoriesMap = new Map();
            const rootCategories = [];

            for (const cat of categories) {
                categoriesMap.set(cat.id, {
                    id: cat.id,
                    name: sanitize.text(cat.name),
                    description: sanitize.text(cat.description || ''),
                    parent_category_id: cat.parent_category_id,
                    icon_url: cat.icon_url,
                    sort_order: cat.sort_order || 0,
                    products_count: countMap.get(cat.name) || 0,
                    subcategories: [],
                    level: 0,
                    path: [sanitize.text(cat.name)]
                });
            }

            for (const cat of categories) {
                const categoryNode = categoriesMap.get(cat.id);
                if (cat.parent_category_id && categoriesMap.has(cat.parent_category_id)) {
                    const parent = categoriesMap.get(cat.parent_category_id);
                    parent.subcategories.push(categoryNode);
                    categoryNode.level = parent.level + 1;
                    categoryNode.path = [...parent.path, categoryNode.name];
                } else if (!cat.parent_category_id) {
                    rootCategories.push(categoryNode);
                }
            }

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

            return { categories: rootCategories };
        }, 300);

        logApiRequest('GET', '/api/categories', 200, Date.now() - startTime);

        return NextResponse.json({ 
            success: true,
            categories: result.categories,
            meta: {
                cached: Date.now() - startTime < 50,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching categories', error);
        return NextResponse.json({ 
            categories: [], 
            error: 'Ошибка загрузки категорий' 
        }, { status: 500 });
    }
}