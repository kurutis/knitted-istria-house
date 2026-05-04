// app/api/master/products/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface ProductValidationData {
    title?: string;
    price?: number | string; 
    category?: string;
    description?: string;
    care_instructions?: string;
}
interface ProductImage {
    id: string;
    image_url: string;
    sort_order: number;
}

interface ProductYarnCatalog {
    id: string;
    name: string;
    article: string;
    brand: string;
    color: string;
    price: number;
}

interface ProductYarn {
    yarn_id: string;
    is_custom: boolean;
    yarn_catalog: ProductYarnCatalog | null;
}

interface ProductWithRelations {
    id: string;
    master_id: string;
    title: string;
    description: string | null;
    price: number;
    status: string;
    category: string;
    technique: string | null;
    size: string | null;
    color: string | null;
    care_instructions: string | null;
    main_image_url: string | null;
    views: number;
    created_at: string;
    updated_at: string;
    product_images?: ProductImage[];
    product_yarn?: ProductYarn[];
}

// Rate limiting
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 созданий в минуту
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

// Валидация данных
function validateProductData(data: ProductValidationData): { valid: boolean; error?: string } {
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

    if (data.price === undefined || data.price === null) {
        return { valid: false, error: 'Цена обязательна' };
    }
    
    const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
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

    if (data.care_instructions && data.care_instructions.length > 1000) {
        return { valid: false, error: 'Инструкция по уходу не может превышать 1000 символов' };
    }

    return { valid: true };
}

