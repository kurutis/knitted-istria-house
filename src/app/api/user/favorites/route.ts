import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const deleteLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

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

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Получаем избранные товары
        const { data: favoriteItems, error: favError, count } = await supabase
            .from('favorites')
            .select('product_id, created_at', { count: 'exact' })
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (favError) {
            console.error('Error fetching favorites:', favError);
            return NextResponse.json({ 
                favorites: [], 
                pagination: { total: 0, page, limit, totalPages: 0 },
                stats: { total: 0 }
            }, { status: 500 });
        }

        if (!favoriteItems || favoriteItems.length === 0) {
            return NextResponse.json({
                success: true,
                favorites: [],
                pagination: { total: 0, page, limit, totalPages: 0, hasMore: false },
                stats: { total: 0 }
            });
        }

        // Получаем ID товаров
        const productIds = favoriteItems.map(item => item.product_id);
        
        // Получаем данные товаров
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
                id,
                title,
                price,
                main_image_url,
                master_id
            `)
            .in('id', productIds);

        if (productsError) {
            console.error('Error fetching products:', productsError);
            return NextResponse.json({ 
                favorites: [], 
                pagination: { total: 0, page, limit, totalPages: 0 },
                stats: { total: 0 }
            }, { status: 500 });
        }

        // Получаем мастеров (user_id) для всех товаров
        const masterUserIds = [...new Set(products.map(p => p.master_id).filter(Boolean))];
        
        // Получаем профили мастеров напрямую (master_id = user_id)
        const { data: masterProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', masterUserIds);

        if (profilesError) {
            console.error('Error fetching master profiles:', profilesError);
        }

        // Создаем Map для быстрого доступа к именам мастеров
        const masterMap = new Map();
        masterProfiles?.forEach(profile => {
            masterMap.set(profile.user_id, {
                master_name: profile.full_name || 'Мастер',
                master_avatar: profile.avatar_url
            });
        });

        // Форматируем результат
        const formattedFavorites = favoriteItems.map(item => {
            const product = products.find(p => p.id === item.product_id);
            if (!product) return null;
            
            const masterInfo = masterMap.get(product.master_id) || { master_name: 'Мастер', master_avatar: null };
            
            return {
                id: product.id,
                title: product.title || 'Без названия',
                price: parseFloat(product.price) || 0,
                main_image_url: product.main_image_url,
                master_id: product.master_id,
                master_name: masterInfo.master_name,
                master_avatar: masterInfo.master_avatar,
                added_at: item.created_at,
                in_stock: true
            };
        }).filter(Boolean);

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        console.log('Formatted favorites:', formattedFavorites); // Для отладки

        return NextResponse.json({
            success: true,
            favorites: formattedFavorites,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasMore: offset + limit < total
            },
            stats: { total }
        });
        
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return NextResponse.json({ 
            success: false,
            favorites: [], 
            error: 'Ошибка загрузки избранного',
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

        // Проверяем, существует ли товар
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
        const { data: existing } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ 
                success: true,
                message: 'Товар уже в избранном',
                already_favorite: true
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

        // Инвалидируем кэш
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

        // Инвалидируем кэш
        invalidateCache(new RegExp(`favorites_${session.user.id}`));

        logInfo('Product removed from favorites', {
            userId: session.user.id,
            productId,
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