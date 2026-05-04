// app/api/filters/route.ts
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";

// Rate limiting для фильтров (публичный эндпоинт)
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

// Константы
const MAX_PRICE_LIMIT = 50000;
const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 10000;

function getSortOptions() {
    return [
        { value: 'newest', label: 'Сначала новые' },
        { value: 'popular', label: 'Популярные' },
        { value: 'price_asc', label: 'Сначала дешевле' },
        { value: 'price_desc', label: 'Сначала дороже' },
        { value: 'rating', label: 'По рейтингу' }
    ];
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        // 1. Rate limiting - исправлено: передаем request
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for filters', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                techniques: [],
                priceRange: { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE },
                sortOptions: getSortOptions()
            }, { status: 429 });
        }

        // 2. Кэширование результата (фильтры меняются редко)
        const cacheKey = 'filters_data';
        const filtersData = await cachedQuery(cacheKey, async () => {
            // 3. Оптимизированный запрос - получаем и техники, и цены одним запросом
            const { data: products, error } = await supabase
                .from('products')
                .select('technique, price, category')
                .eq('status', 'active');

            if (error) {
                logError('Error fetching filters data', error);
                throw new Error(error.message);
            }

            if (!products || products.length === 0) {
                return {
                    techniques: [],
                    categories: [],
                    priceRange: { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE },
                    sortOptions: getSortOptions(),
                    stats: { total_products: 0 }
                };
            }

            // 4. Подсчет техник и категорий
            const techniqueMap = new Map<string, number>();
            const categoryMap = new Map<string, number>();
            
            // 5. Расчет цен
            let minPrice = Infinity;
            let maxPrice = -Infinity;
            
            for (const product of products) {
                // Обработка техник с санитизацией
                if (product.technique && typeof product.technique === 'string') {
                    const technique = sanitize.text(product.technique.trim());
                    if (technique) {
                        techniqueMap.set(technique, (techniqueMap.get(technique) || 0) + 1);
                    }
                }
                
                // Обработка категорий
                if (product.category && typeof product.category === 'string') {
                    const category = sanitize.text(product.category.trim());
                    if (category) {
                        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
                    }
                }
                
                // Обработка цен
                const price = parseFloat(product.price);
                if (!isNaN(price) && price > 0) {
                    if (price < minPrice) minPrice = price;
                    if (price > maxPrice) maxPrice = price;
                }
            }

            // Преобразуем техники в массив
            const techniques = Array.from(techniqueMap.entries())
                .map(([technique, count]) => ({ technique, count }))
                .sort((a, b) => a.technique.localeCompare(b.technique));

            // Преобразуем категории в массив
            const categories = Array.from(categoryMap.entries())
                .map(([category, count]) => ({ category, count }))
                .sort((a, b) => b.count - a.count); // Сортируем по популярности

            // Округляем цены
            const min = minPrice === Infinity ? DEFAULT_MIN_PRICE : minPrice;
            let max = maxPrice === -Infinity ? DEFAULT_MAX_PRICE : maxPrice;
            
            if (max > MAX_PRICE_LIMIT) {
                max = MAX_PRICE_LIMIT;
            }

            return {
                techniques,
                categories,
                priceRange: {
                    min: Math.max(DEFAULT_MIN_PRICE, Math.floor(min / 100) * 100),
                    max: Math.ceil(max / 1000) * 1000
                },
                sortOptions: getSortOptions(),
                stats: {
                    total_products: products.length,
                    min_price: min,
                    max_price: max
                }
            };
        }, 300); // TTL 5 минут для фильтров

        // Добавляем заголовки кэширования
        const headers = {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '60'
        };

        logApiRequest('GET', '/api/filters', 200, Date.now() - startTime);

        return NextResponse.json({ 
            success: true,
            ...filtersData,
            meta: {
                cached: Date.now() - startTime < 50,
                timestamp: new Date().toISOString()
            }
        }, { status: 200, headers });
        
    } catch (error) {
        logError('Error fetching filters', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки фильтров',
            techniques: [],
            categories: [],
            priceRange: { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE },
            sortOptions: getSortOptions(),
            stats: { total_products: 0 }
        }, { status: 500 });
    }
}