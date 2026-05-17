import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

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
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ 
                error: 'Неверный формат ID мастера',
                products: [],
                pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
            }, { status: 400 });
        }

        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                products: [],
                pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
            }, { status: 429 });
        }

        // Проверяем, существует ли мастер
        const { data: master, error: masterError } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', id)
            .eq('role', 'master')
            .maybeSingle();

        if (masterError || !master) {
            return NextResponse.json({ 
                error: 'Мастер не найден',
                products: [],
                pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
            }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        const cacheKey = `master_products_${id}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Получаем товары мастера с пагинацией
            const { data: products, error, count } = await supabase
                .from('products')
                .select('*', { count: 'exact' })
                .eq('master_id', id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching master products', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!products || products.length === 0) {
                return {
                    products: [],
                    pagination: { total: 0, page, limit, totalPages: 0 }
                };
            }

            // Форматируем товары для фронтенда
            const formattedProducts = products.map(product => ({
                id: product.id,
                title: product.title,
                price: parseFloat(product.price),
                main_image_url: product.main_image_url,
                created_at: product.created_at,
                views: product.views || 0,
                master_name: null, // Будет заполнено позже, но фронтенд может не требовать
                rating: product.rating || 0,
                reviews_count: 0
            }));

            return {
                products: formattedProducts,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };
        }, 60);

        logApiRequest('GET', `/api/masters/${id}/products`, 200, Date.now() - startTime);

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
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
        }, { status: 500 });
    }
}