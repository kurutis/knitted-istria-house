import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 });
        }

        const body = await request.json();
        const { content } = body;

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
        }

        // Проверяем, что сообщение существует и не удалено
        const { data: existingMessage, error: findError } = await supabase
            .from('messages')
            .select('id, chat_id, is_deleted')
            .eq('id', id)
            .single();

        if (findError) {
            console.error('Find error:', findError);
            return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
        }

        if (existingMessage.is_deleted) {
            return NextResponse.json({ error: 'Нельзя редактировать удаленное сообщение' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Обновляем сообщение
        const { data: updatedMessage, error: updateError } = await supabase
            .from('messages')
            .update({
                content: content.trim(),
                is_edited: true,
                edited_at: now,
                edited_by: session.user.id,
                updated_at: now
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления сообщения: ' + updateError.message }, { status: 500 });
        }

        return NextResponse.json({
            id: updatedMessage.id,
            chat_id: updatedMessage.chat_id,
            sender_id: updatedMessage.sender_id,
            content: updatedMessage.content,
            is_read: updatedMessage.is_read,
            is_edited: updatedMessage.is_edited,
            attachments: updatedMessage.attachments || [],
            created_at: updatedMessage.created_at,
            sender_name: session.user.name || session.user.email,
            sender_avatar: session.user.image,
            sender_role: 'admin'
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error in PUT message:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID сообщения' }, { status: 400 });
        }

        // Проверяем, что сообщение существует
        const { data: existingMessage, error: findError } = await supabase
            .from('messages')
            .select('id, chat_id, is_deleted')
            .eq('id', id)
            .single();

        if (findError) {
            console.error('Find error:', findError);
            return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
        }

        if (existingMessage.is_deleted) {
            return NextResponse.json({ error: 'Сообщение уже удалено' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Мягкое удаление
        const { error: deleteError } = await supabase
            .from('messages')
            .update({
                is_deleted: true,
                content: null,
                attachments: null,
                deleted_at: now,
                deleted_by: session.user.id,
                updated_at: now
            })
            .eq('id', id);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления сообщения: ' + deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Сообщение удалено'
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error in DELETE message:', error);
        return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
    }
}