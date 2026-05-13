// app/api/admin/products/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";
import { deleteFromS3 } from "@/lib/s3-storage";

// Интерфейсы для типов
interface ProductUserProfile {
    full_name: string | null
    avatar_url: string | null
    phone: string | null
    city: string | null
}

interface ProductUser {
    email: string
    profiles: ProductUserProfile[] | null
}

interface ProductImage {
    id: string
    image_url: string
    sort_order: number
}

interface ProductWithRelations {
    id: string
    title: string
    description: string | null
    price: number
    status: string
    category: string | null
    technique: string | null
    size: string | null
    color: string | null
    main_image_url: string | null
    created_at: string
    updated_at: string
    views: number
    master_id: string
    moderation_comment: string | null
    users: ProductUser | null
    product_images: ProductImage[] | null
}

// Схема валидации для PUT запроса
const updateProductSchema = z.object({
    productId: z.string().uuid('Неверный формат ID товара'),
    action: z.enum(['approve', 'reject', 'draft']),
    reason: z.string().max(500, 'Причина не может превышать 500 символов').optional(),
});

// Схема для GET запроса с фильтрами
const productsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['moderation', 'draft', 'rejected']).optional(),
    search: z.string().max(100).optional(),
});

// Тип для обновления товара
interface ProductUpdateData {
    status: string
    updated_at: string
    moderation_comment?: string
}

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Карта статусов
const statusMap: Record<string, { text: string; color: string }> = {
    'moderation': { text: 'На модерации', color: 'yellow' },
    'draft': { text: 'Черновик', color: 'gray' },
    'rejected': { text: 'Отклонён', color: 'red' },
    'active': { text: 'Активен', color: 'green' },
    'blocked': { text: 'Заблокирован', color: 'red' }
};

function getStatusText(status: string): string {
    return statusMap[status]?.text || status;
}

function getStatusColor(status: string): string {
    return statusMap[status]?.color || 'gray';
}

function getSuccessMessage(action: string): string {
    const messages: Record<string, string> = {
        'approve': 'Товар успешно опубликован',
        'reject': 'Товар отклонён',
        'draft': 'Товар отправлен в черновики'
    };
    return messages[action] || 'Действие выполнено';
}

