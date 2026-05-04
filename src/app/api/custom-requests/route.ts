import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

interface OrderUpdateData {
    status: string;
    updated_at: string;
    tracking_number?: string;
    admin_notes?: string;
    response?: string;
    completed_at?: string;
}

// Схемы валидации
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
}

function validateBudget(budget: number | null): { valid: boolean; error?: string } {
    if (budget === null) return { valid: true };
    if (isNaN(budget) || budget < 100) {
        return { valid: false, error: 'Бюджет должен быть не менее 100 ₽' };
    }
    if (budget > 1000000) {
        return { valid: false, error: 'Бюджет не может превышать 1 000 000 ₽' };
    }
    return { valid: true };
}

// Rate limiting
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 60 * 1000 }); // 10 запросов в час
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту
const putLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 запросов в минуту

// POST - создать запрос на индивидуальный заказ
export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через час.' 
            }, { status: 429 });
        }

        const body = await request.json();
        const { masterId, name, email, description, budget } = body;

        // Валидация обязательных полей
        if (!masterId || !isValidUUID(masterId)) {
            return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        }

        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return NextResponse.json({ error: 'Имя должно содержать минимум 2 символа' }, { status: 400 });
        }

        if (name.length > 100) {
            return NextResponse.json({ error: 'Имя не может превышать 100 символов' }, { status: 400 });
        }

        if (!email || !validateEmail(email)) {
            return NextResponse.json({ error: 'Неверный формат email' }, { status: 400 });
        }

        if (!description || typeof description !== 'string' || description.trim().length < 10) {
            return NextResponse.json({ error: 'Описание должно содержать минимум 10 символов' }, { status: 400 });
        }

        if (description.length > 5000) {
            return NextResponse.json({ error: 'Описание не может превышать 5000 символов' }, { status: 400 });
        }

        const budgetValidation = validateBudget(budget);
        if (!budgetValidation.valid) {
            return NextResponse.json({ error: budgetValidation.error }, { status: 400 });
        }

        // Проверяем, не отправлял ли пользователь уже запрос этому мастеру
        const { data: existingRequest, error: checkError } = await supabase
            .from('custom_requests')
            .select('id, status, created_at')
            .eq('master_id', masterId)
            .eq('user_id', session.user.id)
            .in('status', ['pending', 'accepted', 'in_progress'])
            .maybeSingle();

        if (checkError) {
            logError('Error checking existing request', checkError);
        }

        if (existingRequest) {
            return NextResponse.json({ 
                error: 'У вас уже есть активный запрос этому мастеру',
                request_id: existingRequest.id,
                status: existingRequest.status
            }, { status: 400 });
        }

        // Проверяем, существует ли мастер и принимает ли заказы
        const { data: master, error: masterError } = await supabase
            .from('masters')
            .select('user_id, custom_orders_enabled, is_verified, rating')
            .eq('user_id', masterId)
            .maybeSingle();

        if (masterError) {
            logError('Error checking master', masterError);
            return NextResponse.json({ error: 'Ошибка проверки мастера' }, { status: 500 });
        }

        if (!master) {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }

        if (master.custom_orders_enabled === false) {
            return NextResponse.json({ error: 'Мастер не принимает индивидуальные заказы' }, { status: 400 });
        }

        // Создаем запрос
        const now = new Date().toISOString();
        const { data: customRequest, error: insertError } = await supabase
            .from('custom_requests')
            .insert({
                master_id: masterId,
                user_id: session.user.id,
                buyer_name: name.trim(),
                buyer_email: email.toLowerCase().trim(),
                description: description.trim(),
                budget: budget || null,
                status: 'pending',
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (insertError) {
            logError('Error creating custom request', insertError);
            return NextResponse.json({ error: 'Ошибка отправки запроса' }, { status: 500 });
        }

        // Создаем уведомление для мастера
        const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
                user_id: masterId,
                title: 'Новый индивидуальный заказ',
                message: `Пользователь ${name.trim()} отправил запрос на индивидуальный заказ${budget ? ` с бюджетом ${budget} ₽` : ''}`,
                type: 'custom_request',
                metadata: { request_id: customRequest.id, budget },
                created_at: now,
                is_read: false
            });

        if (notificationError) {
            logError('Error creating notification', notificationError, 'warning');
        }

        // Инвалидируем кэш
        invalidateCache(`user_requests_${session.user.id}`);
        invalidateCache(`master_requests_${masterId}`);

        logInfo('Custom request created', {
            requestId: customRequest.id,
            masterId,
            userId: session.user.id,
            hasBudget: !!budget,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Запрос успешно отправлен мастеру',
            requestId: customRequest.id,
            status: customRequest.status
        }, { status: 201 });
        
    } catch (error) {
        logError('Error creating custom request', error);
        return NextResponse.json({ error: 'Ошибка отправки запроса' }, { status: 500 });
    }
}

