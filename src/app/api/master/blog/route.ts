import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";
import { uploadToS3, deleteFromS3 } from "@/lib/s3-storage";
import { createClient } from "@supabase/supabase-js";

interface BlogImage {
    id: string;
    image_url: string;
    sort_order: number;
}

// Rate limiting
const getLimiter = rateLimit({ limit: 60, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

// Создаем админ-клиент с сервисным ключом
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  : supabase;

// Валидация данных
function validateTitle(title: string): { valid: boolean; error?: string } {
    if (!title || typeof title !== 'string') {
        return { valid: false, error: 'Заголовок обязателен' };
    }
    const trimmed = title.trim();
    if (trimmed.length < 3) {
        return { valid: false, error: 'Заголовок должен содержать минимум 3 символа' };
    }
    if (trimmed.length > 200) {
        return { valid: false, error: 'Заголовок не может превышать 200 символов' };
    }
    return { valid: true };
}

function validateContent(content: string): { valid: boolean; error?: string } {
    if (!content || typeof content !== 'string') {
        return { valid: false, error: 'Содержание обязательно' };
    }
    const trimmed = content.trim();
    if (trimmed.length < 10) {
        return { valid: false, error: 'Содержание должно содержать минимум 10 символов' };
    }
    if (trimmed.length > 50000) {
        return { valid: false, error: 'Содержание не может превышать 50000 символов' };
    }
    return { valid: true };
}

function validateExcerpt(excerpt: string | null): { valid: boolean; error?: string } {
    if (!excerpt) return { valid: true };
    if (excerpt.length > 500) {
        return { valid: false, error: 'Анонс не может превышать 500 символов' };
    }
    return { valid: true };
}

function validateTags(tags: string | null): string[] | null {
    if (!tags) return null;
    try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) {
            return parsed.slice(0, 10).map(t => t.trim()).filter(t => t.length > 0 && t.length <= 50);
        }
        return [tags.trim()];
    } catch {
        return tags.split(',').map(t => t.trim()).filter(t => t.length > 0 && t.length <= 50).slice(0, 10);
    }
}

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-zа-яё0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 100);
}

// GET - получить посты мастера
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
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов',
                posts: []
            }, { status: 429 });
        }

        // Параметры пагинации
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const page = parseInt(searchParams.get('page') || '1');
        const offset = (page - 1) * limit;

        // Получаем посты используя admin клиент
        let query = supabaseAdmin
            .from('blog_posts')
            .select('*', { count: 'exact' })
            .eq('master_id', session.user.id);

        if (status && ['draft', 'published', 'hidden', 'archived'].includes(status)) {
            query = query.eq('status', status);
        }

        const { data: posts, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            logError('Error fetching master posts', error);
            return NextResponse.json({ 
                success: true,
                posts: [],
                pagination: { total: 0, page: 1, limit, totalPages: 0 }
            });
        }

        if (!posts || posts.length === 0) {
            return NextResponse.json({
                success: true,
                posts: [],
                pagination: { total: 0, page, limit, totalPages: 0 }
            });
        }

        // Получаем ID постов для дополнительных запросов
        const postIds = posts.map(p => p.id);
        
        // Получаем изображения для всех постов
        const { data: images } = await supabaseAdmin
            .from('blog_images')
            .select('post_id, id, image_url, sort_order')
            .in('post_id', postIds)
            .order('sort_order', { ascending: true });

        // Получаем количество лайков для каждого поста
        const { data: likes } = await supabaseAdmin
            .from('blog_likes')
            .select('post_id')
            .in('post_id', postIds);

        // Получаем количество комментариев для каждого поста
        const { data: comments } = await supabaseAdmin
            .from('blog_comments')
            .select('post_id, status')
            .in('post_id', postIds)
            .eq('status', 'approved');

        // Группируем данные по post_id
        const imagesMap = new Map();
        images?.forEach(img => {
            if (!imagesMap.has(img.post_id)) {
                imagesMap.set(img.post_id, []);
            }
            imagesMap.get(img.post_id).push({
                id: img.id,
                image_url: img.image_url,
                sort_order: img.sort_order
            });
        });

        const likesMap = new Map();
        likes?.forEach(like => {
            likesMap.set(like.post_id, (likesMap.get(like.post_id) || 0) + 1);
        });

        const commentsMap = new Map();
        comments?.forEach(comment => {
            commentsMap.set(comment.post_id, (commentsMap.get(comment.post_id) || 0) + 1);
        });

        // Форматируем посты
        const formattedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            content: post.content,
            excerpt: post.excerpt,
            category: post.category,
            tags: post.tags,
            status: post.status,
            main_image_url: post.main_image_url,
            views: post.views || 0,
            created_at: post.created_at,
            updated_at: post.updated_at,
            published_at: post.published_at,
            images: imagesMap.get(post.id) || [],
            stats: {
                comments_count: commentsMap.get(post.id) || 0,
                likes_count: likesMap.get(post.id) || 0
            }
        }));

        return NextResponse.json({
            success: true,
            posts: formattedPosts,
            pagination: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            },
            meta: {
                cached: Date.now() - startTime < 100
            }
        });
        
    } catch (error) {
        logError('Error in master blog GET', error);
        return NextResponse.json({ 
            success: true,
            posts: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
        });
    }
}

