// src/lib/websocket-setup.ts
import { Server as HttpServer } from 'http';
import { initWebSocketServer, getConnectionStats } from './websocket-server';

let isWebSocketInitialized = false;

export function setupWebSocket(server: HttpServer) {
    if (isWebSocketInitialized) return;
    
    try {
        const wss = initWebSocketServer(server);
        if (wss) {
            isWebSocketInitialized = true;
            console.log('✅ WebSocket server ready');
            
            // Периодически выводим статистику подключений
            const interval = setInterval(() => {
                const stats = getConnectionStats();
                if (stats.total > 0) {
                    console.log(`📊 WebSocket stats: ${stats.total} clients (${stats.admins} admins, ${stats.users} users)`);
                }
            }, 60000);
            
            // Очищаем интервал при завершении
            if (typeof process !== 'undefined' && process.on) {
                process.on('beforeExit', () => {
                    clearInterval(interval);
                });
            }
        }
    } catch (error) {
        console.error('❌ Failed to setup WebSocket server:', error);
    }
}