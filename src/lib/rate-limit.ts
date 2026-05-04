// lib/rate-limit.ts
import { NextResponse } from 'next/server';
import { logWarning } from './error-logger';

// Типы
interface RateLimitRecord {
    count: number;
    timestamp: number;
    blockedUntil?: number;
}

interface RateLimitOptions {
    limit: number;           // количество запросов
    windowMs: number;        // временное окно в миллисекундах
    blockDuration?: number;  // время блокировки при превышении (опционально)
    skipOnError?: boolean;   // пропускать при ошибке
    identifier?: (req: Request) => string; // функция для получения идентификатора
}

interface RateLimitResult {
    success: boolean;
    remaining?: number;
    reset?: number;
    blockedUntil?: number;
    limit?: number;
    windowMs?: number;
}

// Конфигурация
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 минута
const DEFAULT_BLOCK_DURATION = 5 * 60 * 1000; // 5 минут блокировки при превышении
const CLEANUP_INTERVAL = 60 * 60 * 1000; // очистка раз в час

// Хранилище
const rateLimitMap = new Map<string, RateLimitRecord>();

// Статистика
let totalRequests = 0;
let blockedRequests = 0;

// Очистка старых записей
function cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [ip, record] of rateLimitMap.entries()) {
        if (record.timestamp + DEFAULT_WINDOW_MS < now && (!record.blockedUntil || record.blockedUntil < now)) {
            rateLimitMap.delete(ip);
            deletedCount++;
        }
    }
    
    if (deletedCount > 0 && process.env.NODE_ENV === 'development') {
        console.log(`🧹 Rate limit cleanup: removed ${deletedCount} expired records`);
    }
}

// Запускаем очистку
if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, CLEANUP_INTERVAL);
}

// Получение IP адреса из запроса
export function getClientIP(request: Request): string {
    const headers = request.headers;
    const forwardedFor = headers.get('x-forwarded-for');
    const realIP = headers.get('x-real-ip');
    const cfConnectingIP = headers.get('cf-connecting-ip'); // Cloudflare
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    
    return 'unknown';
}

// Создание rate limiter
export function rateLimit(options: RateLimitOptions) {
    const {
        limit,
        windowMs = DEFAULT_WINDOW_MS,
        blockDuration = DEFAULT_BLOCK_DURATION,
        skipOnError = false,
        identifier = getClientIP
    } = options;
    
    return function (request: Request): RateLimitResult {
        try {
            const id = identifier(request);
            const now = Date.now();
            const windowStart = now - windowMs;
            
            const record = rateLimitMap.get(id);
            
            // Проверка на блокировку
            if (record?.blockedUntil && record.blockedUntil > now) {
                blockedRequests++;
                totalRequests++;
                
                if (process.env.NODE_ENV === 'development') {
                    console.log(`🚫 Rate limit BLOCKED: ${id} until ${new Date(record.blockedUntil).toISOString()}`);
                }
                
                return {
                    success: false,
                    blockedUntil: record.blockedUntil,
                    reset: record.blockedUntil,
                    limit,
                    windowMs
                };
            }
            
            totalRequests++;
            
            // Новая запись или просроченная
            if (!record || record.timestamp < windowStart) {
                rateLimitMap.set(id, { count: 1, timestamp: now });
                return {
                    success: true,
                    remaining: limit - 1,
                    reset: now + windowMs,
                    limit,
                    windowMs
                };
            }
            
            // Превышение лимита
            if (record.count >= limit) {
                blockedRequests++;
                
                // Блокируем при повторном превышении
                if (!record.blockedUntil) {
                    record.blockedUntil = now + blockDuration;
                    rateLimitMap.set(id, record);
                    
                    logWarning('Rate limit exceeded - IP blocked', undefined, {
                        ip: id,
                        count: record.count,
                        limit,
                        windowMs,
                        blockDuration
                    });
                }
                
                return {
                    success: false,
                    blockedUntil: record.blockedUntil,
                    reset: record.blockedUntil || record.timestamp + windowMs,
                    limit,
                    windowMs
                };
            }
            
            // Увеличиваем счетчик
            record.count++;
            rateLimitMap.set(id, record);
            
            return {
                success: true,
                remaining: limit - record.count,
                reset: record.timestamp + windowMs,
                limit,
                windowMs
            };
        } catch (error) {
            if (!skipOnError) {
                logWarning('Rate limit error', error);
                return { success: false, limit, windowMs };
            }
            return { success: true, limit, windowMs };
        }
    };
}

// Утилита для сброса лимита по IP
export function resetRateLimit(identifier: string): boolean {
    if (rateLimitMap.has(identifier)) {
        rateLimitMap.delete(identifier);
        if (process.env.NODE_ENV === 'development') {
            console.log(`🔄 Rate limit reset for: ${identifier}`);
        }
        return true;
    }
    return false;
}

// Получение статистики
export function getRateLimitStats(): {
    totalRequests: number;
    blockedRequests: number;
    activeRecords: number;
    blockedPercentage: string;
} {
    const now = Date.now();
    let activeRecords = 0;
    let blockedRecords = 0;
    
    for (const record of rateLimitMap.values()) {
        if (record.blockedUntil && record.blockedUntil > now) {
            blockedRecords++;
        }
        activeRecords++;
    }
    
    return {
        totalRequests,
        blockedRequests,
        activeRecords,
        blockedPercentage: totalRequests > 0 
            ? ((blockedRequests / totalRequests) * 100).toFixed(2) + '%'
            : '0%'
    };
}

// Middleware для Next.js (можно использовать в middleware.ts)
export function rateLimitMiddleware(options: RateLimitOptions) {
    const limiter = rateLimit(options);
    
    return async function (request: Request): Promise<NextResponse | null> {
        const result = limiter(request);
        
        if (!result.success) {
            const headers = new Headers({
                'X-RateLimit-Limit': result.limit?.toString() || '',
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': result.reset?.toString() || '',
                'Retry-After': Math.ceil(((result.reset || 0) - Date.now()) / 1000).toString()
            });
            
            const message = result.blockedUntil 
                ? `Превышен лимит запросов. Доступ заблокирован до ${new Date(result.blockedUntil).toLocaleTimeString()}`
                : `Слишком много запросов. Попробуйте позже.`;
            
            return new NextResponse(
                JSON.stringify({ error: message, retryAfter: headers.get('Retry-After') }),
                { status: 429, headers }
            );
        }
        
        return null;
    };
}

// Пре-созданные лимитеры для разных случаев
export const strictLimiter = rateLimit({ limit: 10, windowMs: 60 * 1000 }); // 10 запросов в минуту
export const moderateLimiter = rateLimit({ limit: 30, windowMs: 60 * 1000 }); // 30 запросов в минуту
export const relaxedLimiter = rateLimit({ limit: 100, windowMs: 60 * 1000 }); // 100 запросов в минуту
export const authLimiter = rateLimit({ limit: 5, windowMs: 60 * 1000 }); // 5 попыток в минуту

export const sensitiveLimiter = rateLimit({
    limit: 3,
    windowMs: 60 * 1000,
    blockDuration: 15 * 60 * 1000 // 15 минут блокировки после 3 попыток
});

export function userRateLimit(limit: number = 20, windowMs: number = 60 * 1000) {
    return rateLimit({
        limit,
        windowMs,
        identifier: (req: Request) => {
            return getClientIP(req);
        }
    });
}

// Экспорт утилит
export const rateLimitUtils = {
    reset: resetRateLimit,
    stats: getRateLimitStats,
    cleanup
};