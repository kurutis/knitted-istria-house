// app/api/master/classes/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage";

interface RegistrationUser {
    id: string;
    email: string;
    profiles?: Array<{
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
    }>;
}

interface Registration {
    id: string;
    user_id: string;
    payment_status: string;
    created_at: string;
    users?: RegistrationUser;
}

interface MasterClassUpdateData {
    updated_at: string;
    title?: string;
    description?: string;
    type?: string;
    price?: number;
    max_participants?: number;
    date_time?: string;
    duration_minutes?: number;
    location?: string | null;
    online_link?: string | null;
    materials?: string | null;
    status?: string;
}

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });
const deleteLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

// Валидация
function validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || typeof title !== 'string') {
        return { valid: false, error: 'Название обязательно' };
    }
    const trimmed = title.trim();
    if (trimmed.length < 3) {
        return { valid: false, error: 'Название должно содержать минимум 3 символа' };
    }
    if (trimmed.length > 200) {
        return { valid: false, error: 'Название не может превышать 200 символов' };
    }
    return { valid: true };
}

function validateDescription(description: string): { valid: boolean; error?: string } {
    if (!description || typeof description !== 'string') {
        return { valid: false, error: 'Описание обязательно' };
    }
    const trimmed = description.trim();
    if (trimmed.length < 10) {
        return { valid: false, error: 'Описание должно содержать минимум 10 символов' };
    }
    if (trimmed.length > 5000) {
        return { valid: false, error: 'Описание не может превышать 5000 символов' };
    }
    return { valid: true };
}

function validateDateTime(dateTime: string): { valid: boolean; error?: string } {
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) {
        return { valid: false, error: 'Неверный формат даты и времени' };
    }
    if (date < new Date()) {
        return { valid: false, error: 'Дата не может быть в прошлом' };
    }
    return { valid: true };
}

function validatePrice(price: number): { valid: boolean; error?: string } {
    if (isNaN(price) || price < 0) {
        return { valid: false, error: 'Цена не может быть отрицательной' };
    }
    if (price > 1000000) {
        return { valid: false, error: 'Цена не может превышать 1 000 000 ₽' };
    }
    return { valid: true };
}

function validateParticipants(max: number): { valid: boolean; error?: string } {
    if (isNaN(max) || max < 1) {
        return { valid: false, error: 'Максимум участников должен быть не менее 1' };
    }
    if (max > 1000) {
        return { valid: false, error: 'Максимум участников не может превышать 1000' };
    }
    return { valid: true };
}

