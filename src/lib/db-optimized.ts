// lib/db-optimized.ts
import { supabase } from './supabase';
import { logError, logInfo } from './error-logger';

// ============================================
// Конфигурация кэша
// ============================================

interface CacheEntry<T = unknown> {
    data: T;
    timestamp: number;
    expiresAt: number;
    hits: number;
}

interface FilterOperator {
    operator: 'gte' | 'lte' | 'gt' | 'lt' | 'like';
    val: string | number;
}

const queryCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 60 * 1000; // 1 минута
const MAX_CACHE_SIZE = 100;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 минут

let cacheHits = 0;
let cacheMisses = 0;

// Очистка просроченных записей
function cleanupCache() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, entry] of queryCache.entries()) {
        if (now > entry.expiresAt) {
            queryCache.delete(key);
            deletedCount++;
        }
    }
    
    if (deletedCount > 0 && process.env.NODE_ENV === 'development') {
        console.log(`🧹 Cache cleaned: ${deletedCount} entries`);
    }
}

// Ограничение размера кэша
function enforceCacheSize() {
    if (queryCache.size <= MAX_CACHE_SIZE) return;
    
    const sortedEntries = Array.from(queryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = sortedEntries.slice(0, queryCache.size - MAX_CACHE_SIZE);
    for (const [key] of toDelete) {
        queryCache.delete(key);
    }
}

// Автоматическая очистка
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupCache, CLEANUP_INTERVAL);
}

// ============================================
// Основные функции
// ============================================

export async function cachedQuery<T = unknown>(
    key: string,
    query: () => Promise<T>,
    ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
    const now = Date.now();
    const cached = queryCache.get(key);
    
    if (cached && now < cached.expiresAt) {
        queryCache.set(key, { ...cached, hits: cached.hits + 1 });
        cacheHits++;
        return cached.data as T;
    }
    
    cacheMisses++;
    
    try {
        const data = await query();
        queryCache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + ttl,
            hits: 0
        });
        enforceCacheSize();
        return data;
    } catch (error) {
        logError(`Cache query failed for key: ${key}`, error);
        throw error;
    }
}

export function invalidateCache(key: string | RegExp): number {
    let deletedCount = 0;
    
    if (typeof key === 'string') {
        if (queryCache.delete(key)) deletedCount = 1;
    } else if (key instanceof RegExp) {
        for (const cacheKey of queryCache.keys()) {
            if (key.test(cacheKey)) {
                queryCache.delete(cacheKey);
                deletedCount++;
            }
        }
    }
    
    if (deletedCount > 0 && process.env.NODE_ENV === 'development') {
        console.log(`🗑️ Cache invalidated: ${deletedCount} entries`);
    }
    
    return deletedCount;
}

export function invalidateCacheByPrefix(prefix: string): number {
    return invalidateCache(new RegExp(`^${prefix}`));
}

export function clearAllCache(): void {
    const size = queryCache.size;
    queryCache.clear();
    cacheHits = 0;
    cacheMisses = 0;
    logInfo('Cache cleared', { size });
}

export function getCacheStats() {
    return {
        size: queryCache.size,
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: cacheHits + cacheMisses > 0 
            ? ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2) + '%'
            : '0%'
    };
}

// ============================================
// Пагинация
// ============================================

export interface PaginatedResult<T = unknown> {
    data: T[];
    count: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
}

export async function paginatedQuery<T = unknown>(
    table: string,
    page: number = 1,
    limit: number = 10,
    filters?: Record<string, unknown>,
    select?: string,
    orderBy?: { column: string; ascending?: boolean }
): Promise<PaginatedResult<T>> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    let query = supabase.from(table).select(select || '*', { count: 'exact' });
    
    if (filters) {
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null && value !== '') {
                if (typeof value === 'object' && value !== null && 'operator' in value) {
                    const filter = value as FilterOperator;
                    const { operator, val } = filter;
                    switch (operator) {
                        case 'gte': query = query.gte(key, val); break;
                        case 'lte': query = query.lte(key, val); break;
                        case 'gt': query = query.gt(key, val); break;
                        case 'lt': query = query.lt(key, val); break;
                        case 'like': query = query.like(key, `%${val}%`); break;
                        default: query = query.eq(key, val);
                    }
                } else {
                    query = query.eq(key, value as string | number | boolean);
                }
            }
        }
    }
    
    if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
    }
    
    const { data, error, count } = await query.range(from, to);
    
    if (error) {
        logError(`Paginated query failed for table: ${table}`, error);
        throw error;
    }
    
    return {
        data: data as T[],
        count: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: to + 1 < (count || 0)
    };
}

// ============================================
// Batch запросы
// ============================================

export async function batchQueries<T = unknown>(
    queries: Promise<T>[],
    continueOnError: boolean = false
): Promise<{ results: T[]; errors: Error[] }> {
    const results: T[] = [];
    const errors: Error[] = [];
    
    if (continueOnError) {
        const settledResults = await Promise.allSettled(queries);
        for (const result of settledResults) {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                errors.push(result.reason);
            }
        }
    } else {
        const allResults = await Promise.all(queries);
        results.push(...allResults);
    }
    
    return { results, errors };
}

export async function batchQueriesWithLimit<T>(
    queries: (() => Promise<T>)[],
    limit: number = 5
): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];
    
    for (const query of queries) {
        const promise = query().then(result => {
            results.push(result);
        });
        
        executing.push(promise);
        
        if (executing.length >= limit) {
            await Promise.race(executing);
            const completedIndex = executing.findIndex(p => p === promise);
            if (completedIndex !== -1) {
                executing.splice(completedIndex, 1);
            }
        }
    }
    
    await Promise.all(executing);
    return results;
}

// ============================================
// Дедупликация запросов
// ============================================

const pendingRequests = new Map<string, Promise<unknown>>();

export async function dedupedQuery<T = unknown>(
    key: string,
    query: () => Promise<T>
): Promise<T> {
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key) as Promise<T>;
    }
    
    const promise = query().finally(() => {
        pendingRequests.delete(key);
    });
    
    pendingRequests.set(key, promise);
    return promise;
}

// Экспорт
export const dbOptimized = {
    cached: cachedQuery,
    invalidate: invalidateCache,
    invalidatePrefix: invalidateCacheByPrefix,
    clearAll: clearAllCache,
    getStats: getCacheStats,
    paginated: paginatedQuery,
    batch: batchQueries,
    batchLimited: batchQueriesWithLimit,
    deduped: dedupedQuery
};