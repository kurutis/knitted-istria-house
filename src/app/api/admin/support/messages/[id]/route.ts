import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";
import { notifyMessageEdit, notifyMessageDelete } from "@/lib/websocket-server";

const updateMessageSchema = z.object({
    content: z.string().min(1, 'Сообщение не может быть пустым').max(5000, 'Сообщение не может превышать 5000 символов'),
});

const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 });
        }

        const body = await request.json();
        const validatedData = updateMessageSchema.parse({ content: body.content });
        const { content } = validatedData;
        const sanitizedContent = sanitize.text(content.trim());

        const { data: message, error: findError } = await supabase
            .from('messages')
            .select('sender_id, chat_id, content, created_at, is_deleted')
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
            }
            logError('Error finding message for admin edit', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        if (message.is_deleted) {
            return NextResponse.json({ error: 'Нельзя редактировать удаленное сообщение' }, { status: 400 });
        }

        const { data: updatedMessage, error: updateError } = await supabase
            .from('messages')
            .update({
                content: sanitizedContent,
                is_edited: true,
                edited_at: new Date().toISOString(),
                edited_by: session.user.id
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
                    role,
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

        invalidateCache(new RegExp(`chat_messages_${message.chat_id}`));

        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'MESSAGE_EDITED_BY_ADMIN',
                entity_type: 'message',
                entity_id: id,
                old_values: { content_preview: sanitize.text(message.content?.substring(0, 100) || '') },
                new_values: { content_preview: sanitizedContent.substring(0, 100) },
                created_at: new Date().toISOString()
            });

        await notifyMessageEdit(message.chat_id, {
            id: updatedMessage.id,
            chat_id: updatedMessage.chat_id,
            sender_id: updatedMessage.sender_id,
            content: updatedMessage.content,
            attachments: updatedMessage.attachments || [],
            created_at: updatedMessage.created_at,
            sender_name: session.user.name || session.user.email || 'Администратор',
            sender_avatar: session.user.image || null,
            sender_role: 'admin',
        });

        logApiRequest('PUT', `/api/admin/support/messages/${id}`, 200, Date.now() - startTime, session.user.id);

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
            sender_name: sanitize.text(updatedMessage.users?.[0]?.profiles?.[0]?.full_name || updatedMessage.users?.[0]?.email),
            sender_avatar: updatedMessage.users?.[0]?.profiles?.[0]?.avatar_url,
            sender_role: updatedMessage.users?.[0]?.role
        };

        return NextResponse.json(formattedMessage, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error in admin message edit', error);
        return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
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
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 });
        }

        const { data: message, error: findError } = await supabase
            .from('messages')
            .select('sender_id, chat_id, content, created_at')
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
            }
            logError('Error finding message for admin delete', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

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

        invalidateCache(new RegExp(`chat_messages_${message.chat_id}`));

        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'MESSAGE_DELETED_BY_ADMIN',
                entity_type: 'message',
                entity_id: id,
                old_values: { 
                    chat_id: message.chat_id, 
                    content_preview: sanitize.text(message.content?.substring(0, 100) || ''),
                    sender_id: message.sender_id,
                    created_at: message.created_at
                },
                created_at: new Date().toISOString()
            });

        await notifyMessageDelete(message.chat_id, id, session.user.id);

        logApiRequest('DELETE', `/api/admin/support/messages/${id}`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({ 
            success: true, 
            message: 'Сообщение успешно удалено'
        }, { status: 200 });
        
    } catch (error) {
        logError('Error in admin message delete', error);
        return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
    }
}