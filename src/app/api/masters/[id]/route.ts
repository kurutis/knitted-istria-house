import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";

const limiter = rateLimit({ limit: 120, windowMs: 60 * 1000 });

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
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID мастера' }, { status: 400 });
        }

        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const cacheKey = `master_profile_${id}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // 1. Получаем пользователя с проверкой роли master
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email, created_at, role, is_banned, is_active')
                .eq('id', id)
                .single();

            if (userError) {
                if (userError.code === 'PGRST116') {
                    throw new Error('NOT_FOUND');
                }
                logError('Error fetching user in master profile', userError);
                throw new Error('DATABASE_ERROR');
            }

            if (user.role !== 'master') {
                throw new Error('NOT_A_MASTER');
            }

            if (user.is_banned) {
                throw new Error('MASTER_BANNED');
            }

            // 2. Получаем профиль из таблицы profiles через user_id
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, phone, city, avatar_url')
                .eq('user_id', user.id)
                .maybeSingle();

            if (profileError) {
                logError('Error fetching profile in master API', profileError, 'warning');
            }

            // 3. Получаем данные мастера из таблицы masters через user_id
            const { data: masterData, error: masterError } = await supabase
                .from('masters')
                .select('description, is_verified, is_partner, rating, total_sales, custom_orders_enabled, moderation_status')
                .eq('user_id', user.id)
                .maybeSingle();

            if (masterError) {
                logError('Error fetching master data', masterError, 'warning');
            }

            // 4. Получаем количество подписчиков
            const { count: followersCount, error: followersError } = await supabase
                .from('master_followers')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', user.id);

            if (followersError) {
                logError('Error fetching followers count', followersError, 'warning');
            }

            // 5. Получаем количество активных товаров
            const { count: productsCount, error: productsError } = await supabase
                .from('products')
                .select('id', { count: 'exact', head: true })
                .eq('master_id', user.id)
                .eq('status', 'active');

            if (productsError) {
                logError('Error fetching products count', productsError, 'warning');
            }

            // 6. Получаем средний рейтинг из отзывов
            const { data: reviews, error: reviewsError } = await supabase
                .from('reviews')
                .select('rating')
                .eq('target_type', 'master')
                .eq('target_id', user.id);

            let averageRating = masterData?.rating || 0;
            let totalReviews = 0;

            if (!reviewsError && reviews && reviews.length > 0) {
                totalReviews = reviews.length;
                const ratingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
                averageRating = ratingSum / totalReviews;
            }

            // 7. Получаем топ-3 товаров мастера для превью
            const { data: topProducts, error: topProductsError } = await supabase
                .from('products')
                .select('id, title, price, main_image_url, views')
                .eq('master_id', user.id)
                .eq('status', 'active')
                .order('views', { ascending: false })
                .limit(3);

            if (topProductsError) {
                logError('Error fetching top products', topProductsError, 'warning');
            }

            // Формируем ответ
            return {
                id: user.id,
                email: user.email,
                member_since: user.created_at,
                name: profile?.full_name || user.email?.split('@')[0] || 'Мастер',
                full_name: profile?.full_name || null,
                phone: profile?.phone || null,
                city: profile?.city || null,
                avatar_url: profile?.avatar_url || null,
                description: masterData?.description || '',
                is_verified: masterData?.is_verified || false,
                is_partner: masterData?.is_partner || false,
                rating: parseFloat(averageRating.toFixed(1)),
                total_sales: masterData?.total_sales || 0,
                custom_orders_enabled: masterData?.custom_orders_enabled || false,
                followers_count: followersCount || 0,
                products_count: productsCount || 0,
                pieces_created: masterData?.total_sales || 0,
                total_reviews: totalReviews,
                moderation_status: masterData?.moderation_status || 'approved',
                top_products: topProducts?.map(p => ({
                    id: p.id,
                    title: p.title,
                    price: parseFloat(p.price),
                    image_url: p.main_image_url,
                    views: p.views || 0
                })) || []
            };
        }, 300); // Кэшируем на 5 минут

        logApiRequest('GET', `/api/masters/${id}`, 200, Date.now() - startTime);

        return NextResponse.json({
            success: true,
            data: result,
            meta: {
                cached: Date.now() - startTime < 100,
                timestamp: new Date().toISOString()
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'NOT_FOUND') {
                return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
            }
            if (error.message === 'NOT_A_MASTER') {
                return NextResponse.json({ error: 'Пользователь не является мастером' }, { status: 404 });
            }
            if (error.message === 'MASTER_BANNED') {
                return NextResponse.json({ error: 'Профиль мастера заблокирован' }, { status: 403 });
            }
        }
        logError('Error fetching master profile', error);
        return NextResponse.json({ error: 'Ошибка загрузки профиля мастера' }, { status: 500 });
    }
}