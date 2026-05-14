// src/lib/with-websocket.ts
import { Server as HttpServer } from 'http';
import { setupWebSocket } from './websocket-setup';

let isSetup = false;

export function withWebSocket(server: HttpServer) {
    if (isSetup) return;
    
    if (server && typeof server.on === 'function') {
        setupWebSocket(server);
        isSetup = true;
    }
}