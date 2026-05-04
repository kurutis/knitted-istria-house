import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации для POST запроса
const createYarnSchema = z.object({
    name: z.string().min(2, 'Название должно содержать минимум 2 символа').max(255),
    article: z.string().min(1, 'Артикул обязателен').max(100),
    brand: z.string().max(100).optional().nullable(),
    color: z.string().max(100).optional().nullable(),
    composition: z.string().max(500).optional().nullable(),
    weight_grams: z.number().int().positive('Вес должен быть положительным числом').optional().nullable(),
    length_meters: z.number().int().positive('Длина должна быть положительным числом').optional().nullable(),
    price: z.number().positive('Цена должна быть положительной').max(1000000).optional().nullable(),
    in_stock: z.boolean().default(true),
    stock_quantity: z.number().int().min(0, 'Количество не может быть отрицательным').max(99999).default(0),
    image_url: z.string().url('Неверный формат URL').optional().nullable(),
    description: z.string().max(1000, 'Описание не может превышать 1000 символов').optional().nullable(),
});

// Схема для GET запроса с пагинацией
const yarnQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().max(100).optional(),
    in_stock: z.enum(['true', 'false']).optional(),
    brand: z.string().max(100).optional(),
});

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin yarn catalog access', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        
        // Валидация query параметров
        const validatedQuery = yarnQuerySchema.parse({
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
            search: searchParams.get('search'),
            in_stock: searchParams.get('in_stock'),
            brand: searchParams.get('brand'),
        });

        const { page, limit, search, in_stock, brand } = validatedQuery;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Ключ кэша
        const cacheKey = `admin_yarn_${page}_${limit}_${search || 'none'}_${in_stock || 'all'}_${brand || 'all'}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Строим запрос
            let query = supabase
                .from('yarn_catalog')
                .select(`
                    *,
                    product_yarn!left (
                        product_id
                    )
                `, { count: 'exact' });

            // Поиск по названию, артикулу или бренду
            if (search && search.trim()) {
                const safeSearch = sanitize.text(search);
                query = query.or(`name.ilike.%${safeSearch}%,article.ilike.%${safeSearch}%,brand.ilike.%${safeSearch}%,color.ilike.%${safeSearch}%`);
            }

            // Фильтр по бренду
            if (brand && brand !== 'all') {
                query = query.eq('brand', brand);
            }

            // Фильтр по наличию
            if (in_stock === 'true') {
                query = query.eq('in_stock', true);
            } else if (in_stock === 'false') {
                query = query.eq('in_stock', false);
            }

            // Пагинация и сортировка
            const { data: yarn, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                logError('Supabase error in admin yarn GET', error);
                throw new Error('DATABASE_ERROR');
            }

            // Получаем список уникальных брендов для фильтрации
            const { data: brandsData } = await supabase
                .from('yarn_catalog')
                .select('brand')
                .not('brand', 'is', null);
            
            const uniqueBrands = [...new Set(brandsData?.map(b => b.brand).filter(Boolean))];

            // Форматируем данные с санитизацией
            const formattedYarn = yarn?.map(item => ({
                id: item.id,
                name: sanitize.text(item.name),
                article: sanitize.text(item.article),
                brand: item.brand ? sanitize.text(item.brand) : null,
                color: item.color ? sanitize.text(item.color) : null,
                composition: item.composition ? sanitize.text(item.composition) : null,
                weight_grams: item.weight_grams ? parseInt(item.weight_grams) : null,
                length_meters: item.length_meters ? parseInt(item.length_meters) : null,
                price: parseFloat(item.price || 0),
                in_stock: item.in_stock,
                stock_quantity: item.stock_quantity || 0,
                image_url: item.image_url,
                description: item.description ? sanitize.text(item.description) : null,
                created_at: item.created_at,
                updated_at: item.updated_at,
                used_in_products: item.product_yarn?.length || 0
            })) || [];

            // Статистика
            const { data: allYarn } = await supabase
                .from('yarn_catalog')
                .select('in_stock');
            
            const stats = {
                total: allYarn?.length || 0,
                in_stock: allYarn?.filter(y => y.in_stock === true).length || 0,
                out_of_stock: allYarn?.filter(y => y.in_stock === false).length || 0
            };

            return {
                yarn: formattedYarn,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: to + 1 < (count || 0)
                },
                filters: {
                    brands: uniqueBrands.sort()
                },
                stats,
                lastUpdated: new Date().toISOString()
            };
        }, 60); // TTL 60 секунд

        logApiRequest('GET', '/api/admin/yarn', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(result, {
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=60',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30',
                'X-Total-Count': result.pagination.total.toString()
            }
        });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error in admin yarn GET', error);
        return NextResponse.json({ error: 'Ошибка загрузки каталога пряжи' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin yarn creation', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin yarn creation attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = createYarnSchema.parse({
            name: body.name,
            article: body.article,
            brand: body.brand,
            color: body.color,
            composition: body.composition,
            weight_grams: body.weight_grams ? Number(body.weight_grams) : undefined,
            length_meters: body.length_meters ? Number(body.length_meters) : undefined,
            price: body.price ? Number(body.price) : undefined,
            in_stock: body.in_stock,
            stock_quantity: body.stock_quantity ? Number(body.stock_quantity) : 0,
            image_url: body.image_url,
            description: body.description
        });

        const { 
            name, article, brand, color, composition, 
            weight_grams, length_meters, price, in_stock, 
            stock_quantity, image_url, description 
        } = validatedData;

        // Санитизация
        const sanitizedName = sanitize.text(name.trim());
        const sanitizedArticle = sanitize.text(article.trim());
        const sanitizedBrand = brand ? sanitize.text(brand.trim()) : null;
        const sanitizedColor = color ? sanitize.text(color.trim()) : null;
        const sanitizedComposition = composition ? sanitize.text(composition.trim()) : null;
        const sanitizedDescription = description ? sanitize.text(description.trim()) : null;

        // Проверяем, существует ли пряжа с таким артикулом
        const { data: existing, error: checkError } = await supabase
            .from('yarn_catalog')
            .select('id')
            .eq('article', sanitizedArticle)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing yarn', checkError);
            return NextResponse.json({ error: 'Ошибка проверки пряжи' }, { status: 500 });
        }

        if (existing) {
            return NextResponse.json({ error: 'Пряжа с таким артикулом уже существует' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Создаем новую пряжу
        const { data: newYarn, error: insertError } = await supabase
            .from('yarn_catalog')
            .insert({
                name: sanitizedName,
                article: sanitizedArticle,
                brand: sanitizedBrand,
                color: sanitizedColor,
                composition: sanitizedComposition,
                weight_grams: weight_grams || null,
                length_meters: length_meters || null,
                price: price || null,
                in_stock: in_stock ?? true,
                stock_quantity: stock_quantity ?? 0,
                image_url: image_url || null,
                description: sanitizedDescription,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (insertError) {
            logError('Error creating yarn', insertError);
            return NextResponse.json({ error: 'Ошибка создания пряжи' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(/^admin_yarn/);
        invalidateCache(/^yarn_/);

        // Логируем действие администратора
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'YARN_CREATED',
                entity_type: 'yarn_catalog',
                entity_id: newYarn.id,
                new_values: { name: sanitizedName, article: sanitizedArticle, price: price },
                created_at: now
            });

        logApiRequest('POST', '/api/admin/yarn', 201, Date.now() - startTime, session.user.id);
        logInfo(`Admin created yarn`, { 
            yarnId: newYarn.id,
            adminId: session.user.id,
            name: sanitizedName,
            article: sanitizedArticle
        });

        return NextResponse.json({ 
            success: true,
            message: 'Пряжа успешно создана',
            yarn: {
                ...newYarn,
                price: parseFloat(newYarn.price || 0)
            }
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error in admin yarn POST', error);
        return NextResponse.json({ error: 'Ошибка создания пряжи' }, { status: 500 });
    }
}