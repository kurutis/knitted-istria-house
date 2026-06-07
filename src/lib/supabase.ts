import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logError, logInfo } from './error-logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const CONNECTION_TIMEOUT = 30000; // 30 секунд
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

if (!supabaseUrl) {
    const error = new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
    console.error('Supabase configuration error:', error.message)
    if (process.env.NODE_ENV === 'production') {logError('Supabase URL missing', error)}
    throw error
}

if (!supabaseAnonKey) {
    const error = new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
    console.error(' Supabase configuration error:', error.message)
    if (process.env.NODE_ENV === 'production') {logError('Supabase anon key missing', error)}
    throw error
}

async function fetchWithRetry(url: RequestInfo | URL, options?: RequestInit, retries: number = RETRY_ATTEMPTS): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT)
            
            const response = await fetch(url, {...options, signal: controller.signal})
            
            clearTimeout(timeoutId);
            
            if (!response.ok && attempt < retries) {throw new Error(`HTTP ${response.status}: ${response.statusText}`)}
            
            return response;
        } catch (err) {
            const error = err as Error;
            lastError = error;
            
            if (error.name === 'AbortError') {
                logError('Supabase request timeout', error, 'warning');
            } else if (error.message?.includes('401') || error.message?.includes('403')) {
                throw error;
            }
            
            if (attempt < retries) {
                const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
                logInfo(`Retrying Supabase request (${attempt}/${retries}) after ${delay}ms`, { url: url.toString() });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError || new Error('Failed after retries');
}

const CLIENT_OPTIONS = {
    auth: {autoRefreshToken: true,  persistSession: true, detectSessionInUrl: true, storage: typeof window !== 'undefined' ? window.localStorage : undefined, storageKey: 'supabase.auth.token', flowType: 'pkce' as const}, global: {headers: {'X-Client-Info': 'supabase-js-web', 'X-Application-Name': 'knitly'}, fetch: fetchWithRetry}, db: {schema: 'public' as const}, realtime: {params: {eventsPerSecond: 10}}}

let supabaseClient: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {supabaseClient = createClient(supabaseUrl as string, supabaseAnonKey as string, CLIENT_OPTIONS)}
    return supabaseClient;
}

export const supabase = createSupabaseClient();

let connectionChecked = false;

export async function checkSupabaseConnection(): Promise<boolean> {
    if (connectionChecked) return true;
    
    try {
        const startTime = Date.now();
        
        for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
            try {
                const { error } = await supabase.auth.getSession()
                
                if (!error) {
                    const duration = Date.now() - startTime
                    logInfo('Supabase connected successfully', { duration, attempt })
                    connectionChecked = true
                    return true
                }
                
                if (attempt < RETRY_ATTEMPTS) {await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))}
            } catch (err) {
                if (attempt === RETRY_ATTEMPTS) throw err
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
            }
        }
        
        return false;
    } catch (error) {
        logError('Supabase connection error after retries', error);
        return false;
    }
}

if (typeof window !== 'undefined') {setTimeout(() => {checkSupabaseConnection().catch(() => {})}, 1000)}

export async function queryWithTimeout<T>(query: () => Promise<T>, timeoutMs: number = CONNECTION_TIMEOUT): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {setTimeout(() => reject(new Error('Query timeout')), timeoutMs)})
    return Promise.race([query(), timeoutPromise]);
}

export async function healthCheck(): Promise<{ status: 'ok' | 'error'; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        const latency = Date.now() - startTime;
        
        if (error) {return { status: 'error', latency, error: error.message }}
        
        return { status: 'ok', latency };
    } catch (err) {
        const error = err as Error;
        return { status: 'error', latency: Date.now() - startTime, error: error.message };
    }
}

export const supabaseUtils = { checkConnection: checkSupabaseConnection, healthCheck, queryWithTimeout,
    
    async getSession() {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        return data.session;
    },
    
    async getUser() {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw error
        return data.user;
    },
    
    async refreshSession() {
        const { data, error } = await supabase.auth.refreshSession()
        if (error) throw error
        return data.session
    },
    
    subscribeToTable(table: string, callback: (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => void, event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*') {
        const subscription = supabase.channel(`${table}_changes`).on('postgres_changes', { event, schema: 'public', table }, callback).subscribe();
        return subscription;
    },
    
    async callRPC<T = Record<string, unknown>>(functionName: string, params?: Record<string, unknown>): Promise<T | null> {
    try {
        const { data, error } = await supabase.rpc(functionName, params);
        if (error) throw error
        return data as T
    } catch (error) {
        logError(`RPC call failed: ${functionName}`, error)
        return null
    }
}
};

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    (window as { __supabase?: SupabaseClient; __supabaseUtils?: typeof supabaseUtils }).__supabase = supabase;
    (window as { __supabase?: SupabaseClient; __supabaseUtils?: typeof supabaseUtils }).__supabaseUtils = supabaseUtils;
}