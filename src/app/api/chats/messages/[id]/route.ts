import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";

// Простая валидация UUID без Zod
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

function validateMessageContent(content: string): { valid: boolean; error?: string } {
    if (!content || !content.trim()) {
        return { valid: false, error: 'Сообщение не может быть пустым' };
    }
    if (content.length > 5000) {
        return { valid: false, error: 'Сообщение не может превышать 5000 символов' };
    }
    return { valid: true };
}

// Rate limiting
const deleteLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });
const updateLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

// DELETE - удалить сообщение
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = deleteLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Валидация ID
        const { id } = await params;
        if (!isValidUUID(id)) {
            return NextResponse.json({ 
                error: 'Неверный формат ID сообщения' 
            }, { status: 400 });
        }

        // Получаем информацию о сообщении
        const { data: message, error: findError } = await supabase
            .from('messages')
            .select(`
                id,
                sender_id,
                chat_id,
                created_at
            `)
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
            }
            logError('Error finding message for delete', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        // Проверяем права
        if (message.sender_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Мягкое удаление
        const { error: deleteError } = await supabase
            .from('messages')
            .update({ 
                is_deleted: true,
                content: null,
                attachments: null,
                deleted_at: new Date().toISOString(),
                deleted_by: session.user.id
            })
            .eq('id', id);

        if (deleteError) {
            logError('Error deleting message', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`chat_messages_${message.chat_id}`));

        logInfo('Message deleted', {
            messageId: id,
            chatId: message.chat_id,
            userId: session.user.id
        });

        return NextResponse.json({ 
            success: true,
            message: 'Сообщение удалено'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in message delete', error);
        return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
    }
}

// PUT - редактировать сообщение
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = updateLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        // Валидация ID
        const { id } = await params;
        if (!isValidUUID(id)) {
            return NextResponse.json({ 
                error: 'Неверный формат ID сообщения' 
            }, { status: 400 });
        }

        // Валидация тела запроса
        const body = await request.json();
        const content = body?.content;
        
        const contentValidation = validateMessageContent(content);
        if (!contentValidation.valid) {
            return NextResponse.json({ 
                error: contentValidation.error 
            }, { status: 400 });
        }

        const trimmedContent = content.trim();

        // Получаем информацию о сообщении
        const { data: message, error: findError } = await supabase
            .from('messages')
            .select(`
                id,
                sender_id,
                chat_id,
                created_at,
                is_deleted
            `)
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
            }
            logError('Error finding message for update', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        // Проверки
        if (message.is_deleted) {
            return NextResponse.json({ error: 'Нельзя редактировать удаленное сообщение' }, { status: 400 });
        }

        if (message.sender_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обновляем сообщение
        const { data: updatedMessage, error: updateError } = await supabase
            .from('messages')
            .update({
                content: trimmedContent,
                is_edited: true,
                edited_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                id,
                chat_id,
                sender_id,
                content,
                is_read,
                is_edited,
                edited_at,
                attachments,
                created_at,
                users!inner (
                    id,
                    email,
                    profiles!left (
                        full_name,
                        avatar_url
                    )
                )
            `)
            .single();

        if (updateError) {
            logError('Error updating message', updateError);
            return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
        }

        // Инвалидируем кэш
        invalidateCache(new RegExp(`chat_messages_${updatedMessage.chat_id}`));

        // Форматируем ответ
        const formattedMessage = {
            id: updatedMessage.id,
            chat_id: updatedMessage.chat_id,
            sender_id: updatedMessage.sender_id,
            content: updatedMessage.content,
            is_read: updatedMessage.is_read,
            is_edited: updatedMessage.is_edited,
            edited_at: updatedMessage.edited_at,
            attachments: updatedMessage.attachments || [],
            created_at: updatedMessage.created_at,
            sender_name: updatedMessage.users?.[0]?.profiles?.[0]?.full_name || updatedMessage.users?.[0]?.email,
            sender_avatar: updatedMessage.users?.[0]?.profiles?.[0]?.avatar_url
        };

        return NextResponse.json(formattedMessage, { status: 200 });
        
    } catch (error) {
        logError('Error in message update', error);
        return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
    }
}