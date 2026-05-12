// app/api/master-classes/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";
import { getPublicUrl } from "@/lib/s3-storage";

interface MasterProfile {
    full_name: string | null;
    avatar_url: string | null;
    city: string | null;
    phone: string | null;
    address?: string | null;
}

interface MasterUser {
    id: string;
    email: string;
    profiles?: MasterProfile[];
}

interface MasterClassRegistration {
    user_id: string;
    payment_status?: string;
}

interface MasterClassDetailRegistration {
    user_id: string;
    payment_status?: string;
}

// Rate limiting
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

// Функция для получения полного URL изображения из Selectel
function getFullImageUrl(imagePath: string | null): string | null {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    
    // Используем функцию из s3-storage для получения публичного URL
    const publicUrl = getPublicUrl(imagePath);
    if (publicUrl) return publicUrl;
    
    // Fallback на прямой URL Selectel
    const selectelUrl = process.env.S3_PUBLIC_URL || 'https://30bd5b8c-136d-48e3-b7c1-71a168d4fef4.selstorage.ru';
    const cleanPath = imagePath.replace(/^\/+/, '');
    return `${selectelUrl}/${cleanPath}`;
}

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                master_classes: [],
                pagination: {}
            }, { status: 429 });
        }

        // Параметры пагинации и фильтрации
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const masterId = searchParams.get('masterId');
        const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;
        const includePast = searchParams.get('includePast') === 'true';

        // Кэшируем результат
        const cacheKey = `master_classes_${type || 'all'}_${masterId || 'all'}_${page}_${limit}_${includePast}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            let query = supabase
                .from('master_classes')
                .select(`
                    *,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url,
                            city,
                            phone
                        )
                    ),
                    master_class_registrations!left (
                        user_id
                    )
                `, { count: 'exact' })
                .eq('status', 'published');

            // Фильтр по дате
            if (!includePast) {
                query = query.gt('date_time', new Date().toISOString());
            }

            // Фильтр по типу
            if (type && ['online', 'offline', 'hybrid'].includes(type)) {
                query = query.eq('type', type);
            }

            // Фильтр по мастеру
            if (masterId) {
                query = query.eq('master_id', masterId);
            }

            // Сортировка
            query = query.order('date_time', { ascending: !includePast });

            const { data: masterClasses, error, count } = await query
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching master classes', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!masterClasses || masterClasses.length === 0) {
                return {
                    master_classes: [],
                    pagination: { total: 0, page, limit, totalPages: 0 },
                    filters: { types: [], masters: [] }
                };
            }

            // Получаем список доступных типов и мастеров для фильтров
            const { data: allPublished } = await supabase
                .from('master_classes')
                .select('type, master_id')
                .eq('status', 'published')
                .gt('date_time', new Date().toISOString());

            const uniqueTypes = [...new Set(allPublished?.map(mc => mc.type).filter(Boolean))];
            const uniqueMasters = [...new Set(allPublished?.map(mc => mc.master_id).filter(Boolean))];

            // Получаем информацию о мастерах для фильтров
            let mastersInfo: { id: string; name: string }[] = [];
            if (uniqueMasters.length > 0) {
                const { data: masters } = await supabase
                    .from('users')
                    .select('id, email, profiles!left (full_name)')
                    .in('id', uniqueMasters);
                
                mastersInfo = masters?.map(m => ({
                    id: m.id,
                    name: m.profiles?.[0]?.full_name || m.email
                })) || [];
            }

            // Форматируем данные
            const now = new Date();
            const formattedClasses = masterClasses.map(mc => {
                const classDate = new Date(mc.date_time);
                const isUpcoming = classDate > now;
                const spotsLeft = (mc.max_participants || 0) - (mc.current_participants || 0);
                const isRegistered = userId ? mc.master_class_registrations?.some(
                    (reg: MasterClassRegistration) => reg.user_id === userId
                ) || false : false;

                return {
                    id: mc.id,
                    title: mc.title,
                    description: mc.description,
                    type: mc.type,
                    status: mc.status,
                    price: parseFloat(mc.price || 0),
                    max_participants: mc.max_participants,
                    current_participants: mc.current_participants || 0,
                    spots_left: spotsLeft,
                    is_full: spotsLeft <= 0,
                    date_time: mc.date_time,
                    duration_minutes: mc.duration_minutes,
                    location: mc.location,
                    online_link: mc.online_link,
                    materials: mc.materials,
                    image_url: getFullImageUrl(mc.image_url), // ← ИСПРАВЛЕНО!
                    created_at: mc.created_at,
                    updated_at: mc.updated_at,
                    master_id: mc.master_id,
                    master_name: mc.users?.profiles?.[0]?.full_name || mc.users?.email,
                    master_avatar: mc.users?.profiles?.[0]?.avatar_url,
                    master_city: mc.users?.profiles?.[0]?.city,
                    is_upcoming: isUpcoming,
                    is_registered: isRegistered,
                    can_register: isUpcoming && !isRegistered && spotsLeft > 0
                };
            });

            return {
                master_classes: formattedClasses,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                filters: {
                    types: uniqueTypes,
                    masters: mastersInfo
                }
            };
        });

        logInfo('Master classes fetched', {
            userId,
            count: result.master_classes.length,
            total: result.pagination.total,
            filters: { types: result.filters.types.length, masters: result.filters.masters.length },
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
        logError('Error fetching master classes', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки мастер-классов',
            master_classes: [],
            pagination: { total: 0, page: 1, limit: 12, totalPages: 0 },
            filters: { types: [], masters: [] }
        }, { status: 500 });
    }
}

// GET /api/master-classes/[id] - получить детали конкретного мастер-класса
export async function GET_BY_ID(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        
        const { id } = await params;
        
        if (!id) {
            return NextResponse.json({ error: 'ID мастер-класса обязателен' }, { status: 400 });
        }

        const cacheKey = `master_class_detail_${id}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            const { data: masterClass, error } = await supabase
                .from('master_classes')
                .select(`
                    *,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url,
                            city,
                            phone,
                            address
                        )
                    ),
                    master_class_registrations!left (
                        user_id,
                        payment_status
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('NOT_FOUND');
                }
                logError('Error fetching master class detail', error);
                throw new Error('DATABASE_ERROR');
            }

            const spotsLeft = (masterClass.max_participants || 0) - (masterClass.current_participants || 0);
            const isRegistered = userId ? masterClass.master_class_registrations?.some(
                (reg: MasterClassDetailRegistration) => reg.user_id === userId
            ) || false : false;

            
            const paymentStatus = userId ? masterClass.master_class_registrations?.find(
                (reg: MasterClassDetailRegistration) => reg.user_id === userId
            )?.payment_status : null;

            return {
                id: masterClass.id,
                title: masterClass.title,
                description: masterClass.description,
                type: masterClass.type,
                status: masterClass.status,
                price: parseFloat(masterClass.price || 0),
                max_participants: masterClass.max_participants,
                current_participants: masterClass.current_participants || 0,
                spots_left: spotsLeft,
                is_full: spotsLeft <= 0,
                date_time: masterClass.date_time,
                duration_minutes: masterClass.duration_minutes,
                location: masterClass.location,
                online_link: masterClass.online_link,
                materials: masterClass.materials,
                image_url: getFullImageUrl(masterClass.image_url), // ← ИСПРАВЛЕНО!
                created_at: masterClass.created_at,
                updated_at: masterClass.updated_at,
                master_id: masterClass.master_id,
                master_name: masterClass.users?.profiles?.[0]?.full_name || masterClass.users?.email,
                master_avatar: masterClass.users?.profiles?.[0]?.avatar_url,
                master_city: masterClass.users?.profiles?.[0]?.city,
                master_phone: masterClass.users?.profiles?.[0]?.phone,
                master_address: masterClass.users?.profiles?.[0]?.address,
                is_registered: isRegistered,
                payment_status: paymentStatus,
                can_register: !isRegistered && spotsLeft > 0 && masterClass.status === 'published'
            };
        });

        return NextResponse.json({ success: true, data: result }, { status: 200 });
        
    } catch (error) {
        if (error instanceof Error && error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Мастер-класс не найден' }, { status: 404 });
        }
        logError('Error fetching master class detail', error);
        return NextResponse.json({ error: 'Ошибка загрузки мастер-класса' }, { status: 500 });
    }
}