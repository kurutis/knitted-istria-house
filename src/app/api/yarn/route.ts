// app/api/admin/yarn/route.ts
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface YarnData {
    name?: string;
    article?: string;
    brand?: string;
    color?: string;
    composition?: string;
    weight_grams?: number | string;
    length_meters?: number | string;
    price?: number | string;
    in_stock?: boolean;
    stock_quantity?: number;
    image_url?: string;
    description?: string;
}

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 запросов в минуту
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 созданий в минуту
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 }); // 20 обновлений в минуту
const deleteLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 удалений в минуту

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Валидация данных пряжи
function validateYarnData(data: YarnData): { valid: boolean; error?: string } {
    if (!data.name || typeof data.name !== 'string') {
        return { valid: false, error: 'Название пряжи обязательно' };
    }
    const trimmedName = data.name.trim();
    if (trimmedName.length < 2) {
        return { valid: false, error: 'Название должно содержать минимум 2 символа' };
    }
    if (trimmedName.length > 200) {
        return { valid: false, error: 'Название не может превышать 200 символов' };
    }

    if (!data.article || typeof data.article !== 'string') {
        return { valid: false, error: 'Артикул обязателен' };
    }
    if (data.article.length > 50) {
        return { valid: false, error: 'Артикул не может превышать 50 символов' };
    }

    if (data.price !== undefined && data.price !== null) {
        const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
        if (isNaN(price) || price < 0) {
            return { valid: false, error: 'Цена должна быть неотрицательным числом' };
        }
    }

    if (data.weight_grams !== undefined && data.weight_grams !== null) {
        const weight = typeof data.weight_grams === 'string' ? parseInt(data.weight_grams) : data.weight_grams;
        if (isNaN(weight) || weight < 0) {
            return { valid: false, error: 'Вес должен быть неотрицательным числом' };
        }
    }

    if (data.length_meters !== undefined && data.length_meters !== null) {
        const length = typeof data.length_meters === 'string' ? parseInt(data.length_meters) : data.length_meters;
        if (isNaN(length) || length < 0) {
            return { valid: false, error: 'Длина должна быть неотрицательным числом' };
        }
    }

    return { valid: true };
}

