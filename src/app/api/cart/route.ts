import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { z } from "zod";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";

const addToCartSchema = z.object({
    productId: z.string().uuid('Неверный формат ID товара'),
    quantity: z.number().int().min(1, 'Количество должно быть не менее 1').max(99, 'Максимальное количество 99')
});

const updateQuantitySchema = z.object({
    productId: z.string().uuid('Неверный формат ID товара'),
    quantity: z.number().int().min(0, 'Количество не может быть отрицательным').max(99, 'Максимальное количество 99')
});

const cartLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function getCartSummary(userId: string) {
    const { data: cartItems, error } = await supabase
        .from('cart')
        .select('quantity, products!inner(price)')
        .eq('user_id', userId);

    if (error) {
        logError('Error getting cart summary', error, 'warning');
        return { cartCount: 0, totalAmount: 0 };
    }

    const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const totalAmount = cartItems?.reduce((sum, item) => sum + (parseFloat(item.products?.[0]?.price || '0') * item.quantity), 0) || 0;

    return { cartCount, totalAmount };
}

// GET - получить корзину
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = cartLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for cart GET', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                items: [], 
                totalCount: 0, 
                totalAmount: 0
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const cacheKey = `cart_${session.user.id}`;
        const cartData = await cachedQuery(cacheKey, async () => {
            const { data: cartItems, error } = await supabase
                .from('cart')
                .select(`
                    product_id,
                    quantity,
                    created_at,
                    products!inner (
                        id,
                        title,
                        price,
                        main_image_url,
                        master_id,
                        is_available,
                        stock_quantity,
                        users!inner (
                            id,
                            email,
                            profiles!left (
                                full_name
                            )
                        )
                    )
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const items = cartItems?.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                title: sanitize.text(item.products?.[0]?.title || ''),
                price: parseFloat(item.products?.[0]?.price) || 0,
                final_price: parseFloat(item.products?.[0]?.price) || 0,
                main_image_url: item.products?.[0]?.main_image_url,
                master_name: sanitize.text(item.products?.[0]?.users?.[0]?.profiles?.[0]?.full_name || item.products?.[0]?.users?.[0]?.email || 'Мастер'),
            })) || [];

            const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return { items, totalCount, totalAmount };
        }, 5);

        logApiRequest('GET', '/api/cart', 200, Date.now() - startTime, session.user.id);

        // Возвращаем в формате, который ожидает фронтенд
        return NextResponse.json({
            items: cartData.items,
            totalCount: cartData.totalCount,
            totalAmount: cartData.totalAmount
        });
        
    } catch (error) {
        logError('Error fetching cart', error);
        return NextResponse.json({ 
            items: [], 
            totalCount: 0, 
            totalAmount: 0,
            error: 'Ошибка загрузки корзины' 
        }, { status: 500 });
    }
}

// POST - добавить товар в корзину
export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = cartLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        const validatedData = addToCartSchema.parse(body);
        const { productId, quantity } = validatedData;

        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, title, price, is_available, stock_quantity')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        if (product.is_available === false) {
            return NextResponse.json({ error: 'Товар временно недоступен' }, { status: 400 });
        }

        const { data: existingItem } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle();

        const now = new Date().toISOString();

        if (existingItem) {
            const finalQuantity = existingItem.quantity + quantity;
            
            await supabase
                .from('cart')
                .update({
                    quantity: finalQuantity,
                    updated_at: now
                })
                .eq('user_id', session.user.id)
                .eq('product_id', productId);
        } else {
            await supabase
                .from('cart')
                .insert({
                    user_id: session.user.id,
                    product_id: productId,
                    quantity: quantity,
                    created_at: now,
                    updated_at: now
                });
        }

        invalidateCache(`cart_${session.user.id}`);

        const { data: cartCount } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id);

        const totalCount = cartCount?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        logApiRequest('POST', '/api/cart', 201, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            success: true,
            cartCount: totalCount,
            message: existingItem ? 'Количество товара обновлено' : 'Товар добавлен в корзину'
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error adding to cart', error);
        return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
    }
}

// DELETE - удалить товар из корзины
export async function DELETE(request: Request) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = cartLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: 'ID товара обязателен' }, { status: 400 });
        }

        if (!isValidUUID(productId)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        await supabase
            .from('cart')
            .delete()
            .eq('user_id', session.user.id)
            .eq('product_id', productId);

        invalidateCache(`cart_${session.user.id}`);

        const cartInfo = await getCartSummary(session.user.id);

        logApiRequest('DELETE', '/api/cart', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            success: true, 
            message: 'Товар удален из корзины',
            cartCount: cartInfo.cartCount,
            totalAmount: cartInfo.totalAmount
        });
        
    } catch (error) {
        logError('Error deleting from cart', error);
        return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
    }
}