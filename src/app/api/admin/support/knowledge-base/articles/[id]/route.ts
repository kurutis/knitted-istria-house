// app/api/admin/support/knowledge-base/articles/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Интерфейс для категории
interface CategoryData {
    id: number
    name: string
    slug: string
}

// Схема валидации для PUT запроса
const updateArticleSchema = z.object({
    title: z.string().min(3, 'Заголовок должен содержать минимум 3 символа').max(255),
    content: z.string().min(10, 'Содержание должно содержать минимум 10 символов'),
    category: z.string().min(1, 'Выберите категорию'),
    tags: z.string().optional(),
    is_published: z.boolean().optional(),
});

// Rate limiting
const putLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });
const deleteLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

// Валидация ID
function isValidId(id: string): boolean {
    return /^\d+$/.test(id);
}

// Обработка тегов
function processTags(tags: string | undefined): string[] | null {
    if (!tags) return null;
    return tags.split(',').map(t => sanitize.text(t.trim())).filter(t => t.length > 0);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = putLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for knowledge article update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized knowledge article update attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidId(id)) {
            return NextResponse.json({ error: 'Неверный формат ID статьи' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = updateArticleSchema.parse({
            title: body.title,
            content: body.content,
            category: body.category,
            tags: body.tags,
            is_published: body.is_published
        });

        const { title, content, category, tags, is_published } = validatedData;

        // Проверяем существование статьи
        const { data: existingArticle, error: checkError } = await supabase
            .from('knowledge_articles')
            .select('id, title, author_id, is_published')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                logInfo('Knowledge article not found for update', { articleId: id });
                return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
            }
            logError('Error checking knowledge article', checkError);
            return NextResponse.json({ error: 'Ошибка проверки статьи' }, { status: 500 });
        }

        // Находим ID категории по slug или имени
        let categoryId: number;
        let categoryData: CategoryData;
        
        // Пробуем найти по slug
        const { data: catBySlug, error: slugError } = await supabase
            .from('knowledge_categories')
            .select('id, name, slug')
            .eq('slug', category)
            .maybeSingle();
        
        if (catBySlug) {
            categoryId = catBySlug.id;
            categoryData = catBySlug as CategoryData;
        } else {
            // Ищем по имени
            const { data: catByName, error: nameError } = await supabase
                .from('knowledge_categories')
                .select('id, name, slug')
                .ilike('name', category)
                .maybeSingle();
            
            if (nameError || !catByName) {
                return NextResponse.json({ error: 'Категория не найдена' }, { status: 400 });
            }
            categoryId = catByName.id;
            categoryData = catByName as CategoryData;
        }

        const now = new Date().toISOString();
        
        // Обрабатываем теги
        const processedTags = processTags(tags);
        
        // Обновляем статью
        const { data: updatedArticle, error: updateError } = await supabase
            .from('knowledge_articles')
            .update({
                title: sanitize.text(title.trim()),
                content: sanitize.html(content.trim()),
                category_id: categoryId,
                tags: processedTags,
                is_published: is_published !== undefined ? is_published : existingArticle.is_published,
                updated_at: now
            })
            .eq('id', id)
            .select(`
                *,
                knowledge_categories (
                    id,
                    name,
                    slug
                )
            `)
            .single();

        if (updateError) {
            logError('Supabase error updating knowledge article', updateError);
            return NextResponse.json({ error: 'Ошибка обновления статьи' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(/^knowledge_articles/);
        invalidateCache(`knowledge_article_${id}`);
        invalidateCache(/^admin_knowledge/);

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'ARTICLE_UPDATED',
                entity_type: 'knowledge_article',
                entity_id: id,
                old_values: { title: existingArticle.title },
                new_values: { title: title.trim(), category: categoryData.slug },
                created_at: now
            });

        // Уведомляем автора об изменении (если есть и статус не менялся)
        if (existingArticle.author_id && existingArticle.is_published) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: existingArticle.author_id,
                    title: '📝 Статья обновлена',
                    message: `Ваша статья "${title.substring(0, 50)}" была обновлена администратором.`,
                    type: 'knowledge_article',
                    metadata: { article_id: id, article_title: title, action: 'updated' },
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('PUT', `/api/admin/knowledge/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin updated knowledge article`, { 
            articleId: id, 
            adminId: session.user.id,
            title: title.substring(0, 50),
            category: categoryData.slug
        });

        // Форматируем ответ
        const formattedArticle = {
            id: updatedArticle.id,
            title: updatedArticle.title,
            content: updatedArticle.content,
            excerpt: updatedArticle.content?.substring(0, 200),
            category_id: updatedArticle.category_id,
            category_name: updatedArticle.knowledge_categories?.name,
            category_slug: updatedArticle.knowledge_categories?.slug,
            tags: updatedArticle.tags || [],
            is_published: updatedArticle.is_published,
            views: updatedArticle.views || 0,
            created_at: updatedArticle.created_at,
            updated_at: updatedArticle.updated_at,
            author_id: updatedArticle.author_id
        };

        return NextResponse.json({ 
            success: true,
            message: 'Статья успешно обновлена',
            article: formattedArticle
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0]?.message || 'Ошибка валидации';
            return NextResponse.json({ error: firstError }, { status: 400 });
        }
        logError('Error updating knowledge article', error);
        return NextResponse.json({ error: 'Ошибка обновления статьи' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized knowledge article delete attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidId(id)) {
            return NextResponse.json({ error: 'Неверный формат ID статьи' }, { status: 400 });
        }

        // Проверяем существование статьи
        const { data: existingArticle, error: checkError } = await supabase
            .from('knowledge_articles')
            .select('id, title, author_id, category_id')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                logInfo('Knowledge article not found for delete', { articleId: id });
                return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
            }
            logError('Error checking knowledge article for delete', checkError);
            return NextResponse.json({ error: 'Ошибка проверки статьи' }, { status: 500 });
        }

        // Удаляем статью
        const { error: deleteError } = await supabase
            .from('knowledge_articles')
            .delete()
            .eq('id', id);

        if (deleteError) {
            logError('Supabase error deleting knowledge article', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления статьи' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(/^knowledge_articles/);
        invalidateCache(`knowledge_article_${id}`);
        invalidateCache(/^admin_knowledge/);
        invalidateCache(new RegExp(`knowledge_category_${existingArticle.category_id}`));

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'ARTICLE_DELETED',
                entity_type: 'knowledge_article',
                entity_id: id,
                old_values: { title: existingArticle.title },
                created_at: new Date().toISOString()
            });

        // Уведомляем автора об удалении
        if (existingArticle.author_id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: existingArticle.author_id,
                    title: '🗑️ Статья удалена',
                    message: `Ваша статья "${existingArticle.title.substring(0, 50)}" была удалена из базы знаний.`,
                    type: 'knowledge_article',
                    metadata: { article_id: id, article_title: existingArticle.title, action: 'deleted' },
                    created_at: new Date().toISOString(),
                    is_read: false
                });
        }

        logApiRequest('DELETE', `/api/admin/knowledge/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin deleted knowledge article`, { 
            articleId: id, 
            adminId: session.user.id,
            title: existingArticle.title.substring(0, 50)
        });

        return NextResponse.json({ 
            success: true, 
            message: 'Статья успешно удалена'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error deleting knowledge article', error);
        return NextResponse.json({ error: 'Ошибка удаления статьи' }, { status: 500 });
    }
}