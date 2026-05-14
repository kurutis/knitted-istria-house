import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3 } from "@/lib/s3-storage";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        if (session.user.role === 'master') {
            return NextResponse.json({ error: 'Мастера не могут оставлять отзывы' }, { status: 403 });
        }

        const formData = await request.formData();
        const rating = parseInt(formData.get('rating') as string);
        const comment = formData.get('comment') as string;
        const images = formData.getAll('images') as File[];

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Оценка должна быть от 1 до 5' }, { status: 400 });
        }

        if (!comment || comment.trim().length === 0) {
            return NextResponse.json({ error: 'Текст отзыва не может быть пустым' }, { status: 400 });
        }

        if (comment.length > 1000) {
            return NextResponse.json({ error: 'Отзыв не может превышать 1000 символов' }, { status: 400 });
        }

        // Проверяем товар
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, master_id, title')
            .eq('id', id)
            .single();

        if (productError || !product) {
            return NextResponse.json({ error: 'Товар не найден' }, { status: 404 });
        }

        // Проверяем, не оставлял ли пользователь уже отзыв
        const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('target_type', 'product')
            .eq('target_id', id)
            .eq('author_id', session.user.id)
            .maybeSingle();

        if (existingReview) {
            return NextResponse.json({ error: 'Вы уже оставляли отзыв на этот товар' }, { status: 400 });
        }

        // Загружаем изображения через S3
        const imageUrls: string[] = [];
        for (const file of images.slice(0, 5)) {
            if (file.size > 5 * 1024 * 1024) continue;
            if (!file.type.startsWith('image/')) continue;

            const folder = `reviews/${id}`;
            const fileUrl = await uploadToS3(file, folder, session.user.id);
            
            if (fileUrl) {
                imageUrls.push(fileUrl);
            }
        }

        const now = new Date().toISOString();

        const { data: review, error: reviewError } = await supabase
            .from('reviews')
            .insert({
                target_type: 'product',
                target_id: id,
                author_id: session.user.id,
                rating: rating,
                comment: comment.trim(),
                images: imageUrls,
                created_at: now,
                updated_at: now,
                is_verified_purchase: false
            })
            .select()
            .single();

        if (reviewError) {
            console.error('Error creating review:', reviewError);
            return NextResponse.json({ error: 'Ошибка при создании отзыва' }, { status: 500 });
        }

        // Обновляем рейтинг товара
        const { data: allReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('target_type', 'product')
            .eq('target_id', id);

        if (allReviews && allReviews.length > 0) {
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
            await supabase
                .from('products')
                .update({ rating: Math.round(avgRating * 10) / 10 })
                .eq('id', id);
        }

        // Уведомление мастеру
        await supabase
            .from('notifications')
            .insert({
                user_id: product.master_id,
                title: 'Новый отзыв на товар',
                message: `Пользователь ${session.user.name || session.user.email} оставил отзыв на "${product.title}" (${rating}★)`,
                type: 'review',
                metadata: { product_id: id, review_id: review.id, rating },
                created_at: now,
                is_read: false
            });

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', session.user.id)
            .single();

        return NextResponse.json({
            success: true,
            review: {
                id: review.id,
                rating: review.rating,
                comment: review.comment,
                images: review.images,
                created_at: review.created_at,
                updated_at: review.updated_at,
                author_id: review.author_id,
                author_name: profile?.full_name || session.user.name || session.user.email,
                author_avatar: profile?.avatar_url || null
            }
        }, { status: 201 });
        
    } catch (error) {
        console.error('Error in review API:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}