// GET - получить запросы
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов',
                requests: []
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const masterId = searchParams.get('masterId');
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Кэшируем запросы
        const cacheKey = `requests_${session.user.id}_${masterId || 'user'}_${status || 'all'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('custom_requests')
                .select(`
                    *,
                    users!user_id (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    ),
                    masters!master_id (
                        user_id,
                        users!inner (
                            id,
                            email,
                            profiles!left (
                                full_name,
                                avatar_url
                            )
                        )
                    )
                `, { count: 'exact' });

            // Фильтрация по роли
            if (masterId) {
                if (masterId !== session.user.id) {
                    throw new Error('FORBIDDEN');
                }
                query = query.eq('master_id', masterId);
            } else {
                query = query.eq('user_id', session.user.id);
            }

            if (status && ['pending', 'accepted', 'rejected', 'completed', 'in_progress'].includes(status)) {
                query = query.eq('status', status);
            }

            const { data: requests, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching custom requests', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!requests) {
                return { requests: [], pagination: { total: 0, page, limit, totalPages: 0 } };
            }

            // Форматируем данные
            const formattedRequests = requests.map(req => ({
                id: req.id,
                master_id: req.master_id,
                user_id: req.user_id,
                buyer_name: req.buyer_name,
                buyer_email: req.buyer_email,
                description: req.description,
                budget: req.budget ? parseFloat(req.budget) : null,
                status: req.status,
                response: req.response,
                created_at: req.created_at,
                updated_at: req.updated_at,
                master_name: req.masters?.users?.profiles?.full_name || req.masters?.users?.email,
                master_avatar: req.masters?.users?.profiles?.avatar_url,
                user_name: req.users?.profiles?.full_name || req.users?.email,
                user_avatar: req.users?.profiles?.avatar_url
            }));

            return {
                requests: formattedRequests,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };
        });

        return NextResponse.json(result, { status: 200 });
        
    } catch (error) {
        if (error instanceof Error && error.message === 'FORBIDDEN') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }
        logError('Error fetching custom requests', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки запросов',
            requests: [],
            pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }
        }, { status: 500 });
    }
}

// PUT - обновить статус запроса
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const body = await request.json();
        const { requestId, status, response } = body;

        if (!requestId || !isValidUUID(requestId)) {
            return NextResponse.json({ error: 'Неверный формат ID запроса' }, { status: 400 });
        }

        const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'in_progress', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
        }

        if (response !== undefined && (typeof response !== 'string' || response.length > 2000)) {
            return NextResponse.json({ error: 'Ответ не может превышать 2000 символов' }, { status: 400 });
        }

        // Проверяем запрос и права
        const { data: customRequest, error: checkError } = await supabase
            .from('custom_requests')
            .select('master_id, user_id, buyer_name, status')
            .eq('id', requestId)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Запрос не найден' }, { status: 404 });
            }
            logError('Error checking custom request', checkError);
            return NextResponse.json({ error: 'Ошибка проверки запроса' }, { status: 500 });
        }

        // Проверяем права (только мастер может менять статус)
        if (customRequest.master_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Проверяем, можно ли изменить статус
        const currentStatus = customRequest.status;
        if (currentStatus === 'completed' || currentStatus === 'rejected') {
            return NextResponse.json({ error: `Нельзя изменить статус "${currentStatus}"` }, { status: 400 });
        }

        // Обновляем статус
        const now = new Date().toISOString();
        const updateData: OrderUpdateData = {
            status,
            updated_at: now
        };

        if (response) {
            updateData.response = response.trim();
        }

        if (status === 'completed') {
            updateData.completed_at = now;
        }

        const { error: updateError } = await supabase
            .from('custom_requests')
            .update(updateData)
            .eq('id', requestId);

        if (updateError) {
            logError('Error updating custom request', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
        }

        // Создаем уведомление для покупателя
        const statusMessages: Record<string, string> = {
            'accepted': 'принял ваш запрос. Ожидайте дальнейших сообщений.',
            'rejected': 'отклонил ваш запрос.',
            'completed': 'отметил заказ как выполненный.',
            'in_progress': 'начал работу над вашим заказом.',
            'cancelled': 'отменил заказ.'
        };

        const message = statusMessages[status] || `обновил статус заказа на "${status}"`;

        await supabase
            .from('notifications')
            .insert({
                user_id: customRequest.user_id,
                title: 'Статус индивидуального заказа обновлен',
                message: `Мастер ${message}`,
                type: 'custom_request',
                metadata: { request_id: requestId, status, response },
                created_at: now,
                is_read: false
            });

        // Инвалидируем кэш
        invalidateCache(new RegExp(`requests_${customRequest.user_id}`));
        invalidateCache(new RegExp(`requests_${customRequest.master_id}`));
        invalidateCache(`user_requests_${customRequest.user_id}`);
        invalidateCache(`master_requests_${customRequest.master_id}`);

        logInfo('Custom request status updated', {
            requestId,
            masterId: session.user.id,
            oldStatus: currentStatus,
            newStatus: status,
            hasResponse: !!response
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Статус успешно обновлен',
            status
        }, { status: 200 });
        
    } catch (error) {
        logError('Error updating custom request', error);
        return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
    }
}