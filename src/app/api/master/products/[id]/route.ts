// app/api/master/products/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface ProductData {
    title?: string;
    price?: number | string;
    category?: string;
    description?: string;
    care_instructions?: string;
    technique?: string;
    size?: string;
    color?: string;
    is_available?: boolean;
    stock_quantity?: number;
}

interface ProductUpdateData {
    title: string;
    description: string | null;
    price: number;
    category: string;
    technique: string | null;
    size: string | null;
    color: string | null;
    care_instructions: string | null;
    updated_at: string;
    is_available?: boolean;
    stock_quantity?: number;
}

interface ProductData {
    title?: string;
    price?: number | string;
    category?: string;
    description?: string;
    care_instructions?: string;
    technique?: string;
    size?: string;
    color?: string;
    is_available?: boolean;
    stock_quantity?: number;
}

interface ProductUpdateData {
    title: string;
    description: string | null;
    price: number;
    category: string;
    technique: string | null;
    size: string | null;
    color: string | null;
    care_instructions: string | null;
    updated_at: string;
    is_available?: boolean;
    stock_quantity?: number;
}

// Rate limiting
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 }); // 20 обновлений в минуту
const deleteLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 удалений в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Валидация данных товара
function validateProductData(data: ProductData): { valid: boolean; error?: string } {
    if (!data.title || typeof data.title !== 'string') {
        return { valid: false, error: 'Название товара обязательно' };
    }
    
    const trimmedTitle = data.title.trim();
    if (trimmedTitle.length < 3) {
        return { valid: false, error: 'Название должно содержать минимум 3 символа' };
    }
    if (trimmedTitle.length > 200) {
        return { valid: false, error: 'Название не может превышать 200 символов' };
    }

    if (!data.price) {
        return { valid: false, error: 'Цена обязательна' };
    }
    
    const price = parseFloat(data.price as string);
    if (isNaN(price) || price < 0) {
        return { valid: false, error: 'Цена должна быть неотрицательным числом' };
    }
    if (price > 10000000) {
        return { valid: false, error: 'Цена не может превышать 10 000 000 ₽' };
    }

    if (!data.category || typeof data.category !== 'string') {
        return { valid: false, error: 'Категория обязательна' };
    }

    if (data.description && data.description.length > 10000) {
        return { valid: false, error: 'Описание не может превышать 10000 символов' };
    }

    return { valid: true };
}