// GET - получить все мастер-классы мастера
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
                classes: []
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        const cacheKey = `master_classes_${session.user.id}_${status || 'all'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('master_classes')
                .select(`
                    *,
                    master_class_registrations!left (
                        id,
                        user_id,
                        payment_status,
                        created_at,
                        users!inner (
                            id,
                            email,
                            profiles!left (
                                full_name,
                                phone,
                                avatar_url
                            )
                        )
                    )
                `, { count: 'exact' })
                .eq('master_id', session.user.id);

            if (status && ['published', 'draft', 'cancelled', 'completed'].includes(status)) {
                query = query.eq('status', status);
            }

            const { data: classes, error, count } = await query
                .order('date_time', { ascending: true })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching master classes', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!classes) {
                return { classes: [], pagination: { total: 0, page, limit, totalPages: 0 } };
            }

            const formattedClasses = classes.map(mc => ({
                id: mc.id,
                master_id: mc.master_id,
                title: mc.title,
                description: mc.description,
                type: mc.type,
                status: mc.status,
                price: parseFloat(mc.price),
                max_participants: mc.max_participants,
                current_participants: mc.current_participants || 0,
                date_time: mc.date_time,
                duration_minutes: mc.duration_minutes,
                location: mc.location,
                online_link: mc.online_link,
                materials: mc.materials,
                image_url: mc.image_url,
                created_at: mc.created_at,
                updated_at: mc.updated_at,
                registrations_count: mc.master_class_registrations?.length || 0,
                spots_left: (mc.max_participants || 0) - (mc.current_participants || 0),
                registrations: mc.master_class_registrations?.map((reg: Registration) => ({
                    id: reg.id,
                    user_id: reg.user_id,
                    user_name: reg.users?.profiles?.[0]?.full_name || reg.users?.email,
                    user_email: reg.users?.email,
                    user_phone: reg.users?.profiles?.[0]?.phone,
                    user_avatar: reg.users?.profiles?.[0]?.avatar_url,
                    payment_status: reg.payment_status,
                    created_at: reg.created_at
                })) || []
            }));

            return {
                classes: formattedClasses,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            };
        });

        return NextResponse.json({
            success: true,
            ...result,
            meta: { cached: Date.now() - startTime < 100 }
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in master classes GET', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки мастер-классов',
            classes: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
        }, { status: 500 });
    }
}

// POST - создать новый мастер-класс
export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user || session.user.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const formData = await request.formData();
        
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const type = formData.get('type') as string;
        const price = parseFloat(formData.get('price') as string) || 0;
        const max_participants = parseInt(formData.get('max_participants') as string) || 10;
        const date_time = formData.get('date_time') as string;
        const duration_minutes = parseInt(formData.get('duration_minutes') as string) || 60;
        const location = formData.get('location') as string;
        const online_link = formData.get('online_link') as string;
        const materials = formData.get('materials') as string;
        const imageFile = formData.get('image') as File | null;

        // Валидация
        const titleValidation = validateTitle(title);
        if (!titleValidation.valid) {
            return NextResponse.json({ error: titleValidation.error }, { status: 400 });
        }

        const descValidation = validateDescription(description);
        if (!descValidation.valid) {
            return NextResponse.json({ error: descValidation.error }, { status: 400 });
        }

        const dateValidation = validateDateTime(date_time);
        if (!dateValidation.valid) {
            return NextResponse.json({ error: dateValidation.error }, { status: 400 });
        }

        const priceValidation = validatePrice(price);
        if (!priceValidation.valid) {
            return NextResponse.json({ error: priceValidation.error }, { status: 400 });
        }

        const participantsValidation = validateParticipants(max_participants);
        if (!participantsValidation.valid) {
            return NextResponse.json({ error: participantsValidation.error }, { status: 400 });
        }

        // Валидация типа
        const validTypes = ['online', 'offline', 'hybrid'];
        if (type && !validTypes.includes(type)) {
            return NextResponse.json({ error: 'Неверный тип мастер-класса' }, { status: 400 });
        }

        // Проверка: онлайн класс должен иметь ссылку
        if (type === 'online' && !online_link) {
            return NextResponse.json({ error: 'Для онлайн мастер-класса требуется ссылка' }, { status: 400 });
        }

        // Проверка: оффлайн класс должен иметь локацию
        if (type === 'offline' && !location) {
            return NextResponse.json({ error: 'Для оффлайн мастер-класса требуется адрес' }, { status: 400 });
        }

        // Валидация изображения
        if (imageFile && imageFile.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Изображение не может превышать 10MB' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Создаем мастер-класс
        const { data: newClass, error: insertError } = await supabase
            .from('master_classes')
            .insert({
                master_id: session.user.id,
                title: title.trim(),
                description: description.trim(),
                type: type || 'offline',
                status: 'published',
                price,
                max_participants,
                current_participants: 0,
                date_time,
                duration_minutes,
                location: location || null,
                online_link: online_link || null,
                materials: materials || null,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (insertError) {
            logError('Error creating master class', insertError);
            return NextResponse.json({ error: 'Ошибка создания мастер-класса' }, { status: 500 });
        }

        // Загружаем изображение с правильными правами доступа
        let imageUrl = null;
        if (imageFile && imageFile.size > 0) {
            try {
                // Функция uploadToS3 должна иметь ACL: 'public-read'
                imageUrl = await uploadToS3(imageFile, 'classes', newClass.id, {
                    contentType: imageFile.type
                });
                
                if (imageUrl) {
                    const { error: updateError } = await supabase
                        .from('master_classes')
                        .update({ image_url: imageUrl })
                        .eq('id', newClass.id);
                    
                    if (updateError) {
                        logError('Error updating class with image URL', updateError);
                    }
                } else {
                    logError('Failed to upload image to S3', new Error('Upload returned null'));
                }
            } catch (uploadError) {
                logError('Error uploading class image', uploadError, 'warning');
            }
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`master_classes_${session.user.id}`));
        invalidateCache('public_classes');

        logInfo('Master class created', {
            classId: newClass.id,
            masterId: session.user.id,
            title: title.trim(),
            type,
            price,
            max_participants,
            hasImage: !!imageUrl,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            id: newClass.id,
            image_url: imageUrl,
            message: 'Мастер-класс успешно создан'
        }, { status: 201 });
        
    } catch (error) {
        logError('Error creating master class', error);
        return NextResponse.json({ error: 'Ошибка создания мастер-класса' }, { status: 500 });
    }
}

// PUT - обновить мастер-класс
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user || session.user.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const formData = await request.formData();
        const classId = formData.get('id') as string;

        if (!classId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(classId)) {
            return NextResponse.json({ error: 'Неверный формат ID' }, { status: 400 });
        }

        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const type = formData.get('type') as string;
        const price = parseFloat(formData.get('price') as string) || 0;
        const max_participants = parseInt(formData.get('max_participants') as string) || 10;
        const date_time = formData.get('date_time') as string;
        const duration_minutes = parseInt(formData.get('duration_minutes') as string) || 60;
        const location = formData.get('location') as string;
        const online_link = formData.get('online_link') as string;
        const materials = formData.get('materials') as string;
        const imageFile = formData.get('image') as File | null;
        const status = formData.get('status') as string;

        // Проверяем принадлежность
        const { data: existing, error: checkError } = await supabase
            .from('master_classes')
            .select('master_id, image_url, current_participants, max_participants')
            .eq('id', classId)
            .single();

        if (checkError || existing?.master_id !== session.user.id) {
            return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
        }

        // Проверка: нельзя уменьшить max_participants меньше текущих участников
        if (max_participants < (existing?.current_participants || 0)) {
            return NextResponse.json({ 
                error: `Нельзя уменьшить лимит участников ниже текущего количества (${existing?.current_participants})` 
            }, { status: 400 });
        }

        // Обновляем данные
        const updateData: MasterClassUpdateData = {
            updated_at: new Date().toISOString()
        };

        if (title) {
            const titleValidation = validateTitle(title);
            if (!titleValidation.valid) {
                return NextResponse.json({ error: titleValidation.error }, { status: 400 });
            }
            updateData.title = title.trim();
        }

        if (description) {
            const descValidation = validateDescription(description);
            if (!descValidation.valid) {
                return NextResponse.json({ error: descValidation.error }, { status: 400 });
            }
            updateData.description = description.trim();
        }

        if (type) {
            const validTypes = ['online', 'offline', 'hybrid'];
            if (!validTypes.includes(type)) {
                return NextResponse.json({ error: 'Неверный тип' }, { status: 400 });
            }
            updateData.type = type;
        }

        if (price !== undefined) updateData.price = price;
        if (max_participants !== undefined) updateData.max_participants = max_participants;
        if (date_time) {
            const dateValidation = validateDateTime(date_time);
            if (!dateValidation.valid) {
                return NextResponse.json({ error: dateValidation.error }, { status: 400 });
            }
            updateData.date_time = date_time;
        }
        if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
        if (location !== undefined) updateData.location = location || null;
        if (online_link !== undefined) updateData.online_link = online_link || null;
        if (materials !== undefined) updateData.materials = materials || null;
        if (status && ['published', 'cancelled', 'completed'].includes(status)) {
            updateData.status = status;
        }

        const { error: updateError } = await supabase
            .from('master_classes')
            .update(updateData)
            .eq('id', classId);

        if (updateError) {
            logError('Error updating master class', updateError);
            return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
        }

        // Обновляем изображение
        if (imageFile && imageFile.size > 0) {
            if (existing?.image_url) {
                await deleteFromS3(existing.image_url);
            }
            
            const imageUrl = await uploadToS3(imageFile, 'classes', classId, {
                contentType: imageFile.type
            });
            
            if (imageUrl) {
                await supabase
                    .from('master_classes')
                    .update({ image_url: imageUrl })
                    .eq('id', classId);
            }
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`master_classes_${session.user.id}`));
        invalidateCache(`master_class_${classId}`);
        invalidateCache('public_classes');

        logInfo('Master class updated', { classId, masterId: session.user.id });

        return NextResponse.json({ success: true, message: 'Мастер-класс обновлен' }, { status: 200 });
        
    } catch (error) {
        logError('Error updating master class', error);
        return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
    }
}

// DELETE - удалить мастер-класс
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user || session.user.role !== 'master') {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('id');

        if (!classId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(classId)) {
            return NextResponse.json({ error: 'Неверный формат ID' }, { status: 400 });
        }

        // Проверяем принадлежность
        const { data: existing, error: checkError } = await supabase
            .from('master_classes')
            .select('master_id, image_url, current_participants')
            .eq('id', classId)
            .single();

        if (checkError || existing?.master_id !== session.user.id) {
            return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
        }

        // Проверка: нельзя удалить класс с участниками
        if ((existing?.current_participants || 0) > 0) {
            return NextResponse.json({ 
                error: 'Нельзя удалить мастер-класс, на который записались участники. Сначала отмените его.' 
            }, { status: 400 });
        }

        // Удаляем изображение
        if (existing?.image_url) {
            await deleteFromS3(existing.image_url);
        }

        // Удаляем мастер-класс
        const { error: deleteError } = await supabase
            .from('master_classes')
            .delete()
            .eq('id', classId);

        if (deleteError) {
            logError('Error deleting master class', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`master_classes_${session.user.id}`));
        invalidateCache(`master_class_${classId}`);
        invalidateCache('public_classes');

        logInfo('Master class deleted', { classId, masterId: session.user.id });

        return NextResponse.json({ success: true, message: 'Мастер-класс удален' }, { status: 200 });
        
    } catch (error) {
        logError('Error deleting master class', error);
        return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
    }
}