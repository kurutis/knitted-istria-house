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

const cartLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// GET - получить корзину
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = cartLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                items: [], 
                totalCount: 0, 
                totalAmount: 0
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ items: [], totalCount: 0, totalAmount: 0 });
        }

        const cacheKey = `cart_${session.user.id}`;
        const cartData = await cachedQuery(cacheKey, async () => {
            // Получаем товары в корзине
            const { data: cartItems, error } = await supabase
                .from('cart')
                .select(`
                    product_id,
                    quantity,
                    created_at
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching cart:', error);
                return { items: [], totalCount: 0, totalAmount: 0 };
            }

            if (!cartItems || cartItems.length === 0) {
                return { items: [], totalCount: 0, totalAmount: 0 };
            }

            // Получаем ID товаров
            const productIds = cartItems.map(item => item.product_id);
            
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
                return { items: [], totalCount: 0, totalAmount: 0 };
            }

            // Создаем Map для быстрого доступа к товарам
            const productsMap = new Map();
            products?.forEach(p => {
                productsMap.set(p.id, p);
            });

            // Получаем имена мастеров
            const masterIds = [...new Set(products?.map(p => p.master_id).filter(Boolean) || [])];
            const masterNamesMap = new Map();
            
            if (masterIds.length > 0) {
                const { data: masters } = await supabase
                    .from('masters')
                    .select('id, user_id')
                    .in('id', masterIds);
                
                if (masters) {
                    const userIds = masters.map(m => m.user_id);
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('user_id, full_name')
                        .in('user_id', userIds);
                    
                    const profileMap = new Map();
                    profiles?.forEach(p => {
                        profileMap.set(p.user_id, p);
                    });
                    
                    masters.forEach(m => {
                        const profile = profileMap.get(m.user_id);
                        masterNamesMap.set(m.id, profile?.full_name || 'Мастер');
                    });
                }
            }

            // Формируем результат
            const items = cartItems.map(item => {
                const product = productsMap.get(item.product_id);
                return {
                    product_id: item.product_id,
                    quantity: item.quantity,
                    title: product?.title || 'Без названия',
                    price: parseFloat(product?.price) || 0,
                    main_image_url: product?.main_image_url || null,
                    master_name: masterNamesMap.get(product?.master_id) || 'Мастер',
                };
            });

            const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return { items, totalCount, totalAmount };
        }, 5);

        return NextResponse.json({
            items: cartData.items,
            totalCount: cartData.totalCount,
            totalAmount: cartData.totalAmount
        });
        
    } catch (error) {
        console.error('Error fetching cart:', error);
        return NextResponse.json({ 
            items: [], 
            totalCount: 0, 
            totalAmount: 0
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

        // Проверяем товар
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, title, price, is_available')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        if (product.is_available === false) {
            return NextResponse.json({ error: 'Товар временно недоступен' }, { status: 400 });
        }

        // Проверяем, есть ли уже в корзине
        const { data: existingItem } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id)
            .eq('product_id', productId)
            .maybeSingle();

        const now = new Date().toISOString();

        if (existingItem) {
            // Обновляем количество
            await supabase
                .from('cart')
                .update({
                    quantity: existingItem.quantity + quantity,
                    updated_at: now
                })
                .eq('user_id', session.user.id)
                .eq('product_id', productId);
        } else {
            // Добавляем новый товар
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

        // Получаем общее количество
        const { data: cartItems } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id);

        const totalCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        return NextResponse.json({
            success: true,
            cartCount: totalCount,
            message: existingItem ? 'Количество товара обновлено' : 'Товар добавлен в корзину'
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
        }
        console.error('Error adding to cart:', error);
        return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
    }
}

// PATCH - обновить количество товара в корзине
export async function PATCH(request: Request) {
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
        const { productId, quantity } = body;

        if (!productId || !isValidUUID(productId)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        if (typeof quantity !== 'number' || quantity < 0) {
            return NextResponse.json({ error: 'Неверное количество' }, { status: 400 });
        }

        if (quantity === 0) {
            // Удаляем товар
            await supabase
                .from('cart')
                .delete()
                .eq('user_id', session.user.id)
                .eq('product_id', productId);
        } else {
            // Проверяем, есть ли уже в корзине
            const { data: existingItem } = await supabase
                .from('cart')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('product_id', productId)
                .maybeSingle();

            if (existingItem) {
                // Обновляем количество
                await supabase
                    .from('cart')
                    .update({ 
                        quantity, 
                        updated_at: new Date().toISOString() 
                    })
                    .eq('user_id', session.user.id)
                    .eq('product_id', productId);
            } else {
                // Добавляем новый товар
                await supabase
                    .from('cart')
                    .insert({
                        user_id: session.user.id,
                        product_id: productId,
                        quantity,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
            }
        }

        invalidateCache(`cart_${session.user.id}`);

        // Получаем обновленную корзину
        const { data: cartItems } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id);

        const totalCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        return NextResponse.json({
            success: true,
            cartCount: totalCount,
            message: quantity === 0 ? 'Товар удален из корзины' : 'Количество обновлено'
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating cart:', error);
        return NextResponse.json({ error: 'Ошибка обновления корзины' }, { status: 500 });
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

        if (!productId || !isValidUUID(productId)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        await supabase
            .from('cart')
            .delete()
            .eq('user_id', session.user.id)
            .eq('product_id', productId);

        invalidateCache(`cart_${session.user.id}`);

        // Получаем обновленную корзину
        const { data: cartItems } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id);

        const totalCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        return NextResponse.json({ 
            success: true, 
            message: 'Товар удален из корзины',
            cartCount: totalCount
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error deleting from cart:', error);
        return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
    }
}