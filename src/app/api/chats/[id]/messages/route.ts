import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { logError, logInfo, logApiRequest } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: z.string().datetime().optional(),
    after: z.string().datetime().optional()
});

const getLimiter = rateLimit({ limit: 120, windowMs: 60 * 1000 });
const postLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function checkChatAccess(chatId: string, userId: string): Promise<boolean> {
    const { data: participant, error } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .maybeSingle();

    return !error && !!participant;
}

async function uploadFile(file: File, chatId: string, userId: string): Promise<{ type: string; url: string } | null> {
    try {
        if (file.size > 10 * 1024 * 1024) return null;
        
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `chats/${chatId}/${userId}/${Date.now()}-${safeFileName}`;
        
        const { error } = await supabase.storage
            .from('chat-attachments')
            .upload(fileName, file);
            
        if (error) return null;
        
        const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
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
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                messages: []
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID чата' }, { status: 400 });
        }

        const hasAccess = await checkChatAccess(id, session.user.id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const validatedParams = querySchema.parse({
            limit: searchParams.get('limit'),
            before: searchParams.get('before'),
            after: searchParams.get('after')
        });
        
        const { limit, before, after } = validatedParams;

        const cacheKey = `chat_messages_${id}_${limit}_${before || ''}_${after || ''}`;
        
        const messages = await cachedQuery(cacheKey, async () => {
            let query = supabase
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
                    updated_at,
                    users!inner (
                        id,
                        email,
                        profiles!left (
                            full_name,
                            avatar_url
                        )
                    )
                `)
                .eq('chat_id', id)
                .eq('is_deleted', false);

            if (before) {
                query = query.lt('created_at', before);
            }
            if (after) {
                query = query.gt('created_at', after);
            }

            const { data: messagesData, error } = await query
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                logError('Error fetching messages', error);
                throw new Error('DATABASE_ERROR');
            }

            if (!messagesData) {
                return [];
            }

            const formattedMessages = messagesData.map(msg => ({
                id: msg.id,
                chat_id: msg.chat_id,
                sender_id: msg.sender_id,
                content: sanitize.text(msg.content || ''),
                is_read: msg.is_read,
                is_edited: msg.is_edited,
                attachments: msg.attachments || [],
                created_at: msg.created_at,
                updated_at: msg.updated_at,
                sender_name: sanitize.text(msg.users?.[0]?.profiles?.[0]?.full_name || msg.users?.[0]?.email),
                sender_avatar: msg.users?.[0]?.profiles?.[0]?.avatar_url
            }));

            return formattedMessages.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        }, 5);

        logApiRequest('GET', `/api/chats/${id}/messages`, 200, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            success: true,
            messages,
            meta: {
                count: messages.length,
                cached: Date.now() - startTime < 100
            }
        }, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: 'Неверные параметры запроса',
                details: error.issues.map(e => e.message),
                messages: []
            }, { status: 400 });
        }
        
        logError('Error fetching messages', error);
        return NextResponse.json({ 
            error: 'Ошибка загрузки сообщений',
            messages: []
        }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const rateLimitResult = postLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много сообщений. Попробуйте через минуту.'
            }, { status: 429 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID чата' }, { status: 400 });
        }

        const hasAccess = await checkChatAccess(id, session.user.id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        let content = '';
        let attachments = [];
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            content = (formData.get('content') as string) || '';
            const files = formData.getAll('attachments') as File[];
            
            const filesToUpload = files.slice(0, 5);
            
            for (const file of filesToUpload) {
                if (file.size > 0) {
                    const uploaded = await uploadFile(file, id, session.user.id);
                    if (uploaded) attachments.push(uploaded);
                }
            }
        } else {
            const body = await request.json();
            content = body.content || '';
            attachments = body.attachments || [];
        }

        const trimmedContent = content?.trim() || '';
        if (!trimmedContent && attachments.length === 0) {
            return NextResponse.json({ 
                error: 'Сообщение не может быть пустым' 
            }, { status: 400 });
        }

        if (trimmedContent.length > 5000) {
            return NextResponse.json({ 
                error: 'Сообщение не может превышать 5000 символов' 
            }, { status: 400 });
        }

        const now = new Date().toISOString();

        const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: id,
                sender_id: session.user.id,
                content: trimmedContent,
                attachments: attachments,
                is_read: false,
                is_edited: false,
                created_at: now,
                is_deleted: false
            })
            .select()
            .single();

        if (messageError) {
            logError('Error sending message', messageError);
            return NextResponse.json({ 
                error: 'Ошибка отправки сообщения' 
            }, { status: 500 });
        }

        await supabase
            .from('chats')
            .update({ 
                last_message_at: now,
                last_message_preview: trimmedContent.substring(0, 100) || 'Вложение',
                updated_at: now
            })
            .eq('id', id);

        await supabase.rpc('increment_unread_count', {
            p_chat_id: id,
            p_exclude_user_id: session.user.id
        });

        invalidateCache(new RegExp(`chat_messages_${id}`));
        invalidateCache(new RegExp(`user_chats_${session.user.id}`));
        
        logInfo('Message sent', {
            chatId: id,
            userId: session.user.id,
            messageId: newMessage.id,
            hasAttachments: attachments.length > 0
        });

        logApiRequest('POST', `/api/chats/${id}/messages`, 201, Date.now() - startTime, session.user.id);

        return NextResponse.json({
            id: newMessage.id,
            chat_id: newMessage.chat_id,
            sender_id: newMessage.sender_id,
            content: newMessage.content,
            attachments: newMessage.attachments,
            created_at: newMessage.created_at,
            sender_name: session.user.name || session.user.email,
            sender_avatar: session.user.image
        }, { status: 201 });
        
    } catch (error) {
        logError('Error sending message', error);
        return NextResponse.json({ 
            error: 'Ошибка отправки сообщения' 
        }, { status: 500 });
    }
}