// GET - получить список пряжи
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                yarns: [],
                pagination: {}
            }, { status: 429 });
        }

        // Параметры пагинации и фильтрации
        const { searchParams } = new URL(request.url);
        const brand = searchParams.get('brand');
        const inStock = searchParams.get('in_stock');
        const search = searchParams.get('search');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        const cacheKey = `admin_yarn_${brand || 'all'}_${inStock || 'all'}_${search || 'all'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('yarn_catalog')
                .select('*', { count: 'exact' });

            if (brand && brand !== 'all') {
                query = query.eq('brand', brand);
            }
            if (inStock && inStock !== 'all') {
                query = query.eq('in_stock', inStock === 'true');
            }
            if (search) {
                const safeSearch = search.trim().replace(/[%_]/g, '\\$&');
                query = query.or(`name.ilike.%${safeSearch}%,brand.ilike.%${safeSearch}%,article.ilike.%${safeSearch}%`);
            }

            const { data: yarns, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching yarn catalog', error);
                throw new Error('DATABASE_ERROR');
            }

            // Получаем уникальные бренды для фильтрации
            const { data: brandsData } = await supabase
                .from('yarn_catalog')
                .select('brand')
                .not('brand', 'is', null);
            
            const uniqueBrands = [...new Set(brandsData?.map(b => b.brand).filter(Boolean))];

            const formattedYarns = yarns?.map(yarn => ({
                ...yarn,
                price: parseFloat(yarn.price || 0),
                weight_grams: yarn.weight_grams ? parseInt(yarn.weight_grams) : null,
                length_meters: yarn.length_meters ? parseInt(yarn.length_meters) : null
            })) || [];

            return {
                yarns: formattedYarns,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                filters: {
                    brands: uniqueBrands.sort()
                }
            };
        });

        logInfo('Admin yarn catalog fetched', {
            adminId: session.user.id,
            count: result.yarns.length,
            total: result.pagination.total,
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
        logError('Error in admin yarn GET', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки каталога пряжи',
            yarns: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
        }, { status: 500 });
    }
}

// POST - добавить пряжу
export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
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

        const body = await request.json();
        
        const validation = validateYarnData(body);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const { name, article, brand, color, composition, weight_grams, length_meters, price, in_stock, stock_quantity, image_url, description } = body;

        // Проверяем, существует ли пряжа с таким артикулом
        const { data: existing, error: checkError } = await supabase
            .from('yarn_catalog')
            .select('id')
            .eq('article', article.trim())
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            logError('Error checking existing yarn', checkError);
            return NextResponse.json({ error: 'Ошибка проверки пряжи' }, { status: 500 });
        }

        if (existing) {
            return NextResponse.json({ error: 'Пряжа с таким артикулом уже существует' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const { data: newYarn, error: insertError } = await supabase
            .from('yarn_catalog')
            .insert({
                name: name.trim(),
                article: article.trim(),
                brand: brand?.trim() || null,
                color: color?.trim() || null,
                composition: composition?.trim() || null,
                weight_grams: weight_grams ? parseInt(weight_grams) : null,
                length_meters: length_meters ? parseInt(length_meters) : null,
                price: price ? parseFloat(price) : null,
                in_stock: in_stock ?? true,
                stock_quantity: stock_quantity ?? 0,
                image_url: image_url || null,
                description: description?.trim() || null,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (insertError) {
            logError('Error creating yarn', insertError);
            return NextResponse.json({ error: 'Ошибка добавления пряжи' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(/^admin_yarn_/);

        logInfo('Yarn added to catalog', {
            adminId: session.user.id,
            yarnId: newYarn.id,
            name: newYarn.name,
            article: newYarn.article,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Пряжа успешно добавлена',
            yarn: { ...newYarn, price: parseFloat(newYarn.price || 0) }
        }, { status: 201 });
        
    } catch (error) {
        logError('Error in admin yarn POST', error);
        return NextResponse.json({ error: 'Ошибка добавления пряжи' }, { status: 500 });
    }
}

// PUT - обновить пряжу
export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID пряжи обязателен' }, { status: 400 });
        }

        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID пряжи' }, { status: 400 });
        }

        // Валидация обновляемых полей
        if (updates.name) {
            const nameValidation = validateYarnData({ name: updates.name });
            if (!nameValidation.valid) {
                return NextResponse.json({ error: nameValidation.error }, { status: 400 });
            }
        }

        // Если меняется артикул, проверяем уникальность
        if (updates.article) {
            const { data: existing, error: checkError } = await supabase
                .from('yarn_catalog')
                .select('id')
                .eq('article', updates.article.trim())
                .neq('id', id)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                logError('Error checking article uniqueness', checkError);
            }

            if (existing) {
                return NextResponse.json({ error: 'Пряжа с таким артикулом уже существует' }, { status: 400 });
            }
            updates.article = updates.article.trim();
        }

        // Форматируем числовые поля
        if (updates.price !== undefined) updates.price = updates.price ? parseFloat(updates.price) : null;
        if (updates.weight_grams !== undefined) updates.weight_grams = updates.weight_grams ? parseInt(updates.weight_grams) : null;
        if (updates.length_meters !== undefined) updates.length_meters = updates.length_meters ? parseInt(updates.length_meters) : null;

        updates.updated_at = new Date().toISOString();

        const { data: updatedYarn, error } = await supabase
            .from('yarn_catalog')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 });
            }
            logError('Error updating yarn', error);
            return NextResponse.json({ error: 'Ошибка обновления пряжи' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(/^admin_yarn_/);
        invalidateCache(/^yarn_/);

        logInfo('Yarn updated', {
            adminId: session.user.id,
            yarnId: id,
            updatedFields: Object.keys(updates),
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Пряжа успешно обновлена',
            yarn: { ...updatedYarn, price: parseFloat(updatedYarn.price || 0) }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in admin yarn PUT', error);
        return NextResponse.json({ error: 'Ошибка обновления пряжи' }, { status: 500 });
    }
}

// DELETE - удалить пряжу
export async function DELETE(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
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
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID пряжи обязателен' }, { status: 400 });
        }

        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID пряжи' }, { status: 400 });
        }

        // Проверяем, используется ли пряжа в товарах
        const { count, error: checkError } = await supabase
            .from('product_yarn')
            .select('id', { count: 'exact', head: true })
            .eq('yarn_id', id);

        if (checkError) {
            logError('Error checking product_yarn', checkError);
            return NextResponse.json({ error: 'Ошибка проверки использования пряжи' }, { status: 500 });
        }

        if (count && count > 0) {
            return NextResponse.json({ 
                error: 'Невозможно удалить пряжу, так как она используется в товарах. Сначала удалите связи с товарами.' 
            }, { status: 400 });
        }

        // Удаляем пряжу
        const { error: deleteError } = await supabase
            .from('yarn_catalog')
            .delete()
            .eq('id', id);

        if (deleteError) {
            if (deleteError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Пряжа не найдена' }, { status: 404 });
            }
            logError('Error deleting yarn', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления пряжи' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(/^admin_yarn_/);
        invalidateCache(/^yarn_/);

        logInfo('Yarn deleted', {
            adminId: session.user.id,
            yarnId: id,
            duration: Date.now() - startTime
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