// PUT - обновить товар
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }
        
        if (session.user.role !== 'master' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация данных
        const validation = validateProductData(body);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const {
            title,
            description,
            price,
            category,
            technique,
            size,
            color,
            care_instructions,
            is_available,
            stock_quantity
        } = body;

        // Проверяем, существует ли товар и принадлежит ли мастеру
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('master_id, title, main_image_url')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
            }
            logError('Error checking product', checkError);
            return NextResponse.json({ error: 'Ошибка проверки товара' }, { status: 500 });
        }

        // Проверка прав (админ может редактировать любые товары)
        const isAdmin = session.user.role === 'admin';
        const isOwner = existingProduct.master_id === session.user.id;
        
        if (!isAdmin && !isOwner) {
            logInfo('Unauthorized product update attempt', {
                userId: session.user.id,
                productId: id,
                productOwnerId: existingProduct.master_id
            });
            return NextResponse.json({ error: 'У вас нет прав на редактирование этого товара' }, { status: 403 });
        }

        // Проверка на дубликат названия (если название изменилось)
        if (title !== existingProduct.title) {
            const { data: duplicate } = await supabase
                .from('products')
                .select('id')
                .eq('title', title.trim())
                .eq('master_id', existingProduct.master_id)
                .neq('id', id)
                .maybeSingle();
            
            if (duplicate) {
                return NextResponse.json({ error: 'Товар с таким названием уже существует' }, { status: 400 });
            }
        }

        // Обновляем товар
        const updateData: ProductUpdateData = {
            title: title.trim(),
            description: description?.trim() || null,
            price: parseFloat(price),
            category,
            technique: technique?.trim() || null,
            size: size?.trim() || null,
            color: color?.trim() || null,
            care_instructions: care_instructions?.trim() || null,
            updated_at: new Date().toISOString()
        };

        // Добавляем опциональные поля
        if (is_available !== undefined) {
            updateData.is_available = is_available;
        }
        if (stock_quantity !== undefined && !isNaN(stock_quantity)) {
            updateData.stock_quantity = Math.max(0, parseInt(stock_quantity));
        }

        const { data: updatedProduct, error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            logError('Error updating product', updateError);
            return NextResponse.json({ error: 'Ошибка обновления товара' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(`product_${id}`);
        invalidateCache(new RegExp(`master_products_${existingProduct.master_id}`));
        invalidateCache('products_list');
        invalidateCache('products_feed');

        logInfo('Product updated', {
            productId: id,
            userId: session.user.id,
            userRole: session.user.role,
            title: title.trim(),
            price: parseFloat(price),
            category,
            duration: Date.now() - startTime
        });

        // Создаем запись в аудите
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'PRODUCT_UPDATED',
                entity_type: 'product',
                entity_id: id,
                old_values: { title: existingProduct.title },
                new_values: { title: title.trim(), price: parseFloat(price) },
                created_at: new Date().toISOString()
            })
            .then(() => {});

        return NextResponse.json({ 
            success: true, 
            message: 'Товар успешно обновлен',
            product: {
                ...updatedProduct,
                price: parseFloat(updatedProduct.price)
            }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in PUT /api/master/products/[id]', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка обновления товара';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// DELETE - удалить товар
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }
        
        if (session.user.role !== 'master' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        // Получаем информацию о товаре
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select(`
                master_id,
                title,
                main_image_url,
                status,
                order_items (id)
            `)
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
            }
            logError('Error checking product for deletion', checkError);
            return NextResponse.json({ error: 'Ошибка проверки товара' }, { status: 500 });
        }

        // Проверка прав
        const isAdmin = session.user.role === 'admin';
        const isOwner = existingProduct.master_id === session.user.id;
        
        if (!isAdmin && !isOwner) {
            logInfo('Unauthorized product delete attempt', {
                userId: session.user.id,
                productId: id,
                productOwnerId: existingProduct.master_id
            });
            return NextResponse.json({ error: 'У вас нет прав на удаление этого товара' }, { status: 403 });
        }

        // Проверка: есть ли товар в активных заказах
        if (existingProduct.order_items && existingProduct.order_items.length > 0) {
            return NextResponse.json({ 
                error: 'Нельзя удалить товар, который есть в заказах. Сначала сделайте его недоступным.' 
            }, { status: 400 });
        }

        // Удаляем изображения из Storage (если есть)
        if (existingProduct.main_image_url) {
            const imagePath = extractStoragePath(existingProduct.main_image_url);
            if (imagePath) {
                await supabase.storage
                    .from('products')
                    .remove([imagePath])
                    .catch(err => logError('Error deleting product image', err, 'warning'));
            }
        }

        // Удаляем товар (связанные записи удалятся каскадно)
        const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (deleteError) {
            logError('Error deleting product', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления товара' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(`product_${id}`);
        invalidateCache(new RegExp(`master_products_${existingProduct.master_id}`));
        invalidateCache('products_list');
        invalidateCache('products_feed');

        logInfo('Product deleted', {
            productId: id,
            userId: session.user.id,
            userRole: session.user.role,
            title: existingProduct.title,
            wasPublished: existingProduct.status === 'active',
            duration: Date.now() - startTime
        });

        // Создаем запись в аудите
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'PRODUCT_DELETED',
                entity_type: 'product',
                entity_id: id,
                old_values: { 
                    title: existingProduct.title,
                    master_id: existingProduct.master_id,
                    status: existingProduct.status
                },
                created_at: new Date().toISOString()
            })
            .then(() => {});

        return NextResponse.json({ 
            success: true, 
            message: 'Товар успешно удален'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in DELETE /api/master/products/[id]', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка удаления товара';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// Вспомогательная функция для извлечения пути из URL
function extractStoragePath(url: string): string | null {
    try {
        const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        return match ? decodeURIComponent(match[1]) : null;
    } catch {
        return null;
    }
}