// POST - создать новый товар
export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }
        
        if (session.user.role !== 'master') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Проверяем, не забанен ли мастер
        const { data: master, error: masterError } = await supabase
            .from('masters')
            .select('is_banned, can_sell, moderation_status')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (masterError) {
            logError('Error checking master status', masterError);
        }

        if (master?.is_banned) {
            return NextResponse.json({ error: 'Ваш аккаунт заблокирован. Вы не можете добавлять товары.' }, { status: 403 });
        }

        if (master?.can_sell === false) {
            return NextResponse.json({ error: 'Вам временно запрещено добавлять товары.' }, { status: 403 });
        }

        const formData = await request.formData();
        
        const title = formData.get('title') as string;
        const price = parseFloat(formData.get('price') as string);
        const category = formData.get('category') as string;
        const images = formData.getAll('images') as File[];
        const description = formData.get('description') as string;
        const technique = formData.get('technique') as string;
        const size = formData.get('size') as string;
        const color = formData.get('color') as string;
        const care_instructions = formData.get('care_instructions') as string;

        // Валидация
        const validation = validateProductData({
            title,
            price,
            category,
            description,
            care_instructions
        });
        
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        if (images.length === 0) {
            return NextResponse.json({ error: 'Добавьте хотя бы одно изображение' }, { status: 400 });
        }

        if (images.length > 20) {
            return NextResponse.json({ error: 'Максимум 20 изображений на товар' }, { status: 400 });
        }

        // Проверяем размер и тип изображений
        for (const image of images) {
            if (image.size > 10 * 1024 * 1024) {
                return NextResponse.json({ error: `Изображение ${image.name} превышает 10MB` }, { status: 400 });
            }
            if (!image.type.startsWith('image/')) {
                return NextResponse.json({ error: `Файл ${image.name} не является изображением` }, { status: 400 });
            }
        }

        // Проверяем, нет ли товара с таким названием у мастера
        const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('title', title.trim())
            .eq('master_id', session.user.id)
            .maybeSingle();

        if (existingProduct) {
            return NextResponse.json({ error: 'Товар с таким названием уже существует' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Создаем товар
        const { data: product, error: productError } = await supabase
            .from('products')
            .insert({
                master_id: session.user.id,
                title: title.trim(),
                description: description?.trim() || null,
                price,
                status: 'moderation',
                category,
                technique: technique?.trim() || null,
                size: size?.trim() || null,
                care_instructions: care_instructions?.trim() || null,
                color: color?.trim() || null,
                views: 0,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (productError) {
            logError('Error creating product', productError);
            return NextResponse.json({ error: 'Ошибка создания товара: ' + productError.message }, { status: 500 });
        }

        const productId = product.id;
        const uploadedImageUrls: string[] = [];

        // Загружаем изображения параллельно
        const uploadPromises = images.map(async (image, index) => {
            try {
                const extension = image.name.split('.').pop();
                const fileName = `${productId}/${Date.now()}-${index}.${extension}`;
                const imageUrl = await uploadToS3(image, 'products', fileName);
                
                if (imageUrl) {
                    await supabase
                        .from('product_images')
                        .insert({ 
                            product_id: productId, 
                            image_url: imageUrl, 
                            sort_order: index 
                        });
                    return imageUrl;
                }
                return null;
            } catch (err) {
                logError(`Error uploading image ${index}`, err, 'warning');
                return null;
            }
        });

        const uploadResults = await Promise.all(uploadPromises);
        const validUploads = uploadResults.filter(url => url !== null);
        uploadedImageUrls.push(...(validUploads as string[]));

        // Устанавливаем главное изображение
        if (uploadedImageUrls.length > 0) {
            await supabase
                .from('products')
                .update({ main_image_url: uploadedImageUrls[0] })
                .eq('id', productId);
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`master_products_${session.user.id}`));
        invalidateCache('products_list');

        logInfo('Product created successfully', {
            productId,
            masterId: session.user.id,
            title: title.trim(),
            price,
            category,
            imagesCount: uploadedImageUrls.length,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Товар успешно создан и отправлен на модерацию',
            productId,
            imagesCount: uploadedImageUrls.length
        }, { status: 201 });
        
    } catch (error) {
        logError('Error in POST /api/master/products', error);
        const errorMessage = error instanceof Error ? error.message : 'Ошибка создания товара';
        return NextResponse.json({ 
            error: errorMessage 
        }, { status: 500 });
    }
}

// GET - получить все товары мастера
export async function GET(request: Request) {
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
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов',
                products: []
            }, { status: 429 });
        }

        // Параметры пагинации и фильтрации
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Кэширование
        const cacheKey = `master_products_${session.user.id}_${status || 'all'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('products')
                .select(`
                    *,
                    product_images (
                        id,
                        image_url,
                        sort_order
                    ),
                    product_yarn (
                        yarn_id,
                        is_custom,
                        yarn_catalog!left (
                            id,
                            name,
                            article,
                            brand,
                            color,
                            price
                        )
                    )
                `, { count: 'exact' })
                .eq('master_id', session.user.id);

            // Фильтр по статусу
            const validStatuses = ['moderation', 'active', 'rejected', 'hidden', 'archived'];
            if (status && validStatuses.includes(status)) {
                query = query.eq('status', status);
            }

            const { data: products, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching master products', error);
                throw new Error('DATABASE_ERROR');
            }

            const productsArray = products || [];
            
            const formattedProducts = (products as ProductWithRelations[]).map(product => ({
                id: product.id,
                master_id: product.master_id,
                title: product.title,
                description: product.description,
                price: parseFloat(product.price as unknown as string),
                status: product.status,
                category: product.category,
                technique: product.technique,
                size: product.size,
                color: product.color,
                care_instructions: product.care_instructions,
                main_image_url: product.main_image_url,
                views: product.views || 0,
                created_at: product.created_at,
                updated_at: product.updated_at,
                images: product.product_images?.sort((a: ProductImage, b: ProductImage) => a.sort_order - b.sort_order) || [],
                yarns: product.product_yarn?.map((py: ProductYarn) => py.yarn_catalog).filter(Boolean) || []
            }));

            return {
                products: formattedProducts,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                }
            };
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
        logError('Error in GET /api/master/products', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки товаров',
            products: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
        }, { status: 200 });
    }
}