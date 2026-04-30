import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Проверяем существование сообщения и права доступа
        const { data: message, error: findError } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
            }
            console.error('Error finding message:', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        if (!message) {
            return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
        }

        if (message.sender_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Удаляем сообщение
        const { error: deleteError } = await supabase
            .from('messages')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting message:', deleteError);
            return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
        
    } catch (error) {
        console.error('Error deleting message:', error);
        return NextResponse.json({ error: 'Ошибка удаления сообщения' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещен' }, { status: 401 });
    }

    const { id } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    try {
        // Проверяем существование сообщения и права доступа
        const { data: message, error: findError } = await supabase
            .from('messages')
            .select('sender_id, chat_id')
            .eq('id', id)
            .single();

        if (findError) {
            if (findError.code === 'PGRST116') {
                return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
            }
            console.error('Error finding message:', findError);
            return NextResponse.json({ error: 'Ошибка поиска сообщения' }, { status: 500 });
        }

        if (!message) {
            return NextResponse.json({ error: 'Сообщение не найдено' }, { status: 404 });
        }

        if (message.sender_id !== session.user.id) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Обновляем сообщение
        const { data: updatedMessage, error: updateError } = await supabase
            .from('messages')
            .update({
                content: content.trim(),
                is_edited: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('id, chat_id, sender_id, content, is_read, is_edited, created_at, attachments')
            .single();

        if (updateError) {
            console.error('Error updating message:', updateError);
            return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
        }

        return NextResponse.json({
            ...updatedMessage,
            sender_name: session.user.name || session.user.email,
            sender_role: 'admin'
        });
        
    } catch (error) {
        console.error('Error updating message:', error);
        return NextResponse.json({ error: 'Ошибка обновления сообщения' }, { status: 500 });
    }
}