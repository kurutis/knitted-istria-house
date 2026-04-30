import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { id } = await params;

    try {
        // Проверяем, является ли пользователь участником чата
        const { data: participant, error: participantError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('chat_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (participantError || !participant) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Получаем все сообщения чата
        const { data: messages, error } = await supabase
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
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching messages:', error);
            return NextResponse.json([], { status: 500 });
        }

        // Форматируем сообщения
        const formattedMessages = messages?.map(msg => ({
            id: msg.id,
            chat_id: msg.chat_id,
            sender_id: msg.sender_id,
            content: msg.content,
            is_read: msg.is_read,
            is_edited: msg.is_edited,
            attachments: msg.attachments || [],
            created_at: msg.created_at,
            sender_name: msg.users?.profiles?.full_name || msg.users?.email,
            sender_avatar: msg.users?.profiles?.avatar_url
        })) || []

        return NextResponse.json(formattedMessages)
        
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
    }

    const { id } = await params;
    
    let content = '';
    let attachments: { type: string; url: string }[] = [];

    try {
        const formData = await request.formData();
        content = (formData.get('content') as string) || '';
        const files = formData.getAll('attachments') as File[];
        
        // Загружаем файлы в Supabase Storage
        for (const file of files) {
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${id}/${Date.now()}-${file.name.replace(/\s/g, '_')}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('chats')
                    .upload(fileName, file)

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('chats')
                        .getPublicUrl(fileName)
                    
                    const fileType = file.type.startsWith('image/') ? 'image' : 'video';
                    attachments.push({
                        type: fileType,
                        url: publicUrl
                    })
                }
            }
        }
    } catch (error) {
        try {
            const body = await request.json();
            content = body.content || '';
        } catch {
            return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
        }
    }

    if ((!content || !content.trim()) && attachments.length === 0) {
        return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    try {
        // Проверяем участника чата
        const { data: participant, error: participantError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('chat_id', id)
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (participantError || !participant) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        // Создаем сообщение
        const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: id,
                sender_id: session.user.id,
                content: content.trim() || '',
                attachments: attachments,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (messageError) {
            return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
        }

        return NextResponse.json({
            ...newMessage,
            attachments,
            sender_name: session.user.name || session.user.email,
            sender_avatar: session.user.image
        })
        
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
    }
}