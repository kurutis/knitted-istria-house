// app/api/admin/support/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

interface TicketUpdateData {
    updated_at: string
    status?: string
}

// Схема валидации для POST запроса
const sendMessageSchema = z.object({
    content: z.string().max(5000, 'Сообщение не может превышать 5000 символов').optional(),
});

// Rate limiting
const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

// Валидация UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized admin support messages access', { ip: getClientIP(request) });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        // Rate limiting
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        // Валидация ID тикета
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        // Сначала получаем chat_id тикета
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id, status, user_id')
            .eq('id', id)
            .single();

        if (ticketError) {
            if (ticketError.code === 'PGRST116') {
                logInfo('Support ticket not found', { ticketId: id });
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket', ticketError);
            return NextResponse.json({ error: 'Ошибка загрузки тикета' }, { status: 500 });
        }

        // Получаем все сообщения чата
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select(`
                id,
                chat_id,
                sender_id,
                content,
                is_read,
                is_edited,
                attachments,
                created_at,
                edited_at,
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
            .eq('chat_id', ticket.chat_id)
            .order('created_at', { ascending: true });

        if (messagesError) {
            logError('Error fetching messages', messagesError);
            return NextResponse.json({ error: 'Ошибка загрузки сообщений' }, { status: 500 });
        }

        // Форматируем сообщения с санитизацией
        const formattedMessages = messages?.map(msg => ({
            id: msg.id,
            chat_id: msg.chat_id,
            sender_id: msg.sender_id,
            content: sanitize.text(msg.content || ''),
            is_read: msg.is_read,
            is_edited: msg.is_edited,
            attachments: msg.attachments || [],
            created_at: msg.created_at,
            edited_at: msg.edited_at,
            sender_name: sanitize.text(msg.users?.[0]?.profiles?.[0]?.full_name || msg.users?.[0]?.email),
            sender_avatar: msg.users?.[0]?.profiles?.[0]?.avatar_url,
            sender_role: msg.users?.[0]?.role
        })) || [];

        logApiRequest('GET', `/api/admin/support/${id}/messages`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(formattedMessages, {
            status: 200,
            headers: {
                'Cache-Control': 'private, max-age=5',
                'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '30',
                'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '30'
            }
        });
        
    } catch (error) {
        logError('Error fetching support messages', error);
        return NextResponse.json({ error: 'Ошибка загрузки сообщений' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        // Rate limiting
        const ip = getClientIP(request);
        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            logInfo('Rate limit exceeded for admin support message', { ip });
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            logInfo('Unauthorized admin support message attempt', { ip });
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        // Валидация ID тикета
        if (!id || !isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        let content = '';
        const attachments: { type: string; url: string }[] = [];
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            content = (formData.get('content') as string) || '';
            const files = formData.getAll('attachments') as File[];
            
            // Ограничение на количество файлов
            if (files.length > 5) {
                return NextResponse.json({ error: 'Можно прикрепить не более 5 файлов' }, { status: 400 });
            }
            
            // Загружаем файлы
            for (const file of files) {
                if (file && file.size > 0) {
                    if (file.size > 10 * 1024 * 1024) {
                        return NextResponse.json({ 
                            error: `Файл "${file.name}" превышает лимит в 10MB` 
                        }, { status: 400 });
                    }
                    
                    const fileExt = file.name.split('.').pop();
                    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const fileName = `${id}/${Date.now()}-${safeFileName}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('support')
                        .upload(fileName, file);

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('support')
                            .getPublicUrl(fileName);
                        
                        const fileType = file.type.startsWith('image/') ? 'image' : 
                                       file.type.startsWith('video/') ? 'video' : 'file';
                        attachments.push({
                            type: fileType,
                            url: publicUrl
                        });
                    } else {
                        logError('File upload error', uploadError, 'warning');
                    }
                }
            }
        } else {
            const body = await request.json();
            content = body.content || '';
        }

        // Валидация содержимого
        const trimmedContent = content?.trim() || '';
        if (!trimmedContent && attachments.length === 0) {
            return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
        }

        // Валидация через Zod
        const validatedData = sendMessageSchema.parse({ content: trimmedContent });
        const finalContent = validatedData.content || '';

        // Получаем информацию о тикете
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id, status, user_id')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) {
            logInfo('Support ticket not found for message', { ticketId: id });
            return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
        }

        const now = new Date().toISOString();
        const sanitizedContent = sanitize.text(finalContent);

        // Создаём сообщение
        const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: ticket.chat_id,
                sender_id: session.user.id,
                content: sanitizedContent,
                attachments: attachments,
                created_at: now,
                is_read: false
            })
            .select()
            .single();

        if (messageError) {
            logError('Error sending support message', messageError);
            return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
        }

        // Обновляем статус тикета
        const updateData: TicketUpdateData = { updated_at: now };
        if (ticket.status === 'open') {
            updateData.status = 'in_progress';
        }

        await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', id);

        // Инвалидируем кэш
        invalidateCache(new RegExp(`chat_messages_${ticket.chat_id}`));
        invalidateCache(new RegExp(`admin_support_tickets`));

        // Отправляем уведомление пользователю
        await supabase
            .from('notifications')
            .insert({
                user_id: ticket.user_id,
                title: 'Новое сообщение в поддержке',
                message: `Администратор ответил на ваш запрос: ${sanitizedContent.substring(0, 100)}${sanitizedContent.length > 100 ? '...' : ''}`,
                type: 'support_ticket',
                metadata: { ticket_id: id, message_id: newMessage.id },
                created_at: now,
                is_read: false
            });

        // Логируем действие
        await supabase
            .from('audit_logs')
            .insert({
                user_id: session.user.id,
                action: 'SUPPORT_MESSAGE_SENT',
                entity_type: 'support_ticket',
                entity_id: id,
                new_values: { 
                    message_preview: sanitizedContent.substring(0, 100),
                    attachments_count: attachments.length
                },
                created_at: now
            });

        logApiRequest('POST', `/api/admin/support/${id}/messages`, 201, Date.now() - startTime, session.user.id);
        logInfo(`Admin sent support message`, { 
            ticketId: id, 
            adminId: session.user.id,
            userId: ticket.user_id,
            hasAttachments: attachments.length > 0,
            messageLength: sanitizedContent.length
        });

        return NextResponse.json({
            success: true,
            message: 'Сообщение отправлено',
            data: {
                id: newMessage.id,
                chat_id: newMessage.chat_id,
                sender_id: newMessage.sender_id,
                content: newMessage.content,
                attachments: attachments,
                created_at: newMessage.created_at,
                sender_name: session.user.name || session.user.email,
                sender_avatar: session.user.image || null,
                sender_role: 'admin'
            }
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error sending support message', error);
        return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
    }
}