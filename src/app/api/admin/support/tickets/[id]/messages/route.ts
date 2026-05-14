import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { uploadToS3 } from "@/lib/s3-storage";

function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

async function uploadAttachment(file: File, ticketId: string): Promise<{ type: string; url: string } | null> {
    try {
        if (!file || file.size === 0) return null;
        
        if (file.size > 10 * 1024 * 1024) {
            console.error('File too large:', file.size);
            return null;
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            console.error('Invalid file type:', file.type);
            return null;
        }
        
        const folder = `support/${ticketId}`;
        const fileUrl = await uploadToS3(file, folder, 'admin');
        
        if (!fileUrl) {
            console.error('Failed to upload file to S3');
            return null;
        }
        
        return {
            type: 'image',
            url: fileUrl
        };
        
    } catch (error) {
        console.error('Error uploading attachment:', error);
        return null;
    }
}

export async function GET(
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
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        // Получаем тикет
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        // Получаем сообщения
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
                created_at
            `)
            .eq('chat_id', ticket.chat_id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error('Error fetching messages:', messagesError);
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        if (!messages || messages.length === 0) {
            return NextResponse.json({ messages: [] }, { status: 200 });
        }

        // Получаем информацию об отправителях
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        
        const { data: users } = await supabase
            .from('users')
            .select('id, email, role')
            .in('id', senderIds);

        const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', senderIds);

        const userMap = new Map();
        users?.forEach(u => userMap.set(u.id, { email: u.email, role: u.role }));
        
        const profileMap = new Map();
        profiles?.forEach(p => profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }));

        const formattedMessages = messages.map(msg => {
            const userInfo = userMap.get(msg.sender_id);
            const profileInfo = profileMap.get(msg.sender_id);
            
            return {
                id: msg.id,
                chat_id: msg.chat_id,
                sender_id: msg.sender_id,
                content: msg.content || '',
                is_read: msg.is_read,
                is_edited: msg.is_edited,
                attachments: msg.attachments || [],
                created_at: msg.created_at,
                sender_name: profileInfo?.full_name || userInfo?.email || 'Пользователь',
                sender_avatar: profileInfo?.avatar_url || null,
                sender_role: userInfo?.role || 'user'
            };
        });

        return NextResponse.json(formattedMessages, { status: 200 });
        
    } catch (error) {
        console.error('Error in messages API:', error);
        return NextResponse.json({ messages: [] }, { status: 200 });
    }
}

export async function POST(
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
            return NextResponse.json({ error: 'Неверный формат ID тикета' }, { status: 400 });
        }

        // Получаем тикет
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('chat_id, user_id, status')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) {
            return NextResponse.json({ error: 'Тикет не найден' }, { status: 404 });
        }

        let content = '';
        let attachments: { type: string; url: string }[] = [];
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            content = (formData.get('content') as string) || '';
            const files = formData.getAll('attachments') as File[];
            
            for (const file of files) {
                if (file && file.size > 0) {
                    const uploaded = await uploadAttachment(file, id);
                    if (uploaded) {
                        attachments.push(uploaded);
                    }
                }
            }
        } else {
            const body = await request.json();
            content = body.content || '';
            attachments = body.attachments || [];
        }

        const trimmedContent = content?.trim() || '';
        if (!trimmedContent && attachments.length === 0) {
            return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Создаем сообщение
        const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
                chat_id: ticket.chat_id,
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
            console.error('Error sending message:', messageError);
            return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
        }

        // Обновляем чат
        await supabase
            .from('chats')
            .update({
                last_message_preview: trimmedContent.substring(0, 100) || (attachments.length > 0 ? '📎 Вложение' : ''),
                last_message_at: now,
                updated_at: now
            })
            .eq('id', ticket.chat_id);

        // Обновляем статус тикета, если он был открыт
        if (ticket.status === 'open') {
            await supabase
                .from('support_tickets')
                .update({ status: 'in_progress', updated_at: now })
                .eq('id', id);
        }

        // Отправляем уведомление пользователю
        await supabase
            .from('notifications')
            .insert({
                user_id: ticket.user_id,
                title: 'Новое сообщение в поддержке',
                message: `Администратор ответил на ваше обращение: ${trimmedContent.substring(0, 100)}${trimmedContent.length > 100 ? '...' : ''}`,
                type: 'support',
                metadata: { ticket_id: id, message_id: newMessage.id },
                created_at: now,
                is_read: false
            });

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
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Ошибка отправки сообщения' }, { status: 500 });
    }
}