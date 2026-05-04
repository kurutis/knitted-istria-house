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

async function handleDeleteItem(userId: string, productId: string) {
    const { error: deleteError } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

    if (deleteError) {
        logError('Error deleting from cart', deleteError);
        return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
    }

    invalidateCache(`cart_${userId}`);
    const cartInfo = await getCartSummary(userId);

    return NextResponse.json({ 
        success: true, 
        message: 'Товар удален из корзины',
        ...cartInfo
    });
}

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

            const validItems = cartItems?.filter(item => 
                item.products && 
                item.products[0]?.is_available !== false &&
                (item.products[0]?.stock_quantity === null || item.products[0]?.stock_quantity >= item.quantity)
            ) || [];

            const items = validItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                title: sanitize.text(item.products[0]?.title),
                price: parseFloat(item.products[0]?.price),
                main_image_url: item.products[0]?.main_image_url,
                master_name: sanitize.text(item.products[0]?.users?.[0]?.profiles?.[0]?.full_name || item.products[0]?.users?.[0]?.email),
                is_available_in_stock: item.products[0]?.stock_quantity === null || item.products[0]?.stock_quantity >= item.quantity,
                stock_quantity: item.products[0]?.stock_quantity
            }));

            const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return { items, totalCount, totalAmount };
        }, 5);

        logApiRequest('GET', '/api/cart', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(cartData);
        
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

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = cartLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for cart POST', { ip: getClientIP(request) });
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
            if (productError?.code === 'PGRST116') {
                return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
            }
            logError('Error checking product', productError);
            return NextResponse.json({ error: 'Ошибка проверки товара' }, { status: 500 });
        }

        if (product.is_available === false) {
            return NextResponse.json({ error: 'Товар временно недоступен' }, { status: 400 });
        }

        if (product.stock_quantity !== null && product.stock_quantity < quantity) {
            return NextResponse.json({ 
                error: `Недостаточно товара на складе. Доступно: ${product.stock_quantity}` 
            }, { status: 400 });
        }

        const { data: existingItem, error: checkError } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking cart', checkError);
            return NextResponse.json({ error: 'Ошибка проверки корзины' }, { status: 500 });
        }

        const now = new Date().toISOString();
        let finalQuantity = quantity;

        if (existingItem) {
            finalQuantity = existingItem.quantity + quantity;
            
            if (product.stock_quantity !== null && product.stock_quantity < finalQuantity) {
                return NextResponse.json({ 
                    error: `Невозможно добавить. В корзине уже ${existingItem.quantity} шт., доступно ${product.stock_quantity} шт.` 
                }, { status: 400 });
            }

            const { error: updateError } = await supabase
                .from('cart')
                .update({
                    quantity: finalQuantity,
                    updated_at: now
                })
                .eq('user_id', session.user.id)
                .eq('product_id', productId);

            if (updateError) {
                logError('Error updating cart', updateError);
                return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
            }
        } else {
            const { error: insertError } = await supabase
                .from('cart')
                .insert({
                    user_id: session.user.id,
                    product_id: productId,
                    quantity: finalQuantity,
                    created_at: now,
                    updated_at: now
                });

            if (insertError) {
                logError('Error inserting into cart', insertError);
                return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
            }
        }

        invalidateCache(`cart_${session.user.id}`);

        const { data: cartCount, error: countError } = await supabase
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

export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = cartLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for cart PUT', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const body = await request.json();
        const validatedData = updateQuantitySchema.parse(body);
        const { productId, quantity } = validatedData;

        if (quantity === 0) {
            return await handleDeleteItem(session.user.id, productId);
        }

        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, stock_quantity, is_available')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        if (product.is_available === false) {
            return NextResponse.json({ error: 'Товар временно недоступен' }, { status: 400 });
        }

        if (product.stock_quantity !== null && product.stock_quantity < quantity) {
            return NextResponse.json({ 
                error: `Недостаточно товара на складе. Доступно: ${product.stock_quantity}` 
            }, { status: 400 });
        }

        const { error: updateError } = await supabase
            .from('cart')
            .update({ 
                quantity, 
                updated_at: new Date().toISOString() 
            })
            .eq('user_id', session.user.id)
            .eq('product_id', productId);

        if (updateError) {
            logError('Error updating cart quantity', updateError);
            return NextResponse.json({ error: 'Ошибка обновления количества' }, { status: 500 });
        }

        invalidateCache(`cart_${session.user.id}`);
        const cartInfo = await getCartSummary(session.user.id);

        logApiRequest('PUT', '/api/cart', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            success: true,
            message: 'Количество обновлено',
            ...cartInfo
        });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating cart quantity', error);
        return NextResponse.json({ error: 'Ошибка обновления количества' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = cartLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for cart DELETE', { ip: getClientIP(request) });
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

        const { data: cartItem, error: checkError } = await supabase
            .from('cart')
            .select('product_id')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle();

        if (checkError) {
            logError('Error checking cart item', checkError);
            return NextResponse.json({ error: 'Ошибка проверки товара в корзине' }, { status: 500 });
        }

        if (!cartItem) {
            return NextResponse.json({ error: 'Товар не найден в корзине' }, { status: 404 });
        }

        return await handleDeleteItem(session.user.id, productId);
        
    } catch (error) {
        logError('Error deleting from cart', error);
        return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
    }
}