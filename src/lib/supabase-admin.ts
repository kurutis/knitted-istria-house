// lib/supabase-admin.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logError, logInfo } from './error-logger';

// Конфигурация
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Проверка конфигурации
if (!supabaseUrl) {
    const error = new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    if (process.env.NODE_ENV === 'production') {
        logError('Supabase admin configuration missing', error);
    } else {
        console.error('❌ Supabase admin URL missing');
    }
}

if (!supabaseServiceKey) {
    const error = new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    if (process.env.NODE_ENV === 'production') {
        logError('Supabase admin configuration missing', error);
    } else {
        console.error('❌ Supabase service key missing');
    }
}

// Настройки клиента
const CLIENT_OPTIONS = {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    },
    db: {
        schema: 'public' as const
    },
    global: {
        headers: {
            'X-Client-Info': 'supabase-admin',
            'X-Application-Name': 'knitly-admin'
        }
    }
};

function createAdminClient(): SupabaseClient | null {
    if (!supabaseUrl || !supabaseServiceKey) {
        return null;
    }
    
    try {
        const client = createClient(supabaseUrl, supabaseServiceKey, CLIENT_OPTIONS);
        
        if (process.env.NODE_ENV === 'development') {
            console.log('🔐 Supabase admin client initialized');
        }
        
        return client;
    } catch (error) {
        logError('Failed to create Supabase admin client', error);
        return null;
    }
}

export const supabaseAdmin = createAdminClient();

export function getSupabaseAdmin(): SupabaseClient {
    if (!supabaseAdmin) {
        throw new Error('Supabase admin client not configured. Check SUPABASE_SERVICE_ROLE_KEY');
    }
    return supabaseAdmin;
}

export async function checkAdminConnection(): Promise<boolean> {
    try {
        const admin = getSupabaseAdmin();
        const { error } = await admin.from('users').select('id').limit(1);
        
        if (error) {
            logError('Supabase admin connection check failed', error);
            return false;
        }
        
        logInfo('Supabase admin connection successful');
        return true;
    } catch (error) {
        logError('Supabase admin connection error', error);
        return false;
    }
}

export function isAdminClientAvailable(): boolean {
    return !!supabaseAdmin && !!supabaseUrl && !!supabaseServiceKey;
}

export async function withAdminClient<T>(
    operation: (client: SupabaseClient) => Promise<T>
): Promise<T> {
    const client = getSupabaseAdmin();
    try {
        return await operation(client);
    } catch (error) {
        logError('Admin client operation failed', error);
        throw error;
    }
}

// Простая функция RPC без сложных типов
export async function adminRPC<T = unknown>(
    functionName: string,
    params?: Record<string, unknown>
): Promise<T | null> {
    try {
        const admin = getSupabaseAdmin();
        
        // Простой подход: используем JSON.stringify и parse для обхода типов
        const response = params
            ? await admin.rpc(functionName, params)
            : await admin.rpc(functionName);
        
        const { data, error } = response;
        
        if (error) throw error;
        return data as T;
    } catch (error) {
        logError(`Admin RPC failed: ${functionName}`, error);
        return null;
    }
}

// Альтернативная функция с разделением на два метода
export async function adminRPCNoParams<T = unknown>(
    functionName: string
): Promise<T | null> {
    try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin.rpc(functionName);
        
        if (error) throw error;
        return data as T;
    } catch (error) {
        logError(`Admin RPC failed: ${functionName}`, error);
        return null;
    }
}

export async function adminRPCWithParams<T = unknown>(
    functionName: string,
    params: Record<string, unknown>
): Promise<T | null> {
    try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin.rpc(functionName, params);
        
        if (error) throw error;
        return data as T;
    } catch (error) {
        logError(`Admin RPC failed: ${functionName}`, error);
        return null;
    }
}

export const supabaseAdminUtils = {
    getClient: getSupabaseAdmin,
    checkConnection: checkAdminConnection,
    isAvailable: isAdminClientAvailable,
    withClient: withAdminClient,
    rpc: adminRPC,
    rpcNoParams: adminRPCNoParams,
    rpcWithParams: adminRPCWithParams
};