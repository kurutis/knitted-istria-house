// lib/supabase-helpers.ts
import { supabase } from './supabase';
import { logError } from './error-logger';
import { sanitize } from './sanitize';

// Типы для обновлений
type UserUpdates = {
    role?: string;
    role_selected?: boolean;
    is_banned?: boolean;
    updated_at?: string;
};

type ProfileUpdates = {
    full_name?: string;
    phone?: string;
    city?: string;
    avatar_url?: string;
    updated_at?: string;
};

// ============================================
// Пользователи
// ============================================

export async function getUserById(userId: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                role,
                role_selected,
                is_banned,
                created_at,
                profiles (
                    full_name,
                    phone,
                    city,
                    avatar_url
                )
            `)
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        logError(`getUserById failed for ${userId}`, error);
        return null;
    }
}

export async function getUserByEmail(email: string) {
    try {
        const cleanEmail = sanitize.email(email);
        const { data, error } = await supabase
            .from('users')
            .select('id, email, role, role_selected, is_banned')
            .eq('email', cleanEmail)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        logError(`getUserByEmail failed for ${email}`, error);
        return null;
    }
}

export async function updateUser(userId: string, updates: UserUpdates) {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        logError(`updateUser failed for ${userId}`, error);
        return null;
    }
}

// ============================================
// Профили
// ============================================

export async function getProfile(userId: string) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        logError(`getProfile failed for ${userId}`, error);
        return null;
    }
}

export async function updateProfile(userId: string, updates: ProfileUpdates) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        logError(`updateProfile failed for ${userId}`, error);
        return null;
    }
}

// ============================================
// Мастера
// ============================================

export async function getMasterById(masterId: string) {
    try {
        const { data, error } = await supabase
            .from('masters')
            .select(`
                *,
                users!inner (
                    id,
                    email,
                    profiles (
                        full_name,
                        avatar_url,
                        city,
                        phone
                    )
                )
            `)
            .eq('user_id', masterId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        logError(`getMasterById failed for ${masterId}`, error);
        return null;
    }
}

export async function getMasterProducts(masterId: string, limit: number = 20, page: number = 1) {
    try {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        const { data, error, count } = await supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('master_id', masterId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .range(from, to);
        
        if (error) throw error;
        
        return {
            data: data?.map(p => ({ ...p, price: parseFloat(p.price) })) || [],
            pagination: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) }
        };
    } catch (error) {
        logError(`getMasterProducts failed for ${masterId}`, error);
        return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }
}

// ============================================
// Товары
// ============================================

type ProductImage = {
    id: string;
    image_url: string;
    sort_order: number;
};

export async function getProductById(productId: string) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`
                *,
                users!inner (
                    email,
                    profiles (
                        full_name,
                        avatar_url,
                        city
                    )
                ),
                product_images (
                    id,
                    image_url,
                    sort_order
                )
            `)
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        const images = data.product_images 
            ? [...data.product_images].sort((a: ProductImage, b: ProductImage) => a.sort_order - b.sort_order)
            : [];
        
        return {
            ...data,
            price: parseFloat(data.price),
            images
        };
    } catch (error) {
        logError(`getProductById failed for ${productId}`, error);
        return null;
    }
}

interface ProductFilters {
    category?: string;
    technique?: string;
    masterId?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sort?: string;
    page?: number;
    limit?: number;
}

export async function getProducts(filters?: ProductFilters) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    try {
        let query = supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('status', 'active');
        
        if (filters?.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }
        if (filters?.technique) {
            query = query.eq('technique', filters.technique);
        }
        if (filters?.masterId) {
            query = query.eq('master_id', filters.masterId);
        }
        if (filters?.minPrice !== undefined) {
            query = query.gte('price', filters.minPrice);
        }
        if (filters?.maxPrice !== undefined) {
            query = query.lte('price', filters.maxPrice);
        }
        if (filters?.search) {
            query = query.ilike('title', `%${filters.search}%`);
        }
        
        const sort = filters?.sort || 'newest';
        switch (sort) {
            case 'price_asc': query = query.order('price', { ascending: true }); break;
            case 'price_desc': query = query.order('price', { ascending: false }); break;
            case 'popular': query = query.order('views', { ascending: false }); break;
            default: query = query.order('created_at', { ascending: false });
        }
        
        const { data, error, count } = await query.range(from, to);
        
        if (error) throw error;
        
        return {
            data: data?.map(p => ({ ...p, price: parseFloat(p.price) })) || [],
            pagination: { total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) }
        };
    } catch (error) {
        logError('getProducts failed', error);
        return { data: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }
}

// ============================================
// Избранное - простое исправление без any
// ============================================

export async function getFavorites(userId: string) {
    try {
        const { data, error } = await supabase
            .from('favorites')
            .select(`
                product_id,
                created_at,
                products (
                    id,
                    title,
                    price,
                    main_image_url,
                    master_id
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    } catch (error) {
        logError(`getFavorites failed for ${userId}`, error);
        return [];
    }
}

export async function addToFavorites(userId: string, productId: string) {
    try {
        const { error } = await supabase
            .from('favorites')
            .insert({ user_id: userId, product_id: productId, created_at: new Date().toISOString() });
        
        if (error) throw error;
        return true;
    } catch (error) {
        logError(`addToFavorites failed`, error);
        return false;
    }
}

export async function removeFromFavorites(userId: string, productId: string) {
    try {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);
        
        if (error) throw error;
        return true;
    } catch (error) {
        logError(`removeFromFavorites failed`, error);
        return false;
    }
}

// Экспорт всех помощников
export const dbHelpers = {
    user: { getById: getUserById, getByEmail: getUserByEmail, update: updateUser },
    profile: { get: getProfile, update: updateProfile },
    master: { getById: getMasterById, getProducts: getMasterProducts },
    product: { getById: getProductById, getList: getProducts },
    favorites: { get: getFavorites, add: addToFavorites, remove: removeFromFavorites }
};