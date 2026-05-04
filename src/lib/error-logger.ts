// lib/error-logger.ts
import { createClient } from '@supabase/supabase-js';

// Типы
export type ErrorLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface LogEntry {
    timestamp: string;
    level: ErrorLevel;
    message: string;
    error?: string;
    stack?: string;
    code?: string;
    userId?: string;
    sessionId?: string;
    userAgent?: string | null;
    url?: string | null;
    method?: string;
    statusCode?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
    environment?: string;
    version?: string;
}

// Конфигурация
const CONFIG = {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    logApiUrl: process.env.LOG_API_URL || '/api/log',
    batchSize: 10,
    flushInterval: 5000,
    maxQueueSize: 100,
    enableConsole: true,
    enableRemote: process.env.ENABLE_REMOTE_LOGGING === 'true' || false
};

// Очередь для батчевой отправки
let logQueue: LogEntry[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

// Генерация ID сессии
let sessionId: string | null = null;

function getSessionId(): string {
    if (!sessionId) {
        sessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2, 15) + 
              Math.random().toString(36).substring(2, 15);
    }
    return sessionId;
}

// Отправка логов в очередь
function queueLog(log: LogEntry) {
    logQueue.push(log);
    
    if (logQueue.length >= CONFIG.batchSize) {
        flushLogs();
    } else if (!flushTimeout) {
        flushTimeout = setTimeout(flushLogs, CONFIG.flushInterval);
    }
}

// Отправка логов на сервер
async function flushLogs() {
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }
    
    if (logQueue.length === 0) return;
    
    const logsToSend = [...logQueue];
    logQueue = [];
    
    if (!CONFIG.enableRemote) return;
    
    try {
        await fetch(CONFIG.logApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logs: logsToSend, sessionId: getSessionId() }),
        }).catch(() => {});
    } catch (error) {
        if (logQueue.length < CONFIG.maxQueueSize) {
            logQueue.unshift(...logsToSend);
        }
    }
}

// Создание записи лога
function createLog(
    level: ErrorLevel,
    message: string,
    error?: unknown,
    metadata?: Record<string, unknown>
): LogEntry {
    const now = new Date();
    const log: LogEntry = {
        timestamp: now.toISOString(),
        level,
        message,
        metadata,
        environment: process.env.NODE_ENV,
        sessionId: getSessionId(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : null,
        url: typeof window !== 'undefined' ? window.location.href : null,
    };
    
    if (error) {
    if (error instanceof Error) {
        log.error = error.message;
        log.stack = error.stack;
        if ('code' in error) log.code = (error as { code: string }).code;
        if ('response' in error && (error as { response: { status: number } }).response) {
            log.statusCode = (error as { response: { status: number } }).response.status;
        }
    } else if (typeof error === 'string') {
        log.error = error;
    } else {
        log.error = String(error);
    }
}
    
    return log;
}

// Форматирование для консоли
function formatConsoleLog(log: LogEntry): string {
    const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        critical: '💀'
    };
    
    const parts = [
        emoji[log.level] || '📝',
        `[${log.timestamp}]`,
        `[${log.level.toUpperCase()}]`,
        log.message
    ];
    
    if (log.statusCode) parts.push(`(${log.statusCode})`);
    if (log.duration) parts.push(`+${log.duration}ms`);
    if (log.error) parts.push(`- ${log.error}`);
    
    return parts.join(' ');
}

// Основные функции логирования
export function logError(message: string, error?: unknown, level: ErrorLevel = 'error', metadata?: Record<string, unknown>) {
    const log = createLog(level, message, error, metadata);
    
    if (CONFIG.enableConsole) {
        console.error(formatConsoleLog(log));
        if (error instanceof Error && error.stack && level === 'critical') {
            console.error(error.stack);
        }
    }
    
    queueLog(log);
}

export function logInfo(message: string, data?: unknown) {
    const log = createLog('info', message, undefined, { data });
    
    if (CONFIG.enableConsole) {
        console.log(`[INFO] ${message}`, data);
    }
    
    queueLog(log);
}

export function logWarning(message: string, error?: unknown, metadata?: Record<string, unknown>) {
    const log = createLog('warning', message, error, metadata);
    
    if (CONFIG.enableConsole) {
        console.warn(formatConsoleLog(log));
    }
    
    queueLog(log);
}

export function logDebug(message: string, data?: unknown, metadata?: Record<string, unknown>) {
    if (!CONFIG.isDevelopment) return;
    
    const log = createLog('debug', message, undefined, { ...metadata, data });
    
    if (CONFIG.enableConsole) {
        console.debug(formatConsoleLog(log));
        if (data) console.debug('  🔧 Data:', data);
    }
    
    queueLog(log);
}

export function logCritical(message: string, error?: unknown, metadata?: Record<string, unknown>) {
    logError(message, error, 'critical', metadata);
}

export function logPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
): void {
    const log = createLog('info', `Performance: ${operation}`, undefined, {
        ...metadata,
        duration,
        operation
    });
    log.duration = duration;
    
    if (CONFIG.enableConsole) {
        console.log(`⚡ [PERF] ${operation}: ${duration}ms`);
    }
    
    queueLog(log);
}

export function logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string
): void {
    const log = createLog(
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warning' : 'info',
        `API ${method} ${url}`,
        undefined,
        { method, url, statusCode, duration, userId }
    );
    log.method = method;
    log.statusCode = statusCode;
    log.duration = duration;
    log.userId = userId;
    
    if (CONFIG.enableConsole && statusCode >= 400) {
        console.log(`🌐 [API] ${method} ${url} → ${statusCode} (${duration}ms)`);
    }
    
    queueLog(log);
}

export function logUserAction(
    action: string,
    userId: string,
    metadata?: Record<string, unknown>
): void {
    const log = createLog('info', `User action: ${action}`, undefined, {
        ...metadata,
        action,
        userId
    });
    log.userId = userId;
    
    if (CONFIG.enableConsole) {
        console.log(`👤 [USER] ${action} (${userId})`);
    }
    
    queueLog(log);
}

// Очистка очереди (вызывать перед закрытием приложения)
export async function flushLogsAndExit(): Promise<void> {
    await flushLogs();
}

// Получение статистики логов
export function getLogStats(): { queueSize: number; sessionId: string } {
    return {
        queueSize: logQueue.length,
        sessionId: getSessionId()
    };
}

// Сброс очереди (для тестов)
export function resetLogQueue(): void {
    logQueue = [];
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }
}

// Инициализация - обработка закрытия страницы
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (logQueue.length > 0) {
            console.log(`[LOGGER] ${logQueue.length} logs pending on page unload`);
        }
    });
}

// Экспорт логгера
export const logger = {
    error: logError,
    warning: logWarning,
    info: logInfo,
    debug: logDebug,
    critical: logCritical,
    performance: logPerformance,
    api: logApiRequest,
    user: logUserAction,
    flush: flushLogsAndExit,
    stats: getLogStats
};