// GET - список товаров на модерации
export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin products access attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const validatedQuery = productsQuerySchema.parse({
            page: searchParams.get('page'),
            limit: searchParams.get('limit'),
            status: searchParams.get('status'),
            search: searchParams.get('search'),
        });

        const { page, limit, status, search } = validatedQuery;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const cacheKey = `admin_products_${page}_${limit}_${status || 'all'}_${search || 'none'}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('products')
                .select(`
                    id,
                    title,
                    description,
                    price,
                    status,
                    category,
                    technique,
                    size,
                    color,
                    main_image_url,
                    created_at,
                    updated_at,
                    views,
                    master_id,
                    moderation_comment,
                    users!inner (
                        email,
                        profiles!left (
                            full_name,
                            avatar_url,
                            phone,
                            city
                        )
                    ),
                    product_images (
                        id,
                        image_url,
                        sort_order
                    )
                `, { count: 'exact' });

            if (status) {
                query = query.eq('status', status);
            } else {
                query = query.in('status', ['moderation', 'draft', 'rejected']);
            }

            if (search) {
                const safeSearch = sanitize.text(search);
                query = query.or(`title.ilike.%${safeSearch}%,users.profiles.full_name.ilike.%${safeSearch}%`);
            }

            const { data: products, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                logError('Supabase error in admin products GET', error);
                throw new Error('DATABASE_ERROR');
            }

            const formattedProducts = (products as unknown as ProductWithRelations[] | null)?.map(product => ({
                id: product.id,
                title: sanitize.text(product.title || ''),
                price: parseFloat(product.price?.toString() || '0'),
                status: product.status,
                status_text: getStatusText(product.status),
                status_color: getStatusColor(product.status),
                created_at: product.created_at,
                master_id: product.master_id,
                master_name: sanitize.text(product.users?.profiles?.[0]?.full_name || product.users?.email || 'Неизвестно'),
                master_avatar: product.users?.profiles?.[0]?.avatar_url,
                master_city: sanitize.text(product.users?.profiles?.[0]?.city || ''),
                moderation_comment: sanitize.text(product.moderation_comment || ''),
                has_images: (product.product_images?.length || 0) > 0,
                preview_description: product.description 
                    ? product.description.substring(0, 100) + (product.description.length > 100 ? '...' : '')
                    : ''
            })) || [];

            // Статистика по статусам
            const { data: statusStats } = await supabase
                .from('products')
                .select('status')
                .in('status', ['moderation', 'draft', 'rejected', 'active']);

            const statsMap = new Map<string, number>();
            statusStats?.forEach(product => {
                statsMap.set(product.status, (statsMap.get(product.status) || 0) + 1);
            });

            const statusStatsArray = [
                { status: 'moderation', label: 'На модерации', count: statsMap.get('moderation') || 0, color: 'yellow' },
                { status: 'draft', label: 'Черновики', count: statsMap.get('draft') || 0, color: 'gray' },
                { status: 'rejected', label: 'Отклонённые', count: statsMap.get('rejected') || 0, color: 'red' },
                { status: 'active', label: 'Активные', count: statsMap.get('active') || 0, color: 'green' }
            ];

            return {
                products: formattedProducts,
                pagination: {
                    page,
                    limit,
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: to + 1 < (count || 0)
                },
                stats: {
                    total: count || 0,
                    by_status: statusStatsArray
                },
                lastUpdated: new Date().toISOString()
            };
        }, 30);

        logApiRequest('GET', '/api/admin/products', 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            success: true,
            ...result,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error fetching products', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки товаров',
            products: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            stats: { total: 0, by_status: [] }
        }, { status: 500 });
    }
}

// PUT - обновление статуса товара
export async function PUT(request: Request) {
    const startTime = Date.now();
    
    try {
        const ip = getClientIP(request);
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin product update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
            logInfo('Unauthorized admin product update attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const body = await request.json();
        
        const validatedData = updateProductSchema.parse({
            productId: body.productId,
            action: body.action,
            reason: body.reason ? sanitize.text(body.reason) : undefined
        });

        const { productId, action, reason } = validatedData;

        // Проверяем существование товара
        const { data: existingProduct, error: checkError } = await supabase
            .from('products')
            .select('id, status, title, master_id')
            .eq('id', productId)
            .single();

        if (checkError || !existingProduct) {
            logInfo('Product not found for admin action', { productId, action });
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        // Предотвращение повторных действий
        const actionMap: Record<string, { allowedStatuses: string[]; errorMessage: string }> = {
            approve: { allowedStatuses: ['moderation', 'draft'], errorMessage: 'Товар уже опубликован' },
            reject: { allowedStatuses: ['moderation'], errorMessage: 'Товар уже отклонён' },
            draft: { allowedStatuses: ['moderation'], errorMessage: 'Товар уже в черновиках' }
        };

        const actionConfig = actionMap[action];
        if (!actionConfig.allowedStatuses.includes(existingProduct.status)) {
            return NextResponse.json({ error: actionConfig.errorMessage }, { status: 400 });
        }

        const now = new Date().toISOString();
        let newStatus = '';
        let notificationTitle = '';
        let notificationMessage = '';

        switch (action) {
            case 'approve':
                newStatus = 'active';
                notificationTitle = 'Товар опубликован';
                notificationMessage = `Ваш товар "${existingProduct.title}" успешно прошёл модерацию и опубликован!`;
                break;
            case 'reject':
                newStatus = 'rejected';
                notificationTitle = 'Товар не прошёл модерацию';
                notificationMessage = `Ваш товар "${existingProduct.title}" не прошёл модерацию. Причина: ${reason || 'Не указана'}`;
                break;
            case 'draft':
                newStatus = 'draft';
                notificationTitle = 'Товар отправлен на доработку';
                notificationMessage = `Ваш товар "${existingProduct.title}" отправлен на доработку. Пожалуйста, внесите необходимые изменения.`;
                break;
            default:
                return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
        }

        // Обновляем статус товара
        const updateData: ProductUpdateData = {
            status: newStatus,
            updated_at: now
        };

        if (action === 'reject') {
            updateData.moderation_comment = reason || 'Отклонено модератором';
        }

        const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId);

        if (updateError) {
            logError('Supabase error in admin products PUT', updateError);
            return NextResponse.json({ error: 'Ошибка обработки запроса' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(/^admin_products/);
        invalidateCache(`product_${productId}`);
        invalidateCache(/^master_products_/);

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: `PRODUCT_${action.toUpperCase()}`,
                entity_type: 'product',
                entity_id: productId,
                old_values: { status: existingProduct.status },
                new_values: { status: newStatus, reason: reason || null },
                created_at: now
            });

        // Отправляем уведомление мастеру
        if (existingProduct.master_id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: existingProduct.master_id,
                    title: notificationTitle,
                    message: notificationMessage,
                    type: 'product_moderation',
                    metadata: { 
                        product_id: productId,
                        product_title: existingProduct.title, 
                        action: action,
                        reason: reason || null,
                        new_status: newStatus
                    },
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('PUT', '/api/admin/products', 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin ${action} product`, { 
            productId, 
            adminId: session.user.id,
            productTitle: existingProduct.title,
            oldStatus: existingProduct.status,
            newStatus,
            hasReason: !!reason
        });

        return NextResponse.json({ 
            success: true,
            message: getSuccessMessage(action),
            product: {
                id: productId,
                status: newStatus,
                status_text: getStatusText(newStatus),
                status_color: getStatusColor(newStatus)
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error in admin products PUT', error);
        return NextResponse.json({ error: 'Ошибка обработки запроса' }, { status: 500 });
    }
}