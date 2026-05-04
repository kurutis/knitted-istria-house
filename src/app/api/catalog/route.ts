import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { z } from "zod";

// Схема валидации
const querySchema = z.object({
    includeEmpty: z.enum(['true', 'false']).default('false'),
    limit: z.coerce.number().int().min(1).max(50).optional()
});

// Rate limiting
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

// Кэширование иконок
const categoryIcons: Record<string, string> = {
    'Свитера': '🧶',
    'Шапки': '🧢',
    'Шарфы': '🧣',
    'Варежки': '🧤',
    'Носки': '🧦',
    'Пледы': '🛋️',
    'Игрушки': '🧸',
    'Штаны': '👖',
    'Платья': '👗',
    'other': '📦'
};

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        // 1. Rate limiting - исправлено: передаем request
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for product categories', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                categories: []
            }, { status: 429 });
        }

        // 2. Парсим параметры
        const { searchParams } = new URL(request.url);
        const validatedParams = querySchema.parse({
            includeEmpty: searchParams.get('includeEmpty'),
            limit: searchParams.get('limit')
        });
        
        const { includeEmpty, limit } = validatedParams;

        // 3. Кэширование (категории меняются редко)
        const cacheKey = `product_categories_${includeEmpty}_${limit || 'all'}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // 4. Оптимизированный запрос с агрегацией
            const query = supabase
                .from('products')
                .select('category', { count: 'exact', head: false })
                .eq('status', 'active')
                .not('category', 'is', null);

            const { data: products, error, count: totalProducts } = await query;

            if (error) {
                logError('Error fetching products for categories', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!products || products.length === 0) {
                return {
                    categories: [{
                        name: 'all',
                        count: 0,
                        icon: 'all',
                        min_price: null,
                        max_price: null
                    }],
                    total_categories: 0,
                    total_products: 0
                };
            }

            // 5. Оптимизированный подсчет категорий (один проход)
            const categoryMap = new Map<string, { 
                count: number; 
                min_price: number | null; 
                max_price: number | null 
            }>();
            
            // Собираем все уникальные категории для batch запроса цен
            const categoriesSet = new Set<string>();
            
            for (const product of products) {
                const category = product.category || 'other';
                categoriesSet.add(category);
                
                const existing = categoryMap.get(category) || { 
                    count: 0, 
                    min_price: null, 
                    max_price: null 
                };
                
                categoryMap.set(category, {
                    count: existing.count + 1,
                    min_price: existing.min_price,
                    max_price: existing.max_price
                });
            }

            // 6. Получаем min/max цены для каждой категории
            const categoriesArray = Array.from(categoriesSet);
            const priceRanges = new Map<string, { min: number; max: number }>();
            
            if (categoriesArray.length > 0) {
                const { data: priceData, error: priceError } = await supabase
                    .from('products')
                    .select('category, price')
                    .eq('status', 'active')
                    .in('category', categoriesArray);

                if (!priceError && priceData) {
                    const tempMap = new Map<string, { min: number; max: number }>();
                    
                    priceData.forEach(item => {
                        const cat = item.category;
                        const price = parseFloat(item.price);
                        
                        if (!isNaN(price) && price > 0) {
                            const existing = tempMap.get(cat);
                            if (!existing) {
                                tempMap.set(cat, { min: price, max: price });
                            } else {
                                if (price < existing.min) existing.min = price;
                                if (price > existing.max) existing.max = price;
                            }
                        }
                    });
                    
                    tempMap.forEach((range, cat) => {
                        priceRanges.set(cat, range);
                    });
                }
            }

            // 7. Формируем массив категорий с санитизацией
            let categories = Array.from(categoryMap.entries())
                .map(([name, data]) => {
                    const priceRange = priceRanges.get(name);
                    return {
                        name: sanitize.text(name),
                        count: data.count,
                        min_price: priceRange?.min || null,
                        max_price: priceRange?.max || null,
                        icon: getCategoryIcon(name),
                        slug: name.toLowerCase().replace(/\s+/g, '-')
                    };
                })
                .filter(cat => includeEmpty === 'true' || cat.count > 0)
                .sort((a, b) => b.count - a.count);

            // 8. Применяем лимит если указан
            if (limit && limit > 0) {
                categories = categories.slice(0, limit);
            }

            const total = categories.reduce((sum, cat) => sum + cat.count, 0);

            return {
                categories: [
                    { 
                        name: 'all', 
                        count: total, 
                        icon: 'all', 
                        slug: 'all',
                        min_price: null, 
                        max_price: null 
                    },
                    ...categories
                ],
                total_categories: categories.length,
                total_products: total
            };
        }, 300); // TTL 5 минут

        // 9. Добавляем мета информацию и заголовки
        const headers = {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '60'
        };

        const response = {
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 50,
                timestamp: new Date().toISOString()
            }
        };

        logApiRequest('GET', '/api/products/categories', 200, Date.now() - startTime);

        return NextResponse.json(response, { status: 200, headers });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: 'Неверные параметры запроса',
                details: error.issues.map(e => e.message),
                categories: []
            }, { status: 400 });
        }
        
        logError('Error fetching product categories', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки категорий',
            categories: []
        }, { status: 500 });
    }
}

// Улучшенная функция получения иконок с поддержкой дополнительных категорий
function getCategoryIcon(category: string): string {
    const normalizedCategory = category.trim();
    
    // Прямое соответствие
    if (categoryIcons[normalizedCategory]) {
        return categoryIcons[normalizedCategory];
    }
    
    // Нечеткий поиск
    const lowerCategory = normalizedCategory.toLowerCase();
    if (lowerCategory.includes('свитер') || lowerCategory.includes('джемпер') || lowerCategory.includes('пуловер')) {
        return '🧶';
    }
    if (lowerCategory.includes('шапк') || lowerCategory.includes('кепк')) {
        return '🧢';
    }
    if (lowerCategory.includes('шарф')) {
        return '🧣';
    }
    if (lowerCategory.includes('варежк') || lowerCategory.includes('перчатк')) {
        return '🧤';
    }
    if (lowerCategory.includes('носок') || lowerCategory.includes('гетр')) {
        return '🧦';
    }
    if (lowerCategory.includes('плед') || lowerCategory.includes('одеял')) {
        return '🛋️';
    }
    if (lowerCategory.includes('игрушк') || lowerCategory.includes('амигуруми')) {
        return '🧸';
    }
    
    return '📦';
}

// Дополнительный эндпоинт для получения популярных категорий
export async function GET_POPULAR(request: Request) {
    const startTime = Date.now();
    
    try {
        const cacheKey = 'popular_categories';
        
        const result = await cachedQuery(cacheKey, async () => {
            const { data: categories, error } = await supabase
                .from('products')
                .select('category, views')
                .eq('status', 'active')
                .not('category', 'is', null);

            if (error) {
                logError('Error fetching popular categories', error);
                return { categories: [] };
            }

            const categoryStats = new Map<string, { count: number; total_views: number }>();
            
            categories?.forEach(product => {
                const cat = product.category;
                const stats = categoryStats.get(cat) || { count: 0, total_views: 0 };
                stats.count++;
                stats.total_views += product.views || 0;
                categoryStats.set(cat, stats);
            });

            const popularCategories = Array.from(categoryStats.entries())
                .map(([name, stats]) => ({
                    name: sanitize.text(name),
                    count: stats.count,
                    total_views: stats.total_views,
                    popularity_score: stats.count * (1 + Math.log(stats.total_views + 1)),
                    icon: getCategoryIcon(name),
                    slug: name.toLowerCase().replace(/\s+/g, '-')
                }))
                .sort((a, b) => b.popularity_score - a.popularity_score)
                .slice(0, 6);

            return { categories: popularCategories };
        }, 600); // TTL 10 минут

        logApiRequest('GET', '/api/products/categories/popular', 200, Date.now() - startTime);

        return NextResponse.json({ 
            success: true, 
            ...result,
            meta: {
                cached: Date.now() - startTime < 50,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching popular categories', error);
        return NextResponse.json({ categories: [] }, { status: 500 });
    }
}