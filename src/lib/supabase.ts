import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Отладка
console.log('🔧 Supabase URL:', supabaseUrl ? '✅ loaded' : '❌ missing')
console.log('🔧 Supabase Key:', supabaseAnonKey ? '✅ loaded' : '❌ missing')

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Проверка подключения
supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
        console.error('❌ Supabase connection error:', error.message)
    } else {
        console.log('✅ Supabase connected successfully')
    }
})