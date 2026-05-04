// app/api/master/[id]/products/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const { id } = await params;
        
        // Валидация ID мастера
        if (!isValidUUID(id)) {
            return NextResponse.json({ 
                error: 'Неверный формат ID мастера',
                products: [],
                pagination: {}
            }, { status: 400 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                products: [],
                pagination: {}
            }, { status: 429 });
        }

        // Проверяем, существует ли мастер
        const { data: masterExists, error: masterError } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', id)
            .eq('role', 'master')
            .maybeSingle();

        if (masterError || !masterExists) {
            return NextResponse.json({ 
                error: 'Мастер не найден',
                products: [],
                pagination: {}
            }, { status: 404 });
        }

        // Параметры пагинации и фильтрации
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const sort = searchParams.get('sort') || 'newest';
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Кэшируем результат
        const cacheKey = `master_products_${id}_${category || 'all'}_${minPrice || '0'}_${maxPrice || 'max'}_${sort}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('products')
                .select(`
                    id,
                    title,
                    description,
                    price,
                    category,
                    technique,
                    size,
                    color,
                    main_image_url,
                    created_at,
                    updated_at,
                    views,
                    status,
                    stock_quantity,
                    is_available
                `, { count: 'exact' })
                .eq('master_id', id)
                .eq('status', 'active');

            // Фильтр по категории
            if (category && category !== 'all') {
                query = query.eq('category', category);
            }

            // Фильтр по цене
            if (minPrice && !isNaN(parseFloat(minPrice))) {
                query = query.gte('price', parseFloat(minPrice));
            }
            if (maxPrice && !isNaN(parseFloat(maxPrice))) {
                query = query.lte('price', parseFloat(maxPrice));
            }

            // Сортировка
            switch (sort) {
                case 'price_asc':
                    query = query.order('price', { ascending: true });
                    break;
                case 'price_desc':
                    query = query.order('price', { ascending: false });
                    break;
                case 'popular':
                    query = query.order('views', { ascending: false });
                    break;
                case 'oldest':
                    query = query.order('created_at', { ascending: true });
                    break;
                case 'newest':
                default:
                    query = query.order('created_at', { ascending: false });
                    break;
            }

            const { data: products, error, count } = await query
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching master products', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!products || products.length === 0) {
                return {
                    products: [],
                    pagination: { total: 0, page, limit, totalPages: 0 },
                    stats: { total: 0, categories: [], price_range: { min: 0, max: 0 } }
                };
            }

            // Получаем статистику по товарам мастера
            const { data: allProducts } = await supabase
                .from('products')
                .select('category, price')
                .eq('master_id', id)
                .eq('status', 'active');

            // Подсчет категорий
            const categoryMap = new Map<string, number>();
            let minPriceAll = Infinity;
            let maxPriceAll = -Infinity;
            
            allProducts?.forEach(product => {
                if (product.category) {
                    categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + 1);
                }
                const price = parseFloat(product.price);
                if (!isNaN(price)) {
                    if (price < minPriceAll) minPriceAll = price;
                    if (price > maxPriceAll) maxPriceAll = price;
                }
            });

            const categories = Array.from(categoryMap.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);

            // Форматируем товары
            const formattedProducts = products.map(product => ({
                id: product.id,
                title: product.title,
                description: product.description?.substring(0, 200) + (product.description?.length > 200 ? '...' : ''),
                price: parseFloat(product.price),
                category: product.category,
                technique: product.technique,
                size: product.size,
                color: product.color,
                main_image_url: product.main_image_url,
                created_at: product.created_at,
                updated_at: product.updated_at,
                views: product.views || 0,
                is_available: product.is_available !== false,
                stock_quantity: product.stock_quantity,
                in_stock: product.stock_quantity === null || product.stock_quantity > 0
            }));

            return {
                products: formattedProducts,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                stats: {
                    total: count || 0,
                    categories,
                    price_range: {
                        min: minPriceAll === Infinity ? 0 : Math.floor(minPriceAll),
                        max: maxPriceAll === -Infinity ? 0 : Math.ceil(maxPriceAll)
                    }
                }
            };
        });

        logInfo('Master products fetched', {
            masterId: id,
            productsCount: result.products.length,
            totalProducts: result.pagination.total,
            duration: Date.now() - startTime
        });

        return NextResponse.json({
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error fetching master products', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки товаров',
            products: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            stats: { total: 0, categories: [], price_range: { min: 0, max: 0 } }
        }, { status: 500 });
    }
}