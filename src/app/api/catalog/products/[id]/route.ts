import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Определяем типы
interface ProductImage {
    id: string;
    image_url: string;
    sort_order: number;
}

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    author_name: string;
    author_avatar: string | null;
}

interface Yarn {
    id: string;
    name: string;
    article: string;
    brand: string;
    color: string;
    composition: string;
}

// Схема валидации
const updateCartSchema = z.object({
    quantity: z.number().int().min(0, 'Количество не может быть отрицательным').max(999, 'Максимальное количество 999 единиц'),
});

// Rate limiting
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// GET - получить товар по ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const { id } = await params;
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        // Получаем товар
        const { data: product, error: productError } = await supabase
            .from('products')
            .select(`
                id,
                title,
                description,
                price,
                category,
                technique,
                size,
                care_instructions,
                color,
                main_image_url,
                master_id,
                views,
                created_at,
                status
            `)
            .eq('id', id)
            .single();

        if (productError || !product) {
            logInfo('Product not found', { productId: id });
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        if (product.status !== 'active') {
            return NextResponse.json({ error: 'Товар недоступен' }, { status: 404 });
        }

        // Увеличиваем счетчик просмотров
        await supabase
            .from('products')
            .update({ views: (product.views || 0) + 1 })
            .eq('id', id);

        // Получаем изображения товара
        const { data: images, error: imagesError } = await supabase
            .from('product_images')
            .select('id, image_url, sort_order')
            .eq('product_id', id)
            .order('sort_order', { ascending: true });

        if (imagesError) {
            logError('Error fetching product images', imagesError);
        }

        const imagesList: ProductImage[] = images || [];

        // Получаем данные мастера
        const { data: master, error: masterError } = await supabase
            .from('masters')
            .select('user_id')
            .eq('id', product.master_id)
            .maybeSingle();

        let masterName = 'Мастер';
        let masterAvatar: string | null = null;
        let masterCity = '';

        if (master && !masterError) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('full_name, avatar_url, city')
                .eq('user_id', master.user_id)
                .maybeSingle();
            
            if (profile && !profileError) {
                masterName = profile.full_name || 'Мастер';
                masterAvatar = profile.avatar_url;
                masterCity = profile.city || '';
            }
        }

        // Получаем отзывы
        const { data: reviews, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
                id,
                rating,
                comment,
                created_at,
                user_id
            `)
            .eq('product_id', id)
            .order('created_at', { ascending: false });

        let reviewsList: Review[] = [];
        let avgRating = 0;

        if (reviews && !reviewsError && reviews.length > 0) {
            // Получаем имена авторов отзывов
            const userIds = [...new Set(reviews.map(r => r.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name, avatar_url')
                .in('user_id', userIds);
            
            const profileMap = new Map();
            profiles?.forEach(p => {
                profileMap.set(p.user_id, p);
            });
            
            reviewsList = reviews.map(r => {
                const profile = profileMap.get(r.user_id);
                return {
                    id: r.id,
                    rating: r.rating,
                    comment: r.comment || '',
                    created_at: r.created_at,
                    author_name: profile?.full_name || 'Пользователь',
                    author_avatar: profile?.avatar_url || null
                };
            });
            
            if (reviewsList.length > 0) {
                const sum = reviewsList.reduce((acc, r) => acc + r.rating, 0);
                avgRating = sum / reviewsList.length;
            }
        }

        // Получаем ID пряжи для товара
        const { data: productYarnIds, error: yarnsError } = await supabase
            .from('product_yarns')
            .select('yarn_id')
            .eq('product_id', id);

        let yarnsList: Yarn[] = [];
        
        if (productYarnIds && !yarnsError && productYarnIds.length > 0) {
            const yarnIds = productYarnIds.map(item => item.yarn_id);
            
            // Получаем данные пряжи по ID
            const { data: yarns, error: yarnsDataError } = await supabase
                .from('yarns')
                .select('id, name, article, brand, color, composition')
                .in('id', yarnIds);
            
            if (yarns && !yarnsDataError) {
                yarnsList = yarns as Yarn[];
            }
        }

        const result = {
            id: product.id,
            title: product.title,
            description: product.description || '',
            price: parseFloat(product.price) || 0,
            category: product.category || '',
            technique: product.technique || '',
            size: product.size || '',
            care_instructions: product.care_instructions || '',
            color: product.color || '',
            main_image_url: product.main_image_url,
            images: imagesList,
            master_id: product.master_id,
            master_name: masterName,
            master_avatar: masterAvatar,
            master_city: masterCity,
            rating: avgRating,
            reviews_count: reviewsList.length,
            reviews: reviewsList,
            yarns: yarnsList,
            views: (product.views || 0) + 1,
            created_at: product.created_at,
            status: product.status
        };

        logApiRequest('GET', `/api/catalog/products/${id}`, 200, Date.now() - startTime);

        return NextResponse.json(result, { status: 200 });
        
    } catch (error) {
        logError('Error fetching product', error);
        return NextResponse.json({ error: 'Ошибка загрузки товара' }, { status: 500 });
    }
}

// PATCH - обновить количество товара в корзине
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for cart PATCH', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            logInfo('Unauthorized cart update attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID товара' }, { status: 400 });
        }

        const validatedData = updateCartSchema.parse({
            quantity: body.quantity
        });
        const { quantity } = validatedData;

        // Проверяем, существует ли товар
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, title, status')
            .eq('id', id)
            .single();

        if (productError || !product) {
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        if (product.status !== 'active') {
            return NextResponse.json({ error: 'Товар недоступен' }, { status: 400 });
        }

        const now = new Date().toISOString();

        if (quantity <= 0) {
            const { error: deleteError } = await supabase
                .from('cart')
                .delete()
                .eq('user_id', session.user.id)
                .eq('product_id', id);

            if (deleteError) {
                logError('Error deleting from cart', deleteError);
                return NextResponse.json({ error: 'Ошибка удаления из корзины' }, { status: 500 });
            }
        } else {
            const { data: existingItem, error: checkError } = await supabase
                .from('cart')
                .select('id, quantity')
                .eq('user_id', session.user.id)
                .eq('product_id', id)
                .maybeSingle();

            if (!existingItem) {
                const { error: insertError } = await supabase
                    .from('cart')
                    .insert({
                        user_id: session.user.id,
                        product_id: id,
                        quantity: quantity,
                        created_at: now,
                        updated_at: now
                    });

                if (insertError) {
                    logError('Error inserting into cart', insertError);
                    return NextResponse.json({ error: 'Ошибка добавления в корзину' }, { status: 500 });
                }
            } else {
                const { error: updateError } = await supabase
                    .from('cart')
                    .update({
                        quantity: quantity,
                        updated_at: now
                    })
                    .eq('user_id', session.user.id)
                    .eq('product_id', id);

                if (updateError) {
                    logError('Error updating cart', updateError);
                    return NextResponse.json({ error: 'Ошибка обновления корзины' }, { status: 500 });
                }
            }
        }

        invalidateCache(`cart_${session.user.id}`);

        logApiRequest('PATCH', `/api/catalog/products/${id}`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            success: true, 
            message: quantity <= 0 ? 'Товар удален из корзины' : 'Количество обновлено'
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating cart', error);
        return NextResponse.json({ error: 'Ошибка обновления корзины' }, { status: 500 });
    }
}