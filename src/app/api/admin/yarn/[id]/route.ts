// app/api/admin/yarn/[id]/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации для PUT запроса
const updateYarnSchema = z.object({
    name: z.string().min(2, 'Название должно содержать минимум 2 символа').max(255).optional(),
    article: z.string().min(1, 'Артикул обязателен').max(100).optional(),
    brand: z.string().max(100).optional().nullable(),
    color: z.string().max(100).optional().nullable(),
    composition: z.string().max(500).optional().nullable(),
    weight_grams: z.number().int().positive('Вес должен быть положительным числом').optional().nullable(),
    length_meters: z.number().int().positive('Длина должна быть положительным числом').optional().nullable(),
    price: z.number().positive('Цена должна быть положительной').max(1000000).optional().nullable(),
    in_stock: z.boolean().optional(),
    stock_quantity: z.number().int().min(0, 'Количество не может быть отрицательным').max(99999).optional(),
    image_url: z.string().url('Неверный формат URL').optional().nullable(),
    description: z.string().max(1000, 'Описание не может превышать 1000 символов').optional().nullable(),
});

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });
const deleteLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

// Валидация UUID
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
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin yarn access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID' }, { status: 400 });
        }

        // Используем кэширование
        const cacheKey = `yarn_item_${id}`;
        
        const yarn = await cachedQuery(cacheKey, async () => {
            const { data, error } = await supabase
                .from('yarn_catalog')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('NOT_FOUND');
                }
                logError('Error fetching yarn item', error);
                throw new Error('DATABASE_ERROR');
            }

            // Санитизация данных
            return {
                ...data,
                name: sanitize.text(data.name),
                article: sanitize.text(data.article),
                brand: data.brand ? sanitize.text(data.brand) : null,
                color: data.color ? sanitize.text(data.color) : null,
                composition: data.composition ? sanitize.text(data.composition) : null,
                description: data.description ? sanitize.text(data.description) : null,
                price: parseFloat(data.price || 0),
                weight_grams: data.weight_grams ? parseInt(data.weight_grams) : null,
                length_meters: data.length_meters ? parseInt(data.length_meters) : null
            };
        }, 60); // TTL 60 секунд

        logApiRequest('GET', `/api/admin/yarn/${id}`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(yarn, { 
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=60',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30'
            }
        });
        
    } catch (error) {
        if (error instanceof Error && error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 });
        }
        logError('Error in admin yarn GET', error);
        return NextResponse.json({ error: 'Ошибка загрузки пряжи' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin yarn update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin yarn update attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID' }, { status: 400 });
        }

        const body = await request.json();
        
        // Убираем id из тела запроса, если он там есть
        const { id: _, ...updateDataRaw } = body;
        
        // Валидация данных
        const validatedData = updateYarnSchema.parse(updateDataRaw);
        
        // Санитизация строковых полей
        if (validatedData.name) validatedData.name = sanitize.text(validatedData.name);
        if (validatedData.article) validatedData.article = sanitize.text(validatedData.article);
        if (validatedData.brand) validatedData.brand = sanitize.text(validatedData.brand) || null;
        if (validatedData.color) validatedData.color = sanitize.text(validatedData.color) || null;
        if (validatedData.composition) validatedData.composition = sanitize.text(validatedData.composition) || null;
        if (validatedData.description) validatedData.description = sanitize.text(validatedData.description) || null;
        
        // Получаем старые данные для аудита
        const { data: oldYarn, error: fetchError } = await supabase
            .from('yarn_catalog')
            .select('name, article, price, in_stock, brand, color')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                logInfo('Yarn not found for update', { yarnId: id });
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 });
            }
            logError('Error fetching yarn for update', fetchError);
            return NextResponse.json({ error: 'Ошибка загрузки пряжи' }, { status: 500 });
        }

        // Проверка уникальности артикула (если изменился)
        if (validatedData.article && validatedData.article !== oldYarn.article) {
            const { data: existing, error: checkError } = await supabase
                .from('yarn_catalog')
                .select('id')
                .eq('article', validatedData.article)
                .neq('id', id)
                .maybeSingle();

            if (checkError) {
                logError('Error checking article uniqueness', checkError, 'warning');
            }

            if (existing) {
                return NextResponse.json({ error: 'Пряжа с таким артикулом уже существует' }, { status: 400 });
            }
        }

        const now = new Date().toISOString();
        
        // Добавляем updated_at
        const updateData = {
            ...validatedData,
            updated_at: now
        };

        // Обновляем пряжу
        const { data: updatedYarn, error } = await supabase
            .from('yarn_catalog')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logError('Error updating yarn', error);
            return NextResponse.json({ error: 'Ошибка обновления пряжи' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(`yarn_item_${id}`);
        invalidateCache(/^admin_yarn/);
        invalidateCache(/^yarn_/);

        // Логируем действие администратора
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'YARN_UPDATED',
                entity_type: 'yarn_catalog',
                entity_id: id,
                old_values: { 
                    name: oldYarn.name, 
                    article: oldYarn.article,
                    price: oldYarn.price,
                    in_stock: oldYarn.in_stock
                },
                new_values: { 
                    name: updatedYarn.name, 
                    article: updatedYarn.article,
                    price: updatedYarn.price,
                    in_stock: updatedYarn.in_stock
                },
                created_at: now
            });

        logApiRequest('PUT', `/api/admin/yarn/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin updated yarn`, { 
            yarnId: id, 
            adminId: session.user.id,
            name: updatedYarn.name,
            article: updatedYarn.article
        });

        return NextResponse.json({ 
            success: true,
            message: 'Пряжа успешно обновлена',
            yarn: {
                ...updatedYarn,
                price: parseFloat(updatedYarn.price || 0),
                weight_grams: updatedYarn.weight_grams ? parseInt(updatedYarn.weight_grams) : null,
                length_meters: updatedYarn.length_meters ? parseInt(updatedYarn.length_meters) : null
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error in admin yarn PUT', error);
        return NextResponse.json({ error: 'Ошибка обновления пряжи' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin yarn delete', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin yarn delete attempt', { ip });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID' }, { status: 400 });
        }

        // Получаем информацию о пряже для аудита
        const { data: yarnToDelete, error: fetchError } = await supabase
            .from('yarn_catalog')
            .select('name, article')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                logInfo('Yarn not found for delete', { yarnId: id });
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 });
            }
            logError('Error fetching yarn for delete', fetchError);
            return NextResponse.json({ error: 'Ошибка загрузки пряжи' }, { status: 500 });
        }

        // Проверяем, используется ли пряжа в товарах
        const { count: usedInProducts, error: checkError } = await supabase
            .from('product_yarn')
            .select('id', { count: 'exact', head: true })
            .eq('yarn_id', id);

        if (checkError) {
            logError('Error checking product_yarn', checkError);
            return NextResponse.json({ error: 'Ошибка проверки использования пряжи' }, { status: 500 });
        }

        if (usedInProducts && usedInProducts > 0) {
            return NextResponse.json({ 
                error: 'Невозможно удалить пряжу, так как она используется в товарах. Сначала удалите или измените связи с товарами.' 
            }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Удаляем пряжу
        const { error: deleteError } = await supabase
            .from('yarn_catalog')
            .delete()
            .eq('id', id);

        if (deleteError) {
            logError('Error deleting yarn', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления пряжи' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(`yarn_item_${id}`);
        invalidateCache(/^admin_yarn/);
        invalidateCache(/^yarn_/);

        // Логируем действие администратора
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'YARN_DELETED',
                entity_type: 'yarn_catalog',
                entity_id: id,
                old_values: { name: yarnToDelete.name, article: yarnToDelete.article },
                created_at: now
            });

        logApiRequest('DELETE', `/api/admin/yarn/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin deleted yarn`, { 
            yarnId: id, 
            adminId: session.user.id,
            name: yarnToDelete.name,
            article: yarnToDelete.article
        });

        return NextResponse.json({ 
            success: true,
            message: 'Пряжа успешно удалена'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in admin yarn DELETE', error);
        return NextResponse.json({ error: 'Ошибка удаления пряжи' }, { status: 500 });
    }
}