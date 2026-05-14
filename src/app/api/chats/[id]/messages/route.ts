// src/app/api/chats/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Attachment = {
    type: string;
    url: string;
};

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        // Проверяем доступ к чату
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('chat_id', id)
            .eq('user_id', session.user.id)
            .single();

        if (!participant) {
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        // Получаем сообщения
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
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        const formattedMessages = messages?.map(msg => ({
            id: msg.id,
            chat_id: msg.chat_id,
            sender_id: msg.sender_id,
            content: msg.content || '',
            is_read: msg.is_read,
            is_edited: msg.is_edited,
            attachments: (msg.attachments || []) as Attachment[],
            created_at: msg.created_at,
            sender_name: msg.users?.[0]?.profiles?.[0]?.full_name || msg.users?.[0]?.email,
            sender_avatar: msg.users?.[0]?.profiles?.[0]?.avatar_url
        })) || [];

        return NextResponse.json({ messages: formattedMessages }, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ messages: [] }, { status: 200 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
        }

        const { id } = await params;
        
        if (!isValidUUID(id)) {
            return NextResponse.json({ error: 'Неверный формат ID чата' }, { status: 400 });
        }

        // Проверяем доступ
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('chat_id', id)
            .eq('user_id', session.user.id)
            .single();

        if (!participant) {
            return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
        }

        let content = '';
        let attachments: Attachment[] = []; // Явно указываем тип

        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            content = (formData.get('content') as string) || '';
            const files = formData.getAll('attachments') as File[];
            
            // Загружаем файлы в storage
            for (const file of files) {
                if (file.size > 0) {
                    try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `chats/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        
                        const { error: uploadError } = await supabase.storage
                            .from('chat-attachments')
                            .upload(fileName, file);
                        
                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage
                                .from('chat-attachments')
                                .getPublicUrl(fileName);
                            
                            attachments.push({
                                type: file.type.startsWith('image/') ? 'image' : 'video',
                                url: publicUrl
                            });
                        }
                    } catch (uploadError) {
                        console.error('Error uploading file:', uploadError);
                    }
                }
            }
        } else {
            const body = await request.json();
            content = body.content || '';
            attachments = body.attachments || [];
        }

        if (!content.trim() && attachments.length === 0) {
            return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Создаем сообщение
        const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: id,
                sender_id: session.user.id,
                content: content.trim(),
                attachments: attachments,
                created_at: now,
                is_read: false,
                is_deleted: false
            })
            .select()
            .single();

        if (messageError) {
            console.error('Error sending message:', messageError);
            return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
        }

        // Обновляем чат
        await supabase
            .from('chats')
            .update({
                last_message_preview: content.trim().substring(0, 100) || 'Вложение',
                last_message_at: now,
                updated_at: now
            })
            .eq('id', id);

        // Обновляем счетчик непрочитанных для других участников
        await supabase.rpc('increment_unread_count', {
            p_chat_id: id,
            p_exclude_user_id: session.user.id
        });

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
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
    }
}