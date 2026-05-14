import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage";

interface Review {
    id: string;
    author_id: string;
    target_type: string;
    target_id: string;
}

interface AccessCheckResult {
    allowed: boolean;
    review?: Review;
    error?: string;
}

async function canModifyReview(reviewId: string, userId: string, userRole: string): Promise<AccessCheckResult> {
    const { data: review, error } = await supabase
        .from('reviews')
        .select('author_id, target_type, target_id')
        .eq('id', reviewId)
        .single();

    if (error || !review) {
        return { allowed: false, error: 'Отзыв не найден' };
    }

    if (userRole === 'admin') {
        return { allowed: true, review: review as Review };
    }

    if (review.author_id === userId) {
        return { allowed: true, review: review as Review };
    }

    return { allowed: false, error: 'У вас нет прав для этого действия' };
}

// PUT - редактирование отзыва
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { allowed, error, review } = await canModifyReview(id, session.user.id, session.user.role);
        
        if (!allowed) {
            return NextResponse.json({ error: error || 'Доступ запрещен' }, { status: 403 });
        }

        const formData = await request.formData();
        const rating = parseInt(formData.get('rating') as string);
        const comment = formData.get('comment') as string;
        const imagesToKeep = formData.getAll('imagesToKeep') as string[];
        const newImages = formData.getAll('newImages') as File[];

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Оценка должна быть от 1 до 5' }, { status: 400 });
        }

        if (!comment || comment.trim().length === 0) {
            return NextResponse.json({ error: 'Текст отзыва не может быть пустым' }, { status: 400 });
        }

        // Получаем текущий отзыв для удаления старых изображений
        const { data: currentReview } = await supabase
            .from('reviews')
            .select('images')
            .eq('id', id)
            .single();

        // Загружаем новые изображения через S3
        const newImageUrls: string[] = [];
        for (const file of newImages.slice(0, 5)) {
            if (file.size > 5 * 1024 * 1024) continue;
            if (!file.type.startsWith('image/')) continue;

            const folder = `reviews/${review!.target_id}`;
            const fileUrl = await uploadToS3(file, folder, session.user.id);
            
            if (fileUrl) {
                newImageUrls.push(fileUrl);
            }
        }

        // Определяем изображения, которые нужно удалить (которые были в старом отзыве, но не в imagesToKeep)
        const oldImages = currentReview?.images || [];
        const imagesToDelete = oldImages.filter((img: string) => !imagesToKeep.includes(img));

        // Удаляем изображения из S3
        for (const imgUrl of imagesToDelete) {
            await deleteFromS3(imgUrl);
        }

        const finalImages = [...(imagesToKeep || []), ...newImageUrls];

        const now = new Date().toISOString();

        const { data: updatedReview, error: updateError } = await supabase
            .from('reviews')
            .update({
                rating: rating,
                comment: comment.trim(),
                images: finalImages,
                updated_at: now
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating review:', updateError);
            return NextResponse.json({ error: 'Ошибка при обновлении отзыва' }, { status: 500 });
        }

        // Обновляем рейтинг товара
        if (review && review.target_type === 'product') {
            const { data: allReviews } = await supabase
                .from('reviews')
                .select('rating')
                .eq('target_type', 'product')
                .eq('target_id', review.target_id);

            if (allReviews && allReviews.length > 0) {
                const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
                await supabase
                    .from('products')
                    .update({ rating: Math.round(avgRating * 10) / 10 })
                    .eq('id', review.target_id);
            }
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', session.user.id)
            .single();

        return NextResponse.json({
            success: true,
            review: {
                id: updatedReview.id,
                rating: updatedReview.rating,
                comment: updatedReview.comment,
                images: updatedReview.images,
                created_at: updatedReview.created_at,
                updated_at: updatedReview.updated_at,
                author_id: updatedReview.author_id,
                author_name: profile?.full_name || session.user.name || session.user.email,
                author_avatar: profile?.avatar_url || null
            }
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating review:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}

// DELETE - удаление отзыва
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id } = await params;

        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { allowed, error, review } = await canModifyReview(id, session.user.id, session.user.role);
        
        if (!allowed) {
            return NextResponse.json({ error: error || 'Доступ запрещен' }, { status: 403 });
        }

        // Получаем изображения отзыва для удаления из S3
        const { data: currentReview } = await supabase
            .from('reviews')
            .select('images')
            .eq('id', id)
            .single();

        // Удаляем изображения из S3
        if (currentReview?.images) {
            for (const imgUrl of currentReview.images) {
                await deleteFromS3(imgUrl);
            }
        }

        const { error: deleteError } = await supabase
            .from('reviews')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting review:', deleteError);
            return NextResponse.json({ error: 'Ошибка при удалении отзыва' }, { status: 500 });
        }

        // Обновляем рейтинг товара
        if (review && review.target_type === 'product') {
            const { data: allReviews } = await supabase
                .from('reviews')
                .select('rating')
                .eq('target_type', 'product')
                .eq('target_id', review.target_id);

            if (allReviews && allReviews.length > 0) {
                const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
                await supabase
                    .from('products')
                    .update({ rating: Math.round(avgRating * 10) / 10 })
                    .eq('id', review.target_id);
            } else {
                await supabase
                    .from('products')
                    .update({ rating: null })
                    .eq('id', review.target_id);
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Отзыв успешно удален'
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error deleting review:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}