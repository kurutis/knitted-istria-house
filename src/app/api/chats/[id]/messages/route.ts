import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { cachedQuery, invalidateCache } from "@/lib/db-optimized";
import { logError, logInfo } from "@/lib/error-logger";
import { z } from "zod";

// Схема валидации
const messageSchema = z.object({
    content: z.string().max(5000, 'Сообщение не может превышать 5000 символов').optional(),
    attachments: z.array(z.object({
        type: z.enum(['image', 'video', 'file']),
        url: z.string().url()
    })).max(10, 'Максимум 10 вложений').optional()
});

const querySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: z.string().datetime().optional(),
    after: z.string().datetime().optional()
});

// Rate limiting для чатов (менее строгий для GET, строже для POST)
const getLimiter = rateLimit({ limit: 120, windowMs: 60 * 1000 }); // 120 запросов/минуту
const postLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 сообщений/минуту

// GET - получить сообщения чата
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

        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitResult = getLimiter(request);
        if (!rateLimitResult.success) {
            return NextResponse.json({ 
                error: 'Слишком много запросов. Попробуйте через минуту.',
                messages: []
            }, { status: 429 });
        }

        const { id } = await params;
        
        // Валидация UUID
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID чата' }, { status: 400 });
        }

        // Парсим query параметры
        const { searchParams } = new URL(request.url);
        const validatedParams = querySchema.parse({
            limit: searchParams.get('limit'),
            before: searchParams.get('before'),
            after: searchParams.get('after')
        });
        
        const { limit, before, after } = validatedParams;

        // Проверяем доступ к чату (кэшируем)
        const hasAccess = await checkChatAccess(id, session.user.id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Кэшируем сообщения на короткое время (5 секунд для чата)
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
                .eq('chat_id', id);

            // Пагинация по времени
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

            // Форматируем и сортируем в хронологическом порядке
            const formattedMessages = messagesData.map(msg => ({
                id: msg.id,
                chat_id: msg.chat_id,
                sender_id: msg.sender_id,
                content: msg.content,
                is_read: msg.is_read,
                is_edited: msg.is_edited,
                attachments: msg.attachments || [],
                created_at: msg.created_at,
                updated_at: msg.updated_at,
                sender_name: msg.users?.[0]?.profiles?.[0]?.full_name || msg.users?.[0]?.email,
                sender_avatar: msg.users?.[0]?.profiles?.[0]?.avatar_url
            }));

            return formattedMessages.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        });

        // Отмечаем сообщения как прочитанные (асинхронно)
        markMessagesAsRead(id, session.user.id).catch(err => 
            logError('Failed to mark messages as read', err, 'warning')
        );

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

// POST - отправить сообщение
export async function POST(
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

        // Проверяем доступ к чату
        const hasAccess = await checkChatAccess(id, session.user.id);
        if (!hasAccess) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обрабатываем входящие данные (поддерживаем как FormData, так и JSON)
        let content = '';
        let attachments: { type: string; url: string }[] = [];

        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            content = (formData.get('content') as string) || '';
            const files = formData.getAll('attachments') as File[];
            
            // Ограничиваем количество файлов
            const filesToUpload = files.slice(0, 10);
            
            // Загружаем файлы параллельно
            const uploadPromises = filesToUpload.map(file => 
                uploadFileToStorage(file, id, session.user.id)
            );
            
            const uploadResults = await Promise.all(uploadPromises);
            attachments = uploadResults.filter(result => result !== null) as { type: string; url: string }[];
            
        } else {
            const body = await request.json();
            const validatedData = messageSchema.parse(body);
            content = validatedData.content || '';
            attachments = validatedData.attachments || [];
        }

        // Валидация содержимого
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

        // Создаем сообщение
        const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: id,
                sender_id: session.user.id,
                content: trimmedContent,
                attachments: attachments,
                is_read: false,
                is_edited: false,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (messageError) {
            logError('Error sending message', messageError);
            return NextResponse.json({ 
                error: 'Ошибка отправки сообщения' 
            }, { status: 500 });
        }

        // Обновляем время последнего сообщения в чате
        await supabase
            .from('chats')
            .update({ 
                last_message_at: new Date().toISOString(),
                last_message_preview: trimmedContent.substring(0, 100)
            })
            .eq('id', id);

        // Инвалидируем кэш сообщений
        invalidateCache(new RegExp(`chat_messages_${id}`));
        
        // Логируем отправку
        logInfo('Message sent', {
            chatId: id,
            userId: session.user.id,
            messageId: newMessage.id,
            hasAttachments: attachments.length > 0
        });

        return NextResponse.json({
            success: true,
            message: {
                id: newMessage.id,
                chat_id: newMessage.chat_id,
                sender_id: newMessage.sender_id,
                content: newMessage.content,
                is_read: newMessage.is_read,
                is_edited: newMessage.is_edited,
                attachments: newMessage.attachments,
                created_at: newMessage.created_at,
                sender_name: session.user.name || session.user.email,
                sender_avatar: session.user.image
            }
        }, { status: 201 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ 
                error: error.issues[0].message 
            }, { status: 400 });
        }
        
        logError('Error sending message', error);
        return NextResponse.json({ 
            error: 'Ошибка отправки сообщения' 
        }, { status: 500 });
    }
}

// Вспомогательная функция для проверки доступа к чату (с кэшем)
async function checkChatAccess(chatId: string, userId: string): Promise<boolean> {
    const cacheKey = `chat_access_${chatId}_${userId}`;
    
    try {
        const hasAccess = await cachedQuery(cacheKey, async () => {
            const { data: participant, error } = await supabase
                .from('chat_participants')
                .select('chat_id')
                .eq('chat_id', chatId)
                .eq('user_id', userId)
                .maybeSingle();

            if (error || !participant) {
                return false;
            }
            
            return true;
        });
        
        return hasAccess;
    } catch (error) {
        return false;
    }
}

// Вспомогательная функция для отметки сообщений как прочитанных
async function markMessagesAsRead(chatId: string, userId: string) {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ 
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('chat_id', chatId)
            .neq('sender_id', userId)
            .eq('is_read', false);

        if (error) {
            logError('Error marking messages as read', error, 'warning');
        }
    } catch (error) {
        // Не критичная ошибка
    }
}

// Вспомогательная функция для загрузки файлов
async function uploadFileToStorage(
    file: File, 
    chatId: string, 
    userId: string
): Promise<{ type: string; url: string } | null> {
    try {
        // Валидация размера файла (10MB)
        if (file.size > 10 * 1024 * 1024) {
            logError('File too large', { size: file.size }, 'warning');
            return null;
        }

        // Валидация типа файла
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
        if (!allowedTypes.includes(file.type)) {
            logError('Invalid file type', { type: file.type }, 'warning');
            return null;
        }

        const fileExt = file.name.split('.').pop();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${chatId}/${userId}/${Date.now()}-${safeFileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('chats')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            logError('Error uploading file', uploadError);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('chats')
            .getPublicUrl(fileName);
        
        const fileType = file.type.startsWith('image/') ? 'image' : 'video';
        
        return {
            type: fileType,
            url: publicUrl
        };
        
    } catch (error) {
        logError('Error in file upload', error);
        return null;
    }
}

// Вспомогательная функция для валидации UUID
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}