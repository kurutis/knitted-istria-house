// app/api/cart/[productId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации
const updateCartSchema = z.object({
    quantity: z.number().int().min(0, 'Количество не может быть отрицательным').max(999, 'Максимальное количество 999 единиц'),
});

// Rate limiting для корзины (20 запросов в минуту)
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for cart update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized cart update attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { productId } = await params;
        const body = await request.json();
        
        // Валидация ID товара
        if (!productId || !isValidUUID(productId)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        // Валидация количества
        const validatedData = updateCartSchema.parse({
            quantity: body.quantity
        });
        const { quantity } = validatedData;

        // Проверяем, существует ли товар и активен ли он
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, title, status, price, stock_quantity')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            logInfo('Product not found for cart update', { productId });
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        // Проверяем, активен ли товар
        if (product.status !== 'active') {
            return NextResponse.json({ error: 'Товар недоступен для добавления в корзину' }, { status: 400 });
        }

        // Проверяем наличие на складе
        if (quantity > 0 && product.stock_quantity !== null && product.stock_quantity < quantity) {
            return NextResponse.json({ 
                error: `Недостаточно товара на складе. Доступно: ${product.stock_quantity}`,
                maxAvailable: product.stock_quantity
            }, { status: 400 });
        }

        const now = new Date().toISOString();

        if (quantity <= 0) {
            // Удаляем товар из корзины
            const { error: deleteError } = await supabase
                .from('cart')
                .delete()
                .eq('user_id', session.user.id)
                .eq('product_id', productId);

            if (deleteError) {
                logError('Error deleting from cart', deleteError);
                return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
            }
            
            logInfo('Item removed from cart', { 
                userId: session.user.id, 
                productId,
                productTitle: product.title
            });
        } else {
            // Проверяем, существует ли товар в корзине
            const { data: existingItem, error: checkError } = await supabase
                .from('cart')
                .select('id, quantity')
                .eq('user_id', session.user.id)
                .eq('product_id', productId)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                logError('Error checking cart', checkError);
                return NextResponse.json({ error: 'Ошибка проверки корзины' }, { status: 500 });
            }

            if (!existingItem) {
                // Если товара нет в корзине, добавляем его
                const { error: insertError } = await supabase
                    .from('cart')
                    .insert({
                        user_id: session.user.id,
                        product_id: productId,
                        quantity: quantity,
                        created_at: now,
                        updated_at: now
                    });

                if (insertError) {
                    logError('Error inserting into cart', insertError);
                    return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
                }
                
                logInfo('Item added to cart', { 
                    userId: session.user.id, 
                    productId,
                    quantity,
                    productTitle: product.title
                });
            } else {
                // Обновляем количество
                const { error: updateError } = await supabase
                    .from('cart')
                    .update({
                        quantity: quantity,
                        updated_at: now
                    })
                    .eq('user_id', session.user.id)
                    .eq('product_id', productId);

                if (updateError) {
                    logError('Error updating cart', updateError);
                    return NextResponse.json({ error: 'Ошибка обновления корзины' }, { status: 500 });
                }
                
                logInfo('Cart item quantity updated', { 
                    userId: session.user.id, 
                    productId,
                    oldQuantity: existingItem.quantity,
                    newQuantity: quantity,
                    productTitle: product.title
                });
            }
        }

        // Инвалидируем кэш корзины
        invalidateCache(`cart_${session.user.id}`);

        // Логируем действие в аудит
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: quantity <= 0 ? 'CART_ITEM_REMOVED' : 'CART_ITEM_UPDATED',
                entity_type: 'cart',
                entity_id: productId,
                old_values: quantity <= 0 ? { product_id: productId } : null,
                new_values: { quantity: quantity > 0 ? quantity : 0, product_title: product.title },
                created_at: now
            });

        // Получаем обновлённое количество товаров в корзине
        const { data: cartItems, error: countError } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id);

        if (countError) {
            logError('Error getting cart count', countError, 'warning');
        }

        const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        logApiRequest('PATCH', `/api/cart/${productId}`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            success: true, 
            cartCount: cartCount,
            message: quantity <= 0 ? 'Товар удален из корзины' : 'Количество обновлено',
            item: quantity > 0 ? {
                product_id: productId,
                quantity: quantity,
                price: product.price
            } : null
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating cart', error);
        return NextResponse.json({ error: 'Ошибка обновления корзины' }, { status: 500 });
    }
}

// GET - получить количество товаров в корзине
export async function GET(
    request: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ count: 0, total: 0 }, { status: 200 });
        }

        const { data: cartItems, error } = await supabase
            .from('cart')
            .select('quantity, price')
            .eq('user_id', session.user.id);

        if (error) {
            logError('Error getting cart count', error, 'warning');
            return NextResponse.json({ count: 0, total: 0 }, { status: 200 });
        }

        const count = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const total = cartItems?.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0) || 0;

        return NextResponse.json({ 
            count,
            total,
            items: cartItems?.length || 0
        }, { status: 200 });
        
    } catch (error) {
        logError('Error getting cart count', error);
        return NextResponse.json({ count: 0, total: 0 }, { status: 200 });
    }
}