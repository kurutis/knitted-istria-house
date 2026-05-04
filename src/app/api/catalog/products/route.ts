// app/api/products/route.ts
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { z } from "zod";

// Схема валидации query параметров
const querySchema = z.object({
    category: z.string().optional().nullable(),
    technique: z.string().optional().nullable(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    search: z.string().max(100, 'Слишком длинный поисковый запрос').optional().nullable(),
    sort: z.enum(['newest', 'popular', 'price_asc', 'price_desc', 'rating']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12)
});

// Rate limiting для каталога
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        // 1. Rate limiting
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for products', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                products: [],
                pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasMore: false }
            }, { status: 429 });
        }

        // 2. Валидация и парсинг параметров
        const { searchParams } = new URL(request.url);
        const rawParams = {
            category: searchParams.get('category'),
            technique: searchParams.get('technique'),
            minPrice: searchParams.get('minPrice'),
            maxPrice: searchParams.get('maxPrice'),
            search: searchParams.get('search'),
            sort: searchParams.get('sort'),
            page: searchParams.get('page'),
            limit: searchParams.get('limit')
        };
        
        const validatedParams = querySchema.parse(rawParams);
        const { category, technique, minPrice, maxPrice, search, sort, page, limit } = validatedParams;
        const offset = (page - 1) * limit;

        // 3. Создаем ключ кэша
        const cacheKey = `products_${JSON.stringify(validatedParams)}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('products')
                .select(`
                    id,
                    title,
                    description,
                    price,
                    status,
                    category,
                    technique,
                    size,
                    main_image_url,
                    created_at,
                    views,
                    master_id,
                    users!inner (
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                `, { count: 'exact' });

            query = query.eq('status', 'active');
            
            if (category && category !== 'all' && category !== 'null') {
                query = query.eq('category', category);
            }

            if (technique && technique !== 'all' && technique !== 'null') {
                query = query.eq('technique', technique);
            }

            if (minPrice !== undefined && !isNaN(minPrice)) {
                query = query.gte('price', minPrice);
            }

            if (maxPrice !== undefined && !isNaN(maxPrice)) {
                query = query.lte('price', maxPrice);
            }

            if (search && search.trim()) {
                const safeSearch = search.trim().replace(/[%_]/g, '\\$&');
                query = query.ilike('title', `%${safeSearch}%`);
            }

            switch (sort) {
                case 'price_asc':
                    query = query.order('price', { ascending: true, nullsFirst: false });
                    break;
                case 'price_desc':
                    query = query.order('price', { ascending: false, nullsFirst: false });
                    break;
                case 'popular':
                    query = query.order('views', { ascending: false, nullsFirst: false });
                    break;
                case 'newest':
                default:
                    query = query.order('created_at', { ascending: false });
                    break;
            }

            const { data: products, error, count } = await query
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching products', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!products || products.length === 0) {
                return {
                    products: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0,
                        hasMore: false
                    }
                };
            }

            const formattedProducts = products.map(product => ({
                id: product.id,
                title: sanitize.text(product.title),
                description: product.description,
                price: parseFloat(product.price),
                category: product.category,
                technique: product.technique,
                size: product.size,
                main_image_url: product.main_image_url,
                created_at: product.created_at,
                views: product.views || 0,
                master_id: product.master_id,
                master_name: sanitize.text(product.users?.[0]?.profiles?.[0]?.full_name || product.users?.[0]?.email || ''),
                master_avatar: product.users?.[0]?.profiles?.[0]?.avatar_url,
                preview_description: product.description?.substring(0, 150) + (product.description?.length > 150 ? '...' : '')
            }));

            return {
                products: formattedProducts,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                }
            };
        });

        const response = {
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 50,
                sort_available: ['newest', 'popular', 'price_asc', 'price_desc'],
                timestamp: new Date().toISOString()
            }
        };

        const headers = {
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '60',
            'X-Total-Count': result.pagination.total.toString()
        };

        logApiRequest('GET', '/api/products', 200, Date.now() - startTime);

        return NextResponse.json(response, { status: 200, headers });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: 'Неверные параметры запроса',
                details: error.issues.map(e => e.message),
                products: [],
                pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasMore: false }
            }, { status: 400 });
        }
        
        logError('Error fetching products catalog', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки каталога',
            products: [],
            pagination: { page: 1, limit: 12, total: 0, totalPages: 0, hasMore: false }
        }, { status: 500 });
    }
}