import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";
import { notifyNewMessage, notifyTicketUpdate } from "@/lib/websocket-server";

const sendMessageSchema = z.object({
    content: z.string().max(5000, 'Сообщение не может превышать 5000 символов').optional(),
});

const getLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function uploadFile(file: File, ticketId: string): Promise<{ type: string; url: string } | null> {
    try {
        if (file.size > 10 * 1024 * 1024) return null;
        
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `support/${ticketId}/${Date.now()}-${safeFileName}`;
        
        const { error } = await supabase.storage
            .from('support-attachments')
            .upload(fileName, file);
            
        if (error) return null;
        
        const { data: { publicUrl } } = supabase.storage
            .from('support-attachments')
            .getPublicUrl(fileName);
            
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        return { type: fileType, url: publicUrl };
    } catch {
        return null;
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id, status, user_id')
            .eq('id', id)
            .single();

        if (ticketError) {
            if (ticketError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
            }
            logError('Error fetching ticket', ticketError);
            return NextResponse.json({ error: 'Ошибка загрузки тикета' }, { status: 500 });
        }

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
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (messagesError) {
            logError('Error fetching messages', messagesError);
            return NextResponse.json({ error: 'Ошибка загрузки сообщений' }, { status: 500 });
        }

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

        logApiRequest('GET', `/api/admin/support/tickets/${id}/messages`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json(formattedMessages, { status: 200 });
        
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
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.' 
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id, user_id, status')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
        }

        let content = '';
        const attachments = [];
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            content = (formData.get('content') as string) || '';
            const files = formData.getAll('attachments') as File[];
            
            if (files.length > 5) {
                return NextResponse.json({ error: 'Можно прикрепить не более 5 файлов' }, { status: 400 });
            }
            
            for (const file of files) {
                if (file.size > 0) {
                    if (file.size > 10 * 1024 * 1024) {
                        return NextResponse.json({ 
                            error: `Файл "${file.name}" превышает лимит в 10MB` 
                        }, { status: 400 });
                    }
                    const uploaded = await uploadFile(file, id);
                    if (uploaded) attachments.push(uploaded);
                }
            }
        } else {
            const body = await request.json();
            const validatedData = sendMessageSchema.parse(body);
            content = validatedData.content || '';
        }

        const trimmedContent = content?.trim() || '';
        if (!trimmedContent && attachments.length === 0) {
            return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
        }

        const now = new Date().toISOString();
        const sanitizedContent = sanitize.text(trimmedContent);

        const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: ticket.chat_id,
                sender_id: session.user.id,
                content: sanitizedContent,
                attachments: attachments,
                created_at: now,
                is_read: false,
                is_deleted: false
            })
            .select()
            .single();

        if (messageError) {
            logError('Error sending support message', messageError);
            return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
        }

        await supabase
            .from('chats')
            .update({
                last_message_preview: sanitizedContent.substring(0, 100) || 'Вложение',
                last_message_at: now,
                updated_at: now
            })
            .eq('id', ticket.chat_id);

        await supabase
            .from('chat_participants')
            .update({ unread_count: supabase.rpc('increment', { row_id: 'unread_count', amount: 1 }) })
            .eq('chat_id', ticket.chat_id)
            .neq('user_id', session.user.id);

        let ticketStatus = ticket.status;
        if (ticket.status === 'open') {
            ticketStatus = 'in_progress';
            await supabase
                .from('support_tickets')
                .update({ status: 'in_progress', updated_at: now })
                .eq('id', id);
        }

        await supabase
            .from('notifications')
            .insert({
                user_id: ticket.user_id,
                title: 'Новое сообщение в поддержке',
                message: `Администратор ответил на ваше обращение: ${sanitizedContent.substring(0, 100)}${sanitizedContent.length > 100 ? '...' : ''}`,
                type: 'support',
                metadata: { ticket_id: id, message_id: newMessage.id },
                created_at: now,
                is_read: false
            });

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

        invalidateCache(new RegExp(`chat_messages_${ticket.chat_id}`));
        invalidateCache(/^admin_tickets/);
        invalidateCache(`support_ticket_${id}`);
        invalidateCache(new RegExp(`user_chats_${ticket.user_id}`));

        // WebSocket уведомления
        await notifyNewMessage(ticket.chat_id, {
                id: newMessage.id,
                chat_id: newMessage.chat_id,
                sender_id: newMessage.sender_id,
                content: newMessage.content,
                attachments: newMessage.attachments,
                created_at: newMessage.created_at,
                sender_name: session.user.name || session.user.email || 'Администратор',
                sender_avatar: session.user.image || null,
                sender_role: 'admin',
            });
        
        await notifyTicketUpdate(id, {
            status: ticketStatus,
            last_message: sanitizedContent.substring(0, 100),
            last_message_time: now,
            updated_at: now
        });

        logApiRequest('POST', `/api/admin/support/tickets/${id}/messages`, 201, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            id: newMessage.id,
            chat_id: newMessage.chat_id,
            sender_id: newMessage.sender_id,
            content: newMessage.content,
            attachments: attachments,
            created_at: newMessage.created_at,
            sender_name: session.user.name || session.user.email,
            sender_avatar: session.user.image,
            sender_role: 'admin'
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 });
        }
        logError('Error sending support message', error);
        return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
    }
}