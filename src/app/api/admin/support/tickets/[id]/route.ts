// app/api/admin/support/messages/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

// Схема валидации для PUT запроса
const updateMessageSchema = z.object({
    content: z.string().min(1, 'Сообщение не может быть пустым').max(5000, 'Сообщение не может превышать 5000 символов'),
});

// Rate limiting
const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

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
            logInfo('Rate limit exceeded for ticket message delete', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized ticket message delete attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID сообщения
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 });
        }

        // Проверяем существование сообщения
        const { data: message, error: findError } = await supabase
            .from('messages')
            .select('sender_id, chat_id, content, created_at')
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                logInfo('Message not found for admin delete', { messageId: id });
                return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
            }
            logError('Error finding message for admin delete', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        // Админ может удалять любые сообщения (не только свои)
        // Для аудита сохраняем информацию
        const safeContentPreview = sanitize.text(message.content?.substring(0, 100) || '');

        // Удаляем сообщение (мягкое удаление)
        const { error: deleteError } = await supabase
            .from('messages')
            .update({
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                deleted_by: session.user.id,
                content: null,
                attachments: null
            })
            .eq('id', id);

        if (deleteError) {
            logError('Error deleting message', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
        }

        // Инвалидируем кэш чата
        invalidateCache(new RegExp(`chat_messages_${message.chat_id}`));
        invalidateCache(new RegExp(`support_ticket_${message.chat_id}`));

        // Логируем действие администратора
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'SUPPORT_MESSAGE_DELETED',
                entity_type: 'message',
                entity_id: id,
                old_values: { 
                    chat_id: message.chat_id, 
                    content_preview: safeContentPreview,
                    sender_id: message.sender_id,
                    created_at: message.created_at
                },
                created_at: new Date().toISOString()
            });

        logApiRequest('DELETE', `/api/admin/support/messages/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin deleted support message`, { 
            messageId: id, 
            adminId: session.user.id,
            chatId: message.chat_id,
            originalSenderId: message.sender_id
        });

        // Уведомляем получателя (если сообщение было отправлено пользователю)
        if (message.sender_id !== session.user.id) {
            await supabase
                .from('notifications')
                .insert({
                    user_id: message.sender_id,
                    title: '🗑️ Сообщение удалено',
                    message: 'Ваше сообщение в обращении было удалено администратором.',
                    type: 'support_ticket',
                    metadata: { message_id: id, chat_id: message.chat_id },
                    created_at: new Date().toISOString(),
                    is_read: false
                });
        }

        return NextResponse.json({ 
            success: true,
            message: 'Сообщение успешно удалено'
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error deleting support message', error);
        return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for ticket message update', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized ticket message update attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID сообщения
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 });
        }

        const body = await request.json();
        
        // Валидация входных данных
        const validatedData = updateMessageSchema.parse({
            content: body.content
        });
        const { content } = validatedData;
        const sanitizedContent = sanitize.text(content.trim());

        // Проверяем существование сообщения
        const { data: message, error: findError } = await supabase
            .from('messages')
            .select('sender_id, chat_id, content, created_at, is_deleted')
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                logInfo('Message not found for admin update', { messageId: id });
                return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
            }
            logError('Error finding message for admin update', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        // Проверяем, не удалено ли сообщение
        if (message.is_deleted) {
            return NextResponse.json({ error: 'Нельзя редактировать удалённое сообщение' }, { status: 400 });
        }

        // Сохраняем старый контент для аудита
        const oldContentPreview = sanitize.text(message.content?.substring(0, 100) || '');

        const now = new Date().toISOString();

        // Обновляем сообщение
        const { data: updatedMessage, error: updateError } = await supabase
            .from('messages')
            .update({
                content: sanitizedContent,
                is_edited: true,
                edited_at: now,
                edited_by: session.user.id
            })
            .eq('id', id)
            .select('id, chat_id, sender_id, content, is_read, is_edited, created_at, updated_at, edited_at, attachments')
            .single();

        if (updateError) {
            logError('Error updating message', updateError);
            return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
        }

        // Инвалидируем кэш чата
        invalidateCache(new RegExp(`chat_messages_${message.chat_id}`));

        // Логируем редактирование
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'SUPPORT_MESSAGE_EDITED',
                entity_type: 'message',
                entity_id: id,
                old_values: { content_preview: oldContentPreview },
                new_values: { content_preview: sanitizedContent.substring(0, 100) },
                created_at: now
            });

        logApiRequest('PUT', `/api/admin/support/messages/${id}`, 200, Date.now() - startTime, session.user.id);
        logInfo(`Admin edited support message`, { 
            messageId: id, 
            adminId: session.user.id,
            chatId: message.chat_id,
            originalSenderId: message.sender_id,
            contentLength: sanitizedContent.length
        });

        // Получаем информацию об отправителе для ответа
        const { data: senderInfo } = await supabase
            .from('users')
            .select('email, profiles!left (full_name, avatar_url)')
            .eq('id', session.user.id)
            .single();

        const senderName = senderInfo?.profiles?.[0]?.full_name || senderInfo?.email || session.user.email;
    const senderAvatar = senderInfo?.profiles?.[0]?.avatar_url || null;

        return NextResponse.json({
            success: true,
            message: 'Сообщение успешно обновлено',
            data: {
                ...updatedMessage,
                sender_name: sanitize.text(senderName),
                sender_avatar: senderAvatar,
                sender_role: 'admin'
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error updating support message', error);
        return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
    }
}