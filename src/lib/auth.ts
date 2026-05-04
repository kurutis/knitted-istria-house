// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";
import GoogleProvider from "next-auth/providers/google";
import YandexProvider from "next-auth/providers/yandex";
import VkProvider from "next-auth/providers/vk";

// Константы
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

// Вспомогательные функции
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

// Получение пользователя по email
async function getUserByEmail(email: string) {
    try {
        const normalizedEmail = normalizeEmail(email);
        
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                password_hash,
                role,
                role_selected,
                is_banned,
                created_at,
                updated_at,
                profiles!left (
                    full_name,
                    phone,
                    city,
                    address,
                    avatar_url,
                    newsletter_agreement
                ),
                masters!left (
                    is_verified,
                    is_partner,
                    description,
                    rating,
                    total_sales
                )
            `)
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (error || !user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            password: user.password_hash,
            role: user.role || 'buyer',
            role_selected: user.role_selected || false,
            is_banned: user.is_banned || false,
            created_at: user.created_at,
            updated_at: user.updated_at,
            name: user.profiles?.[0]?.full_name,
            avatar_url: user.profiles?.[0]?.avatar_url,
            phone: user.profiles?.[0]?.phone,
            city: user.profiles?.[0]?.city,
            address: user.profiles?.[0]?.address,
            newsletter_agreement: user.profiles?.[0]?.newsletter_agreement,
            master_verified: user.masters?.[0]?.is_verified || false,
            master_partner: user.masters?.[0]?.is_partner || false,
            description: user.masters?.[0]?.description,
            rating: user.masters?.[0]?.rating || 0,
            total_sales: user.masters?.[0]?.total_sales || 0
        };
    } catch (error) {
        console.error('Error in getUserByEmail:', error);
        return null;
    }
}

// Получение пользователя по ID
async function getUserById(id: string) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                password_hash,
                role,
                role_selected,
                is_banned,
                created_at,
                updated_at,
                profiles!left (
                    full_name,
                    phone,
                    city,
                    address,
                    avatar_url,
                    newsletter_agreement
                ),
                masters!left (
                    description,
                    is_verified,
                    is_partner,
                    rating,
                    total_sales
                )
            `)
            .eq('id', id)
            .maybeSingle();

        if (error || !user) {
            return null;
        }

        return {
            id: user.id,
            email: user.email,
            password: user.password_hash,
            role: user.role || 'buyer',
            role_selected: user.role_selected || false,
            is_banned: user.is_banned || false,
            created_at: user.created_at,
            updated_at: user.updated_at,
            name: user.profiles?.[0]?.full_name,
            avatar_url: user.profiles?.[0]?.avatar_url,
            phone: user.profiles?.[0]?.phone,
            city: user.profiles?.[0]?.city,
            address: user.profiles?.[0]?.address,
            newsletter_agreement: user.profiles?.[0]?.newsletter_agreement,
            master_verified: user.masters?.[0]?.is_verified || false,
            master_partner: user.masters?.[0]?.is_partner || false,
            description: user.masters?.[0]?.description,
            rating: user.masters?.[0]?.rating || 0,
            total_sales: user.masters?.[0]?.total_sales || 0
        };
    } catch (error) {
        console.error('Error in getUserById:', error);
        return null;
    }
}

// Создание или обновление пользователя через OAuth
async function createOrUpdateOAuthUser(profile: { email: string; name?: string | null; image?: string | null }, provider: string) {
    try {
        let user = await getUserByEmail(profile.email);
        
        if (!user) {
            const now = new Date().toISOString();
            
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email: normalizeEmail(profile.email),
                    role: 'buyer',
                    role_selected: false,
                    is_banned: false,
                    created_at: now,
                    updated_at: now
                })
                .select()
                .single();
            
            if (createError || !newUser) {
                return null;
            }
            
            await supabase
                .from('profiles')
                .insert({
                    user_id: newUser.id,
                    full_name: profile.name || null,
                    avatar_url: profile.image || null,
                    created_at: now,
                    updated_at: now
                });
            
            user = {
                id: newUser.id,
                email: newUser.email,
                password: null,
                role: 'buyer',
                role_selected: false,
                is_banned: false,
                created_at: now,
                updated_at: now,
                name: profile.name,
                avatar_url: profile.image,
                phone: null,
                city: null,
                address: null,
                newsletter_agreement: false,
                master_verified: false,
                master_partner: false,
                description: null,
                rating: 0,
                total_sales: 0
            };
        }
        
        return user;
    } catch (error) {
        console.error('Error in createOrUpdateOAuthUser:', error);
        return null;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Введите email и пароль');
                }

                const user = await getUserByEmail(credentials.email);
                
                if (!user) {
                    throw new Error('Пользователь не найден');
                }

                if (user.is_banned) {
                    throw new Error('Аккаунт заблокирован');
                }

                if (!user.password) {
                    throw new Error('Этот аккаунт создан через социальные сети');
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                if (!isPasswordValid) {
                    throw new Error('Неверный пароль');
                }
                
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name || user.email?.split('@')[0],
                    role: user.role || 'buyer',
                    role_selected: user.role_selected || false,
                    phone: user.phone || undefined,
                    city: user.city || undefined,
                    is_verified: user.master_verified || false,
                    is_partner: user.master_partner || false,
                    is_banned: user.is_banned || false,
                    image: user.avatar_url || undefined   
                };
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
        YandexProvider({
            clientId: process.env.YANDEX_CLIENT_ID || "",
            clientSecret: process.env.YANDEX_CLIENT_SECRET || "",
        }),
        VkProvider({
            clientId: process.env.VK_CLIENT_ID || "",
            clientSecret: process.env.VK_CLIENT_SECRET || "",
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: SESSION_MAX_AGE,
    },
    callbacks: {
        async signIn({ user, account }) {
            if (account && account.provider !== 'credentials' && user.email) {
                const dbUser = await createOrUpdateOAuthUser({
                    email: user.email,
                    name: user.name,
                    image: user.image
                }, account.provider);
                
                if (!dbUser) {
                    return false;
                }
                
                user.id = dbUser.id;
                user.role = dbUser.role;
                user.image = dbUser.avatar_url;
                return true;
            }
            
            if (user.id) {
                const dbUser = await getUserById(user.id);
                if (dbUser?.is_banned) {
                    return false;
                }
            }
            
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.roleSelected = user.role_selected;
                token.phone = user.phone;
                token.city = user.city;
                token.is_verified = user.is_verified;
                token.is_partner = user.is_partner;
                token.is_banned = user.is_banned;
                token.image = user.image || undefined;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.roleSelected = token.roleSelected as boolean;
                session.user.phone = token.phone as string;
                session.user.city = token.city as string;
                session.user.is_verified = token.is_verified as boolean;
                session.user.is_partner = token.is_partner as boolean;
                session.user.is_banned = token.is_banned as boolean;
                session.user.image = token.image as string || null;
            }
            return session;
        }
    },
    pages: {
        signIn: "/auth/signin",
        error: "/auth/signin",
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
};