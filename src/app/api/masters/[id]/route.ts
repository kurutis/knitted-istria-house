// app/api/master/[id]/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 120, windowMs: 60 * 1000 }); // 120 запросов в минуту

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
        const { id } = await params;
        
        // Валидация ID мастера
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Кэшируем профиль мастера на 5 минут
        const cacheKey = `master_public_profile_${id}`;
        
        const formattedMaster = await cachedQuery(cacheKey, async () => {
            // 1. Получаем данные мастера с профилем
            const { data: master, error } = await supabase
                .from('users')
                .select(`
                    id,
                    email,
                    created_at,
                    role,
                    profiles!left (
                        full_name,
                        phone,
                        city,
                        avatar_url,
                        created_at
                    ),
                    masters!left (
                        description,
                        is_verified,
                        is_partner,
                        rating,
                        total_sales,
                        custom_orders_enabled,
                        moderation_status,
                        is_banned
                    )
                `)
                .eq('id', id)
                .eq('role', 'master')
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('NOT_FOUND');
                }
                logError('Error fetching master', error);
                throw new Error('DATABASE_ERROR');
            }

            // Проверяем, не забанен ли мастер (скрываем забаненных)
            if (master.masters?.[0]?.is_banned) {
                throw new Error('MASTER_BANNED');
            }

            // 2. Получаем количество подписчиков
            const { count: followersCount, error: followersError } = await supabase
                .from('master_followers')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', id);

            if (followersError) {
                logError('Error fetching followers count', followersError, 'warning');
            }

            // 3. Получаем количество товаров мастера
            const { count: productsCount, error: productsError } = await supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', id)
                .eq('status', 'active');

            if (productsError) {
                logError('Error fetching products count', productsError, 'warning');
            }

            // 4. Получаем общий рейтинг из отзывов
            const { data: reviews, error: reviewsError } = await supabase
                .from('reviews')
                .select('rating')
                .eq('target_type', 'master')
                .eq('target_id', id);

            let averageRating = master.masters?.[0]?.rating || 0;
            let totalReviews = 0;
            
            if (!reviewsError && reviews && reviews.length > 0) {
                totalReviews = reviews.length;
                const ratingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
                averageRating = ratingSum / totalReviews;
            }

            // 5. Получаем топ-3 товаров мастера (для превью)
            const { data: topProducts, error: topProductsError } = await supabase
                .from('products')
                .select('id, title, price, main_image_url')
                .eq('master_id', id)
                .eq('status', 'active')
                .order('views', { ascending: false })
                .limit(3);

            if (topProductsError) {
                logError('Error fetching top products', topProductsError, 'warning');
            }

            // 6. Получаем предстоящие мастер-классы
            const { data: upcomingClasses, error: classesError } = await supabase
                .from('master_classes')
                .select('id, title, date_time, image_url')
                .eq('master_id', id)
                .eq('status', 'published')
                .gt('date_time', new Date().toISOString())
                .order('date_time', { ascending: true })
                .limit(3);

            if (classesError) {
                logError('Error fetching upcoming classes', classesError, 'warning');
            }

            // Форматируем ответ
            return {
                id: master.id,
                email: master.email,
                member_since: master.created_at,
                name: master.profiles?.[0]?.full_name || master.email?.split('@')[0] || 'Мастер',
                phone: master.profiles?.[0]?.phone || null,
                city: master.profiles?.[0]?.city || null,
                avatar_url: master.profiles?.[0]?.avatar_url || null,
                description: master.masters?.[0]?.description || '',
                is_verified: master.masters?.[0]?.is_verified || false,
                is_partner: master.masters?.[0]?.is_partner || false,
                rating: parseFloat(averageRating.toFixed(1)),
                total_reviews: totalReviews,
                total_sales: master.masters?.[0]?.total_sales || 0,
                custom_orders_enabled: master.masters?.[0]?.custom_orders_enabled || false,
                followers_count: followersCount || 0,
                products_count: productsCount || 0,
                top_products: topProducts?.map(p => ({
                    id: p.id,
                    title: p.title,
                    price: parseFloat(p.price),
                    image_url: p.main_image_url
                })) || [],
                upcoming_classes: upcomingClasses?.map(c => ({
                    id: c.id,
                    title: c.title,
                    date_time: c.date_time,
                    image_url: c.image_url
                })) || [],
                // SEO информация
                seo: {
                    title: `${master.profiles?.[0]?.full_name || master.email} - мастер на Knitly`,
                    description: master.masters?.[0]?.description?.substring(0, 160) || `Мастер на Knitly. ${master.masters?.[0]?.total_sales || 0} продаж, рейтинг ${averageRating.toFixed(1)}`
                }
            };
        });

        logInfo('Master public profile fetched', {
            masterId: id,
            name: formattedMaster.name,
            rating: formattedMaster.rating,
            productsCount: formattedMaster.products_count,
            followersCount: formattedMaster.followers_count,
            duration: Date.now() - startTime
        });

        return NextResponse.json({
            success: true,
            data: formattedMaster,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof Error && error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'MASTER_BANNED') {
            return NextResponse.json({ error: 'Профиль мастера недоступен' }, { status: 403 });
        }
        if (error instanceof Error && error.message === 'DATABASE_ERROR') {
            return NextResponse.json({ error: 'Ошибка загрузки мастера' }, { status: 500 });
        }
        
        logError('Error fetching master', error);
        return NextResponse.json({ error: 'Ошибка загрузки мастера' }, { status: 500 });
    }
}