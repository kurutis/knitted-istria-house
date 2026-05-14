// src/lib/websocket-server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { supabase } from './supabase';

// Типы для WebSocket сообщений
interface WsMessage {
    type: 'new_message' | 'new_ticket' | 'ticket_updated' | 'message_edited' | 'message_deleted';
    chat_id?: string;
    ticket_id?: string;
    message?: MessagePayload;
    ticket?: TicketPayload;
    message_id?: string;
    data?: TicketUpdatePayload;
}

export interface MessagePayload {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    attachments: Array<{ type: string; url: string }>;
    created_at: string;
    sender_name: string;
    sender_avatar: string | null;
    sender_role: string;
}

export interface TicketPayload {
    id: string;
    user_name: string;
    subject: string;
    priority: string;
    created_at: string;
}

export interface TicketUpdatePayload {
    status: string;
    last_message: string;
    last_message_time: string;
    updated_at: string;
}

interface Client {
    ws: WebSocket;
    userId: string;
    userRole: string;
    isAdmin: boolean;
}

let wss: WebSocketServer | null = null;
const clients = new Map<string, Client>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initWebSocketServer(server: any) {
    if (wss) return wss;

    try {
        wss = new WebSocketServer({ server, path: '/api/ws/support' });
        console.log('✅ WebSocket server initialized on path: /api/ws/support');

        wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
            const params = parse(req.url || '', true);
            const userId = params.query.userId as string;
            
            if (!userId) {
                ws.close(1008, 'User ID required');
                return;
            }

            // Проверяем пользователя
            const { data: user, error } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', userId)
                .single();

            if (error || !user) {
                ws.close(1008, 'Unauthorized');
                return;
            }

            const isAdmin = user.role === 'admin';
            
            // Сохраняем клиента
            clients.set(userId, {
                ws,
                userId,
                userRole: user.role,
                isAdmin,
            });

            console.log(`🔌 WebSocket connected: ${userId} (${isAdmin ? 'admin' : 'user'})`);
            console.log(`📊 Total connected clients: ${clients.size}`);

            ws.on('message', async (data: Buffer) => {
                try {
                    const message: WsMessage = JSON.parse(data.toString());
                    await handleMessage(userId, message);
                } catch (error) {
                    console.error('Error handling message:', error);
                }
            });

            ws.on('close', () => {
                clients.delete(userId);
                console.log(`🔌 WebSocket disconnected: ${userId}`);
                console.log(`📊 Total connected clients: ${clients.size}`);
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for ${userId}:`, error);
            });

            // Отправляем приветственное сообщение
            ws.send(JSON.stringify({
                type: 'connection_established',
                message: 'Connected to support WebSocket server',
                clientId: userId,
                isAdmin,
                timestamp: new Date().toISOString()
            }));
        });

        wss.on('error', (error) => {
            console.error('WebSocket server error:', error);
        });

    } catch (error) {
        console.error('Failed to initialize WebSocket server:', error);
    }

    return wss;
}

async function handleMessage(senderId: string, message: WsMessage) {
    switch (message.type) {
        case 'new_message':
            if (message.chat_id && message.message) {
                await broadcastToChatParticipants(message.chat_id, message.message, senderId);
            }
            break;
        case 'ticket_updated':
            if (message.ticket_id && message.data) {
                await broadcastTicketUpdate(message.ticket_id, message.data);
            }
            break;
        case 'message_edited':
            if (message.chat_id && message.message) {
                await broadcastMessageEdit(message.chat_id, message.message, senderId);
            }
            break;
        case 'message_deleted':
            if (message.chat_id && message.message_id) {
                await broadcastMessageDelete(message.chat_id, message.message_id, senderId);
            }
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
}

async function broadcastToChatParticipants(chatId: string, messageData: MessagePayload, senderId: string) {
    // Получаем участников чата
    const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId);

    if (!participants) return;

    let sentCount = 0;
    for (const participant of participants) {
        const client = clients.get(participant.user_id);
        if (client && client.userId !== senderId) {
            try {
                client.ws.send(JSON.stringify({
                    type: 'new_message',
                    chat_id: chatId,
                    message: messageData,
                    timestamp: new Date().toISOString()
                }));
                sentCount++;
            } catch (error) {
                console.error(`Failed to send message to ${participant.user_id}:`, error);
            }
        }
    }
    
    if (sentCount > 0) {
        console.log(`📨 Broadcasted message to ${sentCount} clients in chat ${chatId}`);
    }
}

async function broadcastMessageEdit(chatId: string, messageData: MessagePayload, senderId: string) {
    const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId);

    if (!participants) return;

    for (const participant of participants) {
        const client = clients.get(participant.user_id);
        if (client && client.userId !== senderId) {
            client.ws.send(JSON.stringify({
                type: 'message_edited',
                chat_id: chatId,
                message: messageData,
                timestamp: new Date().toISOString()
            }));
        }
    }
}

async function broadcastMessageDelete(chatId: string, messageId: string, senderId: string) {
    const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId);

    if (!participants) return;

    for (const participant of participants) {
        const client = clients.get(participant.user_id);
        if (client && client.userId !== senderId) {
            client.ws.send(JSON.stringify({
                type: 'message_deleted',
                chat_id: chatId,
                message_id: messageId,
                timestamp: new Date().toISOString()
            }));
        }
    }
}

async function broadcastTicketUpdate(ticketId: string, data: TicketUpdatePayload) {
    // Получаем информацию о тикете
    const { data: ticket } = await supabase
        .from('support_tickets')
        .select('user_id')
        .eq('id', ticketId)
        .single();

    let sentCount = 0;
    // Отправляем всем админам и пользователю
    for (const client of clients.values()) {
        if (client.isAdmin || client.userId === ticket?.user_id) {
            try {
                client.ws.send(JSON.stringify({
                    type: 'ticket_updated',
                    ticket_id: ticketId,
                    data,
                    timestamp: new Date().toISOString()
                }));
                sentCount++;
            } catch (error) {
                console.error(`Failed to send ticket update to ${client.userId}:`, error);
            }
        }
    }
    
    if (sentCount > 0) {
        console.log(`📨 Broadcasted ticket update to ${sentCount} clients`);
    }
}

// Функции для отправки событий из API
export async function notifyNewMessage(chatId: string, message: MessagePayload) {
    await broadcastToChatParticipants(chatId, message, message.sender_id);
}

export async function notifyMessageEdit(chatId: string, message: MessagePayload) {
    await broadcastMessageEdit(chatId, message, message.sender_id);
}

export async function notifyMessageDelete(chatId: string, messageId: string, senderId: string) {
    await broadcastMessageDelete(chatId, messageId, senderId);
}

export async function notifyTicketUpdate(ticketId: string, updateData: TicketUpdatePayload) {
    await broadcastTicketUpdate(ticketId, updateData);
}

export async function notifyNewTicket(ticket: TicketPayload) {
    // Отправляем всем админам о новом тикете
    const newTicketMessage = {
        type: 'new_ticket',
        ticket: {
            id: ticket.id,
            user_name: ticket.user_name,
            subject: ticket.subject,
            priority: ticket.priority,
            created_at: ticket.created_at,
        },
        timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    for (const client of clients.values()) {
        if (client.isAdmin) {
            try {
                client.ws.send(JSON.stringify(newTicketMessage));
                sentCount++;
            } catch (error) {
                console.error(`Failed to send new ticket notification to ${client.userId}:`, error);
            }
        }
    }
    
    if (sentCount > 0) {
        console.log(`📨 Broadcasted new ticket notification to ${sentCount} admins`);
    }
}

export function getConnectedClients(): string[] {
    return Array.from(clients.keys());
}

export function getConnectionStats(): { total: number; admins: number; users: number } {
    let admins = 0;
    let users = 0;
    
    for (const client of clients.values()) {
        if (client.isAdmin) {
            admins++;
        } else {
            users++;
        }
    }
    
    return {
        total: clients.size,
        admins,
        users
    };
}