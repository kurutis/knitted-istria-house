// app/api/admin/support/knowledge-base/articles/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации
const publishArticleSchema = z.object({
    is_published: z.boolean(),
});

// Rate limiting для административных действий
const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

// Валидация ID
function isValidId(id: string): boolean {
    return /^\d+$/.test(id);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting - передаем request
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for knowledge article publish', { ip: getClientIP(request) });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized knowledge article publish attempt', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID
        if (!id || !isValidId(id)) {
            return NextResponse.json({ error: 'Неверный формат ID статьи' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = publishArticleSchema.parse({
            is_published: body.is_published
        });

        const { is_published } = validatedData;

        // Проверяем существование статьи
        const { data: existingArticle, error: checkError } = await supabase
            .from('knowledge_articles')
            .select('id, title, is_published, category_id, author_id, slug')
            .eq('id', id)
            .single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                logInfo('Knowledge article not found', { articleId: id });
                return NextResponse.json({ error: 'Статья не найдена' }, { status: 404 });
            }
            logError('Error checking knowledge article', checkError);
            return NextResponse.json({ error: 'Ошибка проверки статьи' }, { status: 500 });
        }

        // Предотвращение повторных действий
        if (existingArticle.is_published === is_published) {
            return NextResponse.json({ 
                error: is_published ? 'Статья уже опубликована' : 'Статья уже снята с публикации' 
            }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Обновляем статус публикации статьи
        const { data: article, error: updateError } = await supabase
            .from('knowledge_articles')
            .update({
                is_published: is_published,
                updated_at: now,
                ...(is_published && { published_at: now })
            })
            .eq('id', id)
            .select('id, title, is_published, slug')
            .single();

        if (updateError) {
            logError('Supabase error updating knowledge article', updateError);
            return NextResponse.json({ error: 'Ошибка изменения статуса' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(/^knowledge_articles/);
        invalidateCache(`knowledge_article_${id}`);
        invalidateCache(/^admin_knowledge/);

        // Логируем действие администратора
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: is_published ? 'ARTICLE_PUBLISHED' : 'ARTICLE_UNPUBLISHED',
                entity_type: 'knowledge_article',
                entity_id: id,
                old_values: { is_published: existingArticle.is_published },
                new_values: { is_published: is_published },
                created_at: now
            });

        // Отправляем уведомление автору
        if (existingArticle.author_id) {
            const notificationTitle = is_published 
                ? '📖 Статья опубликована в базе знаний'
                : '📚 Статья снята с публикации';
            
            const notificationMessage = is_published 
                ? `Ваша статья "${existingArticle.title}" успешно опубликована в базе знаний.`
                : `Ваша статья "${existingArticle.title}" была снята с публикации. Обратитесь к администратору для получения дополнительной информации.`;

            await supabase
                .from('notifications')
                .insert({
                    user_id: existingArticle.author_id,
                    title: notificationTitle,
                    message: notificationMessage,
                    type: 'knowledge_article',
                    metadata: { 
                        article_id: id,
                        article_title: existingArticle.title, 
                        is_published: is_published,
                        slug: article.slug
                    },
                    created_at: now,
                    is_read: false
                });
        }

        logApiRequest('PUT', `/api/admin/knowledge/${id}/publish`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin ${is_published ? 'published' : 'unpublished'} knowledge article`, { 
            articleId: id,
            adminId: session.user.id,
            articleTitle: existingArticle.title,
            authorId: existingArticle.author_id
        });

        return NextResponse.json({ 
            success: true,
            message: is_published ? 'Статья успешно опубликована' : 'Статья снята с публикации',
            article: {
                id: article.id,
                title: sanitize.text(article.title),
                is_published: article.is_published,
                slug: article.slug
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstError = error.issues[0]?.message || 'Ошибка валидации';
            return NextResponse.json({ error: firstError }, { status: 400 });
        }
        logError('Error toggling knowledge article publish', error);
        return NextResponse.json({ error: 'Ошибка изменения статуса' }, { status: 500 });
    }
}