// POST - создать новый пост
export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }
        
        if (session.user.role !== 'master') {
            return NextResponse.json({ error: 'Доступ запрещен. Только для мастеров.' }, { status: 403 });
        }

        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Проверяем, не забанен ли мастер
        const { data: master, error: masterError } = await supabaseAdmin
            .from('masters')
            .select('is_banned, can_post')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (masterError) {
            logError('Error checking master status', masterError);
        }

        if (master?.is_banned) {
            return NextResponse.json({ error: 'Ваш аккаунт заблокирован. Вы не можете создавать посты.' }, { status: 403 });
        }

        if (master?.can_post === false) {
            return NextResponse.json({ error: 'Вам временно запрещено создавать посты.' }, { status: 403 });
        }

        const formData = await request.formData();
        
        const title = formData.get('title') as string;
        const content = formData.get('content') as string;
        const excerpt = formData.get('excerpt') as string;
        const category = formData.get('category') as string;
        const tags = formData.get('tags') as string;
        const status_publish = formData.get('status') as string;
        const images = formData.getAll('images') as File[];

        // Валидация
        const titleValidation = validateTitle(title);
        if (!titleValidation.valid) {
            return NextResponse.json({ error: titleValidation.error }, { status: 400 });
        }

        const contentValidation = validateContent(content);
        if (!contentValidation.valid) {
            return NextResponse.json({ error: contentValidation.error }, { status: 400 });
        }

        const excerptValidation = validateExcerpt(excerpt);
        if (!excerptValidation.valid) {
            return NextResponse.json({ error: excerptValidation.error }, { status: 400 });
        }

        if (images.length > 20) {
            return NextResponse.json({ error: 'Максимум 20 изображений на пост' }, { status: 400 });
        }

        for (const image of images) {
            if (image.size > 10 * 1024 * 1024) {
                return NextResponse.json({ error: `Изображение ${image.name} превышает 10MB` }, { status: 400 });
            }
            if (!image.type.startsWith('image/')) {
                return NextResponse.json({ error: `Файл ${image.name} не является изображением` }, { status: 400 });
            }
        }

        const now = new Date().toISOString();
        const finalStatus = status_publish === 'published' ? 'published' : 'draft';
        
        // Генерируем slug
        const slug = generateSlug(title);

        const { data: existingPost } = await supabaseAdmin
            .from('blog_posts')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        const finalSlug = existingPost ? `${slug}-${Date.now()}` : slug;

        // Создаем пост
        const { data: newPost, error: insertError } = await supabaseAdmin
            .from('blog_posts')
            .insert({
                master_id: session.user.id,
                title: title.trim(),
                slug: finalSlug,
                content: content.trim(),
                excerpt: excerpt?.trim() || content.trim().substring(0, 200),
                category: category || null,
                tags: validateTags(tags),
                status: finalStatus,
                created_at: now,
                updated_at: now,
                published_at: finalStatus === 'published' ? now : null,
                views: 0
            })
            .select()
            .single();

        if (insertError) {
            logError('Error creating blog post', insertError);
            return NextResponse.json({ error: 'Ошибка создания поста' }, { status: 500 });
        }

        const postId = newPost.id;
        const uploadedImages = [];

        // Загружаем изображения
        for (let i = 0; i < images.length; i++) {
            try {
                const imageUrl = await uploadToS3(images[i], 'blog', `${postId}/${Date.now()}-${i}`);
                if (imageUrl) {
                    const { data: imageData } = await supabaseAdmin
                        .from('blog_images')
                        .insert({ 
                            post_id: postId, 
                            image_url: imageUrl, 
                            sort_order: i 
                        })
                        .select()
                        .single();
                    
                    uploadedImages.push(imageData);
                    
                    if (i === 0) {
                        await supabaseAdmin
                            .from('blog_posts')
                            .update({ main_image_url: imageUrl })
                            .eq('id', postId);
                    }
                }
            } catch (uploadError) {
                logError(`Error uploading image ${i}`, uploadError, 'warning');
            }
        }

        invalidateCache(new RegExp(`master_blog_${session.user.id}`));
        invalidateCache('blog_posts_list');
        invalidateCache('blog_posts_feed');

        logInfo('Blog post created', {
            postId,
            masterId: session.user.id,
            title: title.trim(),
            status: finalStatus,
            imagesCount: uploadedImages.length,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ 
            success: true, 
            message: finalStatus === 'published' ? 'Пост успешно опубликован' : 'Черновик сохранен',
            postId,
            slug: finalSlug,
            status: finalStatus
        }, { status: 201 });
        
    } catch (error) {
        logError('Error creating blog post', error);
        return NextResponse.json({ error: 'Ошибка создания поста' }, { status: 500 });
    }
}