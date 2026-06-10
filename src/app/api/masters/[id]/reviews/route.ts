import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery } from "@/lib/db-optimized";
import { logError, logApiRequest } from "@/lib/error-logger";

const limiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const startTime = Date.now();
    
    try {
        const { id } = await params;
        
        if (!isValidUUID(id)) return NextResponse.json({ error: 'Неверный формат ID мастера', reviews: [], stats: {}}, { status: 400 });
        

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) return NextResponse.json({error: 'Слишком много запросов. Попробуйте через минуту.', reviews: [], stats: {}}, { status: 429 });
    

        const { data: master, error: masterError } = await supabase.from('users').select('id, role').eq('id', id).eq('role', 'master').maybeSingle();

        if (masterError || !master) return NextResponse.json({ error: 'Мастер не найден', reviews: [], stats: {}}, { status: 404 });
        

        const cacheKey = `master_reviews_${id}`;
        
        const result = await cachedQuery(cacheKey, async () => {
            const { data: reviews, error } = await supabase.from('reviews').select(`id, rating, comment, created_at, author_id`).eq('target_type', 'master').eq('target_id', id).order('created_at', { ascending: false });

            if (error) {
                logError('Error fetching master reviews', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!reviews || reviews.length === 0) return {reviews: [], stats: { total_reviews: 0, average_rating: 0 }};
            

            const authorIds = [...new Set(reviews.map(r => r.author_id))];
            const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', authorIds);

            const profileMap = new Map();
            profiles?.forEach(p => {profileMap.set(p.user_id, p)})

            let totalRating = 0;
            reviews.forEach(r => {totalRating += r.rating});
            const averageRating = totalRating / reviews.length;

            const formattedReviews = reviews.map(review => {
                const profile = profileMap.get(review.author_id);
                return {id: review.id, rating: review.rating, comment: review.comment, created_at: review.created_at, author_id: review.author_id, author_name: profile?.full_name || 'Пользователь', author_avatar: profile?.avatar_url || null};
            });

            return {reviews: formattedReviews, stats: {total_reviews: reviews.length, average_rating: parseFloat(averageRating.toFixed(1))}};
        }, 300);

        logApiRequest('GET', `/api/masters/${id}/reviews`, 200, Date.now() - startTime);

        return NextResponse.json({success: true, ...result, meta: {cached: Date.now() - startTime < 100, timestamp: new Date().toISOString()}}, { status: 200 });
        
    } catch (error) {
        logError('Error fetching master reviews', error);
        return NextResponse.json({ error: 'Ошибка загрузки отзывов', reviews: [], stats: { total_reviews: 0, average_rating: 0 } }, { status: 500 });
    }
}