// app/api/catalog/products/[id]/route.ts
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
    { params }: { params: Promise<{ id: string }> }  // Изменено: productId → id
) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for cart PATCH', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized cart update attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;  // Изменено: productId → id
        const body = await request.json();
        
        // Валидация ID товара
        if (!id || !isValidUUID(id)) {
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
            .select('id, title, status, price, stock_quantity, is_available')
            .eq('id', id)  // Изменено: productId → id
            .single();

        if (productError || !product) {
            logInfo('Product not found for cart update', { productId: id });
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        // Проверяем, активен ли товар
        if (product.status !== 'active' || product.is_available === false) {
            return NextResponse.json({ error: 'Товар недоступен для добавления в корзину' }, { status: 400 });
        }

        // Проверка наличия на складе
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
                .eq('product_id', id);  // Изменено: productId → id

            if (deleteError) {
                logError('Error deleting from cart', deleteError);
                return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
            }
            
            logInfo('Item removed from cart', { 
                userId: session.user.id, 
                productId: id,
                productTitle: product.title
            });
        } else {
            // Проверяем, существует ли товар в корзине
            const { data: existingItem, error: checkError } = await supabase
                .from('cart')
                .select('id, quantity')
                .eq('user_id', session.user.id)
                .eq('product_id', id)  // Изменено: productId → id
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                logError('Error checking cart', checkError);
                return NextResponse.json({ error: 'Ошибка проверки корзины' }, { status: 500 });
            }

            if (!existingItem) {
                const { error: insertError } = await supabase
                    .from('cart')
                    .insert({
                        user_id: session.user.id,
                        product_id: id,  // Изменено: productId → id
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
                    productId: id,
                    quantity,
                    productTitle: product.title
                });
            } else {
                const { error: updateError } = await supabase
                    .from('cart')
                    .update({
                        quantity: quantity,
                        updated_at: now
                    })
                    .eq('user_id', session.user.id)
                    .eq('product_id', id);  // Изменено: productId → id

                if (updateError) {
                    logError('Error updating cart', updateError);
                    return NextResponse.json({ error: 'Ошибка обновления корзины' }, { status: 500 });
                }
                
                logInfo('Cart quantity updated', { 
                    userId: session.user.id, 
                    productId: id,
                    oldQuantity: existingItem.quantity,
                    newQuantity: quantity,
                    productTitle: product.title
                });
            }
        }

        // Инвалидируем кэш корзины пользователя
        invalidateCache(`cart_${session.user.id}`);

        // Получаем обновлённое количество товаров в корзине
        const { data: cartItems, error: countError } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id);

        if (countError) {
            logError('Error getting cart count', countError, 'warning');
        }

        const cartCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        logApiRequest('PATCH', `/api/cart/${id}`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            success: true, 
            cartCount: cartCount,
            message: quantity <= 0 ? 'Товар удален из корзины' : 'Количество обновлено',
            item: quantity > 0 ? {
                product_id: id,
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

// GET - получить количество товара в корзине
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }  // Изменено: productId → id
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ quantity: 0 }, { status: 200 });
        }

        const { id } = await params;  // Изменено: productId → id
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ quantity: 0 }, { status: 200 });
        }

        const { data: cartItem, error } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', session.user.id)
            .eq('product_id', id)  // Изменено: productId → id
            .maybeSingle();

        if (error) {
            logError('Error getting cart item', error, 'warning');
            return NextResponse.json({ quantity: 0 }, { status: 200 });
        }

        return NextResponse.json({ 
            quantity: cartItem?.quantity || 0 
        }, { status: 200 });
        
    } catch (error) {
        logError('Error getting cart item', error);
        return NextResponse.json({ quantity: 0 }, { status: 200 });
    }
}