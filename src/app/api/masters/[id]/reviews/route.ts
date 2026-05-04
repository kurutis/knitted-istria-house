// app/api/master/[id]/reviews/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Rate limiting
const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 }); // 60 запросов в минуту

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
            return NextResponse.json({ 
                error: 'Неверный формат ID мастера',
                reviews: [],
                stats: {}
            }, { status: 400 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                reviews: [],
                stats: {}
            }, { status: 429 });
        }

        // Проверяем, существует ли мастер
        const { data: masterExists, error: masterError } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', id)
            .eq('role', 'master')
            .maybeSingle();

        if (masterError || !masterExists) {
            return NextResponse.json({ 
                error: 'Мастер не найден',
                reviews: [],
                stats: {}
            }, { status: 404 });
        }

        // Параметры пагинации и фильтрации
        const { searchParams } = new URL(request.url);
        const rating = searchParams.get('rating');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;
        const withPhotos = searchParams.get('with_photos') === 'true';

        // Кэшируем результат
        const cacheKey = `master_reviews_${id}_${rating || 'all'}_${page}_${limit}_${withPhotos}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            // Получаем отзывы с пагинацией
            let query = supabase
                .from('reviews')
                .select(`
                    id,
                    rating,
                    comment,
                    created_at,
                    updated_at,
                    is_verified_purchase,
                    images,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                `, { count: 'exact' })
                .eq('target_type', 'master')
                .eq('target_id', id);

            // Фильтр по рейтингу
            if (rating && !isNaN(parseInt(rating))) {
                query = query.eq('rating', parseInt(rating));
            }

            // Фильтр отзывов с фото
            if (withPhotos) {
                query = query.not('images', 'is', null);
            }

            const { data: reviews, error, count } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                logError('Error fetching master reviews', error);
                throw new Error('DATABASE_ERROR');
            }

            // Получаем статистику по отзывам
            const { data: allReviews, error: statsError } = await supabase
                .from('reviews')
                .select('rating')
                .eq('target_type', 'master')
                .eq('target_id', id);

            if (statsError) {
                logError('Error fetching review stats', statsError, 'warning');
            }

            // Подсчет статистики
            let totalRating = 0;
            let averageRating = 0;
            const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            let withPhotoCount = 0;

            if (allReviews && allReviews.length > 0) {
                totalRating = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
                averageRating = totalRating / allReviews.length;
                
                allReviews.forEach(review => {
                    const r = review.rating || 0;
                    if (r >= 1 && r <= 5) {
                        ratingDistribution[r]++;
                    }
                });
            }

            // Подсчет отзывов с фото
            if (reviews) {
                withPhotoCount = reviews.filter(r => r.images && Array.isArray(r.images) && r.images.length > 0).length;
            }

            // Форматируем отзывы
            const formattedReviews = reviews?.map(review => ({
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                created_at: review.created_at,
                updated_at: review.updated_at,
                is_verified_purchase: review.is_verified_purchase || false,
                images: review.images || [],
                author: {
                    id: review.users?.[0]?.id,
                    name: review.users?.[0]?.profiles?.[0]?.full_name || review.users?.[0]?.email,
                    avatar: review.users?.[0]?.profiles?.[0]?.avatar_url
                }
            })) || [];

            return {
                reviews: formattedReviews,
                pagination: {
                    total: count || 0,
                    page,
                    limit,
                    totalPages: Math.ceil((count || 0) / limit),
                    hasMore: offset + limit < (count || 0)
                },
                stats: {
                    total_reviews: allReviews?.length || 0,
                    average_rating: parseFloat(averageRating.toFixed(1)),
                    total_rating: totalRating,
                    rating_distribution: ratingDistribution,
                    with_photos_count: withPhotoCount
                }
            };
        });

        logInfo('Master reviews fetched', {
            masterId: id,
            reviewsCount: result.reviews.length,
            totalReviews: result.stats.total_reviews,
            averageRating: result.stats.average_rating,
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
        logError('Error fetching master reviews', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки отзывов',
            reviews: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
            stats: { total_reviews: 0, average_rating: 0, rating_distribution: {}, with_photos_count: 0 }
        }, { status: 500 });
    }
}