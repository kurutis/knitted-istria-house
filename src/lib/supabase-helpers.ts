import { supabase } from './supabase';

// Общие функции для работы с БД
export const dbHelpers = {
    async getMasters() {
        const { data, error } = await supabase
            .from('users')
            .select('*, profiles(*), masters(*)')
            .eq('role', 'master');
        return { data, error };
    },

    async getProducts(filters?: any) {
        let query = supabase
            .from('products')
            .select('*, masters!inner(user_id), profiles!inner(full_name)')
            .eq('status', 'active');
        
        if (filters?.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }
        
        const { data, error } = await query;
        return { data, error };
    },

    async getBlogPosts() {
        const { data, error } = await supabase
            .from('blog_posts')
            .select('*, users!inner(email), profiles!inner(full_name, avatar_url)')
            .eq('status', 'published')
            .order('created_at', { ascending: false });
        return { data, error };
    }
};