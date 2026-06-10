import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rate-limit";
import { logError, logInfo } from "@/lib/error-logger";
import { sanitize } from "@/lib/sanitize";
import { invalidateCache } from "@/lib/db-optimized";
import { z } from "zod";

const updateMessageSchema = z.object({content: z.string().min(1, 'Сообщение не может быть пустым').max(5000, 'Сообщение не может превышать 5000 символов'),});

const limiter = rateLimit({ limit: 30, windowMs: 60 * 1000 });

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {return NextResponse.json({ error: 'Неавторизован' }, { status: 401 }) }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {return NextResponse.json({error: 'Слишком много запросов. Попробуйте через минуту.'}, { status: 429 })}

        const { id } = await params;
        
        if (!isValidUUID(id)) {return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 })}

        const body = await request.json();
        const validatedData = updateMessageSchema.parse({ content: body.content });
        const { content } = validatedData;
        const sanitizedContent = sanitize.text(content.trim());

        const { data: message, error: findError } = await supabase.from('messages').select('sender_id, chat_id, content, created_at, is_deleted').eq('id', id).single();

        if (findError) {
            if (findError.code === 'PGRST116') {return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 })}
            logError('Error finding message for update', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        if (message.is_deleted) {return NextResponse.json({ error: 'Нельзя редактировать удаленное сообщение' }, { status: 400 })}

        if (message.sender_id !== session.user.id) {return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })}

        const { error: updateError } = await supabase.from('messages').update({content: sanitizedContent, is_edited: true, edited_at: new Date().toISOString()}).eq('id', id);

        if (updateError) {
            logError('Error updating message', updateError);
            return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
        }

        let senderName = session.user.name || 'Пользователь';
        let senderAvatar = null;

        const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', session.user.id).single();

        if (profile) {
            senderName = profile.full_name || senderName;
            senderAvatar = profile.avatar_url;
        }

        invalidateCache(new RegExp(`chat_messages_${message.chat_id}`));

        logInfo(`Message edited`, {messageId: id, userId: session.user.id, chatId: message.chat_id});

        return NextResponse.json({id: id, chat_id: message.chat_id, sender_id: session.user.id, content: sanitizedContent, is_read: false, is_edited: true, edited_at: new Date().toISOString(), attachments: [], created_at: message.created_at, sender_name: senderName, sender_avatar: senderAvatar}, { status: 200 });
        
    } catch (error) {
        if (error instanceof z.ZodError) {return NextResponse.json({ error: error.issues[0]?.message || 'Ошибка валидации' }, { status: 400 })}
        logError('Error in message update', error);
        return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {return NextResponse.json({ error: 'Неавторизован' }, { status: 401 }) }

        const rateLimitResult = limiter(request);
        if (!rateLimitResult.success) {return NextResponse.json({error: 'Слишком много запросов. Попробуйте через минуту.' }, { status: 429 })}

        const { id } = await params;
        
        if (!isValidUUID(id)) {return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 })}

        const { data: message, error: findError } = await supabase.from('messages').select('sender_id, chat_id, content, created_at').eq('id', id).single();

        if (findError) {
            if (findError.code === 'PGRST116') {return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 })}
            logError('Error finding message for delete', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        if (message.sender_id !== session.user.id) {return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })}

        const { error: deleteError } = await supabase.from('messages').update({is_deleted: true, content: null, attachments: null, deleted_at: new Date().toISOString(), deleted_by: session.user.id}).eq('id', id);

        if (deleteError) {
            logError('Error deleting message', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
        }

        invalidateCache(new RegExp(`chat_messages_${message.chat_id}`));

        logInfo(`Message deleted`, {messageId: id, userId: session.user.id, chatId: message.chat_id});

        return NextResponse.json({success: true, message: 'Сообщение удалено'}, { status: 200 });
        
    } catch (error) {
        logError('Error in message delete', error);
        return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
    }
}