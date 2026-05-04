import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { z } from "zod";

// Схема валидации query параметров
const querySchema = z.object({
    brand: z.string().max(50).optional(),
    color: z.string().max(50).optional(),
    search: z.string().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    page: z.coerce.number().int().min(1).default(1)
});

// Rate limiting для пряжи
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        // 1. Rate limiting - исправлено: передаем request
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for yarn', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                data: [],
                meta: { total: 0, page: 1, limit: 50 }
            }, { status: 429 });
        }

        // 2. Парсим и валидируем параметры
        const { searchParams } = new URL(request.url);
        const rawParams = {
            brand: searchParams.get('brand'),
            color: searchParams.get('color'),
            search: searchParams.get('search'),
            limit: searchParams.get('limit'),
            page: searchParams.get('page')
        };
        
        const validatedParams = querySchema.parse(rawParams);
        const { brand, color, search, limit, page } = validatedParams;
        const offset = (page - 1) * limit;

        // 3. Кэширование (пряжа меняется редко)
        const cacheKey = `yarn_${JSON.stringify(validatedParams)}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // 4. Оптимизированный запрос
            let query = supabase
                .from('yarn_catalog')
                .select(`
                    id,
                    name,
                    article,
                    brand,
                    color,
                    in_stock,
                    price,
                    composition,
                    weight,
                    yardage,
                    care_instructions,
                    image_url,
                    created_at,
                    stock_quantity
                `, { count: 'exact' })
                .eq('in_stock', true);

            // 5. Применяем фильтры
            if (brand && brand !== 'all' && brand !== 'null') {
                query = query.eq('brand', brand);
            }

            if (color && color !== 'all' && color !== 'null') {
                query = query.eq('color', color);
            }

            if (search && search.trim()) {
                const safeSearch = search.trim().replace(/[%_]/g, '\\$&');
                query = query.or(`name.ilike.%${safeSearch}%,brand.ilike.%${safeSearch}%,article.ilike.%${safeSearch}%,color.ilike.%${safeSearch}%`);
            }

            // 6. Сортировка
            query = query.order('name', { ascending: true });

            // 7. Пагинация
            const { data: yarn, error, count } = await query
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching yarn', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!yarn || yarn.length === 0) {
                return {
                    data: [],
                    meta: {
                        total: 0,
                        page,
                        limit,
                        totalPages: 0,
                        hasMore: false
                    }
                };
            }

            // 8. Форматируем данные с санитизацией
            const formattedYarn = yarn.map(item => ({
                id: item.id,
                name: sanitize.text(item.name),
                article: sanitize.text(item.article),
                brand: item.brand ? sanitize.text(item.brand) : null,
                color: item.color ? sanitize.text(item.color) : null,
                in_stock: item.in_stock,
                stock_quantity: item.stock_quantity || 0,
                price: parseFloat(item.price),
                composition: item.composition ? sanitize.text(item.composition) : null,
                weight: item.weight,
                yardage: item.yardage,
                care_instructions: item.care_instructions ? sanitize.text(item.care_instructions) : null,
                image_url: item.image_url,
                created_at: item.created_at
            }));

            // Получаем статистику для фильтров
            const { data: allYarn } = await supabase
                .from('yarn_catalog')
                .select('brand, color')
                .eq('in_stock', true);
            
            const uniqueBrands = [...new Set(allYarn?.map(y => y.brand).filter(Boolean))];
            const uniqueColors = [...new Set(allYarn?.map(y => y.color).filter(Boolean))];

            return {
                data: formattedYarn,
                meta: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                filters: {
                    brands: uniqueBrands.sort(),
                    colors: uniqueColors.sort()
                }
            };
        }, 300); // TTL 5 минут для пряжи

        // 9. Добавляем информацию о кэше и заголовки
        const headers = {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '60',
            'X-Total-Count': result.meta.total.toString()
        };

        const response = {
            success: true,
            ...result,
            cached: Date.now() - startTime < 50,
            meta: {
                ...result.meta,
                cached: Date.now() - startTime < 50,
                timestamp: new Date().toISOString()
            }
        };

        logApiRequest('GET', '/api/yarn', 200, Date.now() - startTime);

        return NextResponse.json(response, { status: 200, headers });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: 'Неверные параметры запроса',
                details: error.issues.map(e => e.message),
                data: [],
                meta: { total: 0, page: 1, limit: 50 }
            }, { status: 400 });
        }
        
        logError('Error fetching yarn catalog', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки пряжи',
            data: [],
            meta: { total: 0, page: 1, limit: 50 }
        }, { status: 500 });
    }
}

// Дополнительный эндпоинт для получения уникальных брендов и цветов (для фильтров)
export async function GET_FILTERS(request: Request) {
    const startTime = Date.now();
    
    try {
        const cacheKey = 'yarn_filters';
        
        const filters = await cachedQuery(cacheKey, async () => {
            // Параллельные запросы для оптимизации
            const [brandsResult, colorsResult] = await Promise.all([
                supabase
                    .from('yarn_catalog')
                    .select('brand')
                    .eq('in_stock', true)
                    .not('brand', 'is', null),
                supabase
                    .from('yarn_catalog')
                    .select('color')
                    .eq('in_stock', true)
                    .not('color', 'is', null)
            ]);

            const uniqueBrands = [...new Set(brandsResult.data?.map(b => b.brand).filter(Boolean))];
            const uniqueColors = [...new Set(colorsResult.data?.map(c => c.color).filter(Boolean))];

            // Подсчет количества для каждого бренда
            const brandsWithCount = uniqueBrands.map(brand => ({
                name: brand,
                count: brandsResult.data?.filter(b => b.brand === brand).length || 0
            })).sort((a, b) => b.count - a.count);

            // Подсчет количества для каждого цвета
            const colorsWithCount = uniqueColors.map(color => ({
                name: color,
                count: colorsResult.data?.filter(c => c.color === color).length || 0
            })).sort((a, b) => b.count - a.count);

            return {
                brands: brandsWithCount,
                colors: colorsWithCount
            };
        }, 600); // TTL 10 минут для фильтров

        logApiRequest('GET', '/api/yarn/filters', 200, Date.now() - startTime);

        return NextResponse.json({ 
            success: true, 
            ...filters,
            meta: {
                cached: Date.now() - startTime < 50,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching yarn filters', error);
        return NextResponse.json({ 
            success: false,
            brands: [], 
            colors: [],
            error: 'Ошибка загрузки фильтров'
        }, { status: 500 });
    }
}