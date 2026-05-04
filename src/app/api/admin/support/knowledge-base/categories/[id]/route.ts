// app/api/admin/knowledge/categories/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Rate limiting
const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Схема валидации ID (используем Zod)
const categoryIdSchema = z.object({
    id: z.coerce.number().int().positive('ID категории должен быть положительным числом')
});

// Защищенные категории (нельзя удалить)
const PROTECTED_CATEGORIES = ['general', 'tutorials', 'faq'];

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for knowledge category delete', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized knowledge category delete attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID через Zod
        const validatedId = categoryIdSchema.parse({ id: parseInt(id) });
        const categoryIdNum = validatedId.id;

        // Получаем информацию об удаляемой категории с санитизацией
        const { data: categoryToDelete, error: fetchError } = await supabase
            .from('knowledge_categories')
            .select('id, name, slug, description')
            .eq('id', categoryIdNum)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                logInfo('Knowledge category not found for delete', { categoryId: categoryIdNum });
                return NextResponse.json({ error: 'Категория не найдена' }, { status: 404 });
            }
            logError('Error fetching knowledge category', fetchError);
            return NextResponse.json({ error: 'Ошибка поиска категории' }, { status: 500 });
        }

        // Санитизация названия для безопасного вывода
        const safeCategoryName = sanitize.text(categoryToDelete.name);

        // Проверяем, не пытаемся ли удалить защищенную категорию
        if (PROTECTED_CATEGORIES.includes(categoryToDelete.slug)) {
            logInfo('Attempt to delete protected category', { 
                categoryId: categoryIdNum, 
                slug: categoryToDelete.slug 
            });
            return NextResponse.json({ 
                error: `Нельзя удалить защищенную категорию "${safeCategoryName}"`,
                protected_categories: PROTECTED_CATEGORIES
            }, { status: 400 });
        }

        // Находим или создаем категорию "general" по умолчанию
        let defaultId: number;
        
        const { data: defaultCategory, error: findError } = await supabase
            .from('knowledge_categories')
            .select('id, name, slug')
            .eq('slug', 'general')
            .maybeSingle();

        if (findError && findError.code !== 'PGRST116') {
            logError('Error finding default category', findError);
            return NextResponse.json({ error: 'Ошибка поиска категории по умолчанию' }, { status: 500 });
        }

        if (defaultCategory) {
            defaultId = defaultCategory.id;
        } else {
            // Создаем категорию по умолчанию с санитизацией
            const now = new Date().toISOString();
            const { data: newCategory, error: createError } = await supabase
                .from('knowledge_categories')
                .insert({
                    name: 'Общее',
                    slug: 'general',
                    description: 'Общие вопросы и статьи',
                    sort_order: 999,
                    is_active: true,
                    created_at: now,
                    updated_at: now
                })
                .select()
                .single();

            if (createError) {
                logError('Error creating default category', createError);
                return NextResponse.json({ error: 'Ошибка создания категории по умолчанию' }, { status: 500 });
            }
            
            defaultId = newCategory.id;
            logInfo('Created default knowledge category', { defaultId });
        }

        // Проверяем, есть ли статьи в удаляемой категории
        const { count: articlesCount, error: countError } = await supabase
            .from('knowledge_articles')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', categoryIdNum);

        if (countError) {
            logError('Error counting articles in category', countError);
            return NextResponse.json({ error: 'Ошибка подсчёта статей' }, { status: 500 });
        }

        const now = new Date().toISOString();

        // Переносим все статьи из удаляемой категории в категорию по умолчанию
        if (articlesCount && articlesCount > 0) {
            const { error: updateError } = await supabase
                .from('knowledge_articles')
                .update({ 
                    category_id: defaultId,
                    updated_at: now
                })
                .eq('category_id', categoryIdNum);

            if (updateError) {
                logError('Error moving articles to default category', updateError);
                return NextResponse.json({ error: 'Ошибка переноса статей' }, { status: 500 });
            }

            // Логируем перенос статей с санитизацией
            await supabase
                .from('audit_logs')
                .insert({
                    user_id: session.user.id,
                    action: 'ARTICLES_MOVED',
                    entity_type: 'knowledge_category',
                    entity_id: String(categoryIdNum),
                    new_values: { 
                        from_category: safeCategoryName,
                        to_category: defaultCategory?.name ? sanitize.text(defaultCategory.name) : 'Общее',
                        articles_count: articlesCount
                    },
                    created_at: now
                });
        }

        // Удаляем категорию
        const { error: deleteError } = await supabase
            .from('knowledge_categories')
            .delete()
            .eq('id', categoryIdNum);

        if (deleteError) {
            logError('Error deleting knowledge category', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
        }

        // Инвалидируем кэши
        invalidateCache(/^knowledge_categories/);
        invalidateCache(/^admin_knowledge/);
        invalidateCache(new RegExp(`knowledge_category_${categoryIdNum}`));

        // Логируем удаление категории с санитизацией
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'KNOWLEDGE_CATEGORY_DELETED',
                entity_type: 'knowledge_category',
                entity_id: String(categoryIdNum),
                old_values: { 
                    name: safeCategoryName, 
                    slug: categoryToDelete.slug,
                    articles_moved: articlesCount || 0
                },
                created_at: now
            });

        logApiRequest('DELETE', `/api/admin/knowledge/categories/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin deleted knowledge category`, { 
            categoryId: categoryIdNum,
            adminId: session.user.id,
            name: safeCategoryName,
            articlesMoved: articlesCount || 0
        });

        const defaultCategoryName = defaultCategory?.name ? sanitize.text(defaultCategory.name) : 'Общее';
        const message = articlesCount && articlesCount > 0 
            ? `Категория "${safeCategoryName}" удалена. ${articlesCount} ${getArticlesDeclension(articlesCount)} перенесено в категорию "${defaultCategoryName}"`
            : `Категория "${safeCategoryName}" успешно удалена`;

        return NextResponse.json({ 
            success: true,
            message,
            data: {
                deleted_category: {
                    id: categoryIdNum,
                    name: safeCategoryName,
                    slug: categoryToDelete.slug
                },
                moved_articles: articlesCount || 0,
                default_category_id: defaultId
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error deleting knowledge category', error);
        return NextResponse.json({ error: 'Ошибка удаления категории' }, { status: 500 });
    }
}

// Вспомогательная функция для склонения слова "статья"
function getArticlesDeclension(count: number): string {
    if (count % 10 === 1 && count % 100 !== 11) return 'статья';
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'статьи';
    return 'статей';
}