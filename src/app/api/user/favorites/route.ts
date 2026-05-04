import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту
const postLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 добавлений в минуту
const deleteLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 удалений в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// GET - получить список избранного
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                favorites: [],
                pagination: {}
            }, { status: 429 });
        }

        // Параметры пагинации
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Кэшируем избранное
        const cacheKey = `favorites_${session.user.id}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Получаем избранные товары с данными о продуктах
            const { data: favorites, error, count } = await supabase
                .from('favorites')
                .select(`
                    product_id,
                    created_at,
                    products!inner (
                        id,
                        title,
                        description,
                        price,
                        status,
                        main_image_url,
                        master_id,
                        users!inner (
                            id,
                            email,
                            profiles!left (
                                full_name,
                                avatar_url,
                                city
                            )
                        )
                    )
                `, { count: 'exact' })
                .eq('user_id', session.user.id)
                .eq('products.status', 'active')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching favorites', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!favorites || favorites.length === 0) {
                return {
                    favorites: [],
                    pagination: { total: 0, page, limit, totalPages: 0 },
                    stats: { total: 0 }
                };
            }

            // Форматируем данные
            const formattedFavorites = favorites.map(fav => ({
                id: fav.products?.[0]?.id,
                title: fav.products?.[0]?.title,
                description: fav.products?.[0]?.description?.substring(0, 100) + (fav.products?.[0]?.description?.length > 100 ? '...' : ''),
                price: parseFloat(fav.products?.[0]?.price || 0),
                main_image_url: fav.products?.[0]?.main_image_url,
                master_id: fav.products?.[0]?.master_id,
                master_name: fav.products?.[0]?.users?.[0]?.profiles?.[0]?.full_name || fav.products?.[0]?.users?.[0]?.email,
                master_avatar: fav.products?.[0]?.users?.[0]?.profiles?.[0]?.avatar_url,
                master_city: fav.products?.[0]?.users?.[0]?.profiles?.[0]?.city,
                added_at: fav.created_at,
                in_stock: fav.products?.[0]?.status === 'active'
            }));

            return {
                favorites: formattedFavorites,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                stats: {
                    total: count || 0
                }
            };
        });

        logInfo('Favorites fetched', {
            userId: session.user.id,
            count: result.favorites.length,
            total: result.stats.total,
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
        logError('Error fetching favorites', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки избранного',
            favorites: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            stats: { total: 0 }
        }, { status: 500 });
    }
}

// POST - добавить в избранное
export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { productId } = await request.json();

        if (!productId) {
            return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
        }

        if (!isValidUUID(productId)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        // Проверяем, существует ли товар и активен ли он
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, title, status')
            .eq('id', productId)
            .maybeSingle();

        if (productError || !product) {
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        if (product.status !== 'active') {
            return NextResponse.json({ error: 'Товар недоступен' }, { status: 400 });
        }

        // Проверяем, есть ли уже в избранном
        const { data: existing, error: checkError } = await supabase
            .from('favorites')
            .select('product_id, created_at')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking favorite', checkError);
            return NextResponse.json({ error: 'Ошибка проверки избранного' }, { status: 500 });
        }

        if (existing) {
            return NextResponse.json({ 
                success: true,
                message: 'Товар уже в избранном',
                already_favorite: true,
                added_at: existing.created_at
            }, { status: 200 });
        }

        // Добавляем в избранное
        const now = new Date().toISOString();
        const { error: insertError } = await supabase
            .from('favorites')
            .insert({
                user_id: session.user.id,
                product_id: productId,
                created_at: now
            });

        if (insertError) {
            logError('Error adding to favorites', insertError);
            return NextResponse.json({ error: 'Ошибка добавления в избранное' }, { status: 500 });
        }

        // Инвалидируем кэш избранного
        invalidateCache(new RegExp(`favorites_${session.user.id}`));

        logInfo('Product added to favorites', {
            userId: session.user.id,
            productId,
            productTitle: product.title,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Товар добавлен в избранное',
            added_at: now
        }, { status: 201 });
        
    } catch (error) {
        logError('Error adding to favorites', error);
        return NextResponse.json({ error: 'Ошибка добавления в избранное' }, { status: 500 });
    }
}

// DELETE - удалить из избранного
export async function DELETE(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
        }

        if (!isValidUUID(productId)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        // Проверяем, есть ли в избранном
        const { data: existing, error: checkError } = await supabase
            .from('favorites')
            .select('product_id, created_at')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking favorite for delete', checkError);
            return NextResponse.json({ error: 'Ошибка проверки избранного' }, { status: 500 });
        }

        if (!existing) {
            return NextResponse.json({ 
                error: 'Товар не найден в избранном',
                not_found: true
            }, { status: 404 });
        }

        // Удаляем из избранного
        const { error: deleteError } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', session.user.id)
            .eq('product_id', productId);

        if (deleteError) {
            logError('Error removing from favorites', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления из избранного' }, { status: 500 });
        }

        // Инвалидируем кэш избранного
        invalidateCache(new RegExp(`favorites_${session.user.id}`));

        logInfo('Product removed from favorites', {
            userId: session.user.id,
            productId,
            wasAddedAt: existing.created_at,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Товар удален из избранного'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error removing from favorites', error);
        return NextResponse.json({ error: 'Ошибка удаления из избранного' }, { status: 500 });
    }
}