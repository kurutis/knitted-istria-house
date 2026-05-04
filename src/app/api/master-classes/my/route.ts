// app/api/my/master-classes/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

export async function GET(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов',
                registrations: []
            }, { status: 429 });
        }

        // Параметры пагинации и фильтрации
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // upcoming, past, cancelled
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Кэшируем результат
        const cacheKey = `my_master_classes_${session.user.id}_${status || 'all'}_${page}_${limit}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // 1. Получаем ID мастер-классов, на которые записан пользователь
            const registrationsQuery = supabase
                .from('master_class_registrations')
                .select('master_class_id, payment_status, payment_amount, created_at, updated_at')
                .eq('user_id', session.user.id);

            const { data: registrations, error: regError, count: totalRegistrations } = await registrationsQuery;

            if (regError) {
                logError('Error fetching registrations', regError);
                throw new Error('DATABASE_ERROR');
            }

            if (!registrations || registrations.length === 0) {
                return {
                    registrations: [],
                    pagination: { total: 0, page, limit, totalPages: 0 },
                    stats: { total: 0, upcoming: 0, past: 0, cancelled: 0, paid: 0 }
                };
            }

            const masterClassIds = registrations.map(r => r.master_class_id);
            
            // 2. Получаем информацию о мастер-классах
            let classesQuery = supabase
                .from('master_classes')
                .select(`
                    id,
                    title,
                    description,
                    type,
                    status,
                    price,
                    max_participants,
                    current_participants,
                    date_time,
                    duration_minutes,
                    location,
                    online_link,
                    materials,
                    image_url,
                    created_at,
                    updated_at,
                    master_id,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url,
                            city,
                            phone
                        )
                    )
                `)
                .in('id', masterClassIds);

            // Фильтр по статусу (предстоящие/прошедшие)
            const now = new Date().toISOString();
            if (status === 'upcoming') {
                classesQuery = classesQuery.gt('date_time', now);
            } else if (status === 'past') {
                classesQuery = classesQuery.lt('date_time', now);
            } else if (status === 'cancelled') {
                classesQuery = classesQuery.eq('status', 'cancelled');
            }

            const { data: masterClasses, error: mcError, count: totalClasses } = await classesQuery
                .order('date_time', { ascending: status === 'past' ? false : true })
                .range(offset, offset + limit - 1);

            if (mcError) {
                logError('Error fetching master classes', mcError);
                throw new Error('DATABASE_ERROR');
            }

            // 3. Создаем Map для быстрого доступа к информации о регистрации
            const registrationMap = new Map();
            registrations.forEach(reg => {
                registrationMap.set(reg.master_class_id, {
                    payment_status: reg.payment_status,
                    payment_amount: reg.payment_amount,
                    registered_at: reg.created_at,
                    updated_at: reg.updated_at
                });
            });

            // 4. Форматируем результат с дополнительной информацией
            const nowDate = new Date();
            const formattedClasses = masterClasses?.map(mc => {
                const classDate = new Date(mc.date_time);
                const isUpcoming = classDate > nowDate;
                const isPast = classDate < nowDate;
                const isFull = mc.current_participants >= mc.max_participants;
                const spotsLeft = mc.max_participants - (mc.current_participants || 0);
                
                return {
                    id: mc.id,
                    payment_status: registrationMap.get(mc.id)?.payment_status || 'pending',
                    payment_amount: registrationMap.get(mc.id)?.payment_amount || 0,
                    registered_at: registrationMap.get(mc.id)?.registered_at,
                    updated_at: registrationMap.get(mc.id)?.updated_at,
                    master_class: {
                        id: mc.id,
                        title: mc.title,
                        description: mc.description,
                        type: mc.type,
                        status: mc.status,
                        price: parseFloat(mc.price || 0),
                        max_participants: mc.max_participants,
                        current_participants: mc.current_participants || 0,
                        spots_left: spotsLeft,
                        is_full: isFull,
                        date_time: mc.date_time,
                        duration_minutes: mc.duration_minutes,
                        location: mc.location,
                        online_link: mc.online_link,
                        materials: mc.materials,
                        image_url: mc.image_url,
                        created_at: mc.created_at,
                        updated_at: mc.updated_at,
                        master_id: mc.master_id,
                        master_name: mc.users?.[0]?.profiles?.[0]?.full_name || mc.users?.[0]?.email,
                        master_avatar: mc.users?.[0]?.profiles?.[0]?.avatar_url,
                        master_city: mc.users?.[0]?.profiles?.[0]?.city,
                        master_phone: mc.users?.[0]?.profiles?.[0]?.phone,
                        is_upcoming: isUpcoming,
                        is_past: isPast,
                        can_cancel: isUpcoming && mc.status === 'published' && !isPast,
                        can_review: isPast && mc.status === 'completed'
                    }
                };
            }) || [];

            // 5. Подсчет статистики
            const allRegistrations = registrations;
            const allMasterClasses = masterClasses || [];
            
            const stats = {
                total: allRegistrations.length,
                upcoming: allMasterClasses.filter(mc => new Date(mc.date_time) > new Date()).length,
                past: allMasterClasses.filter(mc => new Date(mc.date_time) < new Date()).length,
                cancelled: allMasterClasses.filter(mc => mc.status === 'cancelled').length,
                paid: allRegistrations.filter(r => r.payment_status === 'paid').length,
                total_spent: allRegistrations
                    .filter(r => r.payment_status === 'paid')
                    .reduce((sum, r) => sum + (r.payment_amount || 0), 0)
            };

            return {
                registrations: formattedClasses,
                pagination: {
                    total: totalClasses || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((totalClasses || 0) / limit),
                    hasMore: offset + limit < (totalClasses || 0)
                },
                stats
            };
        });

        logInfo('My master classes fetched', {
            userId: session.user.id,
            count: result.registrations.length,
            total: result.pagination.total,
            stats: result.stats,
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
        logError('Error fetching my master classes', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки мастер-классов',
            registrations: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            stats: { total: 0, upcoming: 0, past: 0, cancelled: 0, paid: 0, total_spent: 0 }
        }, { status: 500 });
    }
}