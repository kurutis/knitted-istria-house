// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";
import GoogleProvider from "next-auth/providers/google";
import YandexProvider from "next-auth/providers/yandex";
import VkProvider from "next-auth/providers/vk";
import { logError, logInfo } from "./error-logger";

// Константы
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 дней
const SMS_CODE_EXPIRY_MINUTES = 10;

// Типы
export interface UserData {
    id: string;
    email: string;
    password?: string | null;
    role: string;
    role_selected: boolean;
    is_banned: boolean;
    created_at: string;
    updated_at: string;
    name?: string | null;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
    avatar_url?: string | null;
    newsletter_agreement?: boolean;
    // Мастер поля
    master_verified?: boolean;
    master_partner?: boolean;
    description?: string | null;
    rating?: number;
    total_sales?: number;
    // SMS
    sms_code?: string | null;
    sms_code_expires?: string | null;
}

interface ProfileUpdateData {
    updated_at: string;
    full_name?: string | null;
    avatar_url?: string | null;
}

// Вспомогательные функции
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

// Получение пользователя по email
async function getUserByEmail(email: string): Promise<UserData | null> {
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
                    newsletter_agreement,
                    sms_code,
                    sms_code_expires
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
            if (error) logError('Error fetching user by email', error, 'warning');
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
            sms_code: user.profiles?.[0]?.sms_code,
            sms_code_expires: user.profiles?.[0]?.sms_code_expires,
            master_verified: user.masters?.[0]?.is_verified || false,
            master_partner: user.masters?.[0]?.is_partner || false,
            description: user.masters?.[0]?.description,
            rating: user.masters?.[0]?.rating || 0,
            total_sales: user.masters?.[0]?.total_sales || 0
        };
    } catch (error) {
        logError('Error in getUserByEmail', error);
        return null;
    }
}

// Получение пользователя по ID
async function getUserById(id: string): Promise<UserData | null> {
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
                    newsletter_agreement,
                    sms_code,
                    sms_code_expires
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
            if (error) logError('Error fetching user by id', error, 'warning');
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
            sms_code: user.profiles?.[0]?.sms_code,
            sms_code_expires: user.profiles?.[0]?.sms_code_expires,
            master_verified: user.masters?.[0]?.is_verified || false,
            master_partner: user.masters?.[0]?.is_partner || false,
            description: user.masters?.[0]?.description,
            rating: user.masters?.[0]?.rating || 0,
            total_sales: user.masters?.[0]?.total_sales || 0
        };
    } catch (error) {
        logError('Error in getUserById', error);
        return null;
    }
}

// Создание или обновление пользователя через OAuth
async function createOrUpdateOAuthUser(profile: { email: string; name?: string | null; image?: string | null }, provider: string): Promise<UserData | null> {
    try {
        let user = await getUserByEmail(profile.email);
        
        if (!user) {
            const now = new Date().toISOString();
            
            // Создаем пользователя
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
            
            if (createError) {
                logError('Error creating OAuth user', createError);
                return null;
            }
            
            // Создаем профиль
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: newUser.id,
                    full_name: profile.name || null,
                    avatar_url: profile.image || null,
                    created_at: now,
                    updated_at: now
                });
            
            if (profileError) {
                logError('Error creating profile for OAuth user', profileError, 'warning');
            }
            
            user = {
                id: newUser.id,
                email: newUser.email,
                role: 'buyer',
                role_selected: false,
                is_banned: false,
                created_at: now,
                updated_at: now,
                name: profile.name,
                avatar_url: profile.image
            };
            
            logInfo('New OAuth user created', { userId: user.id, provider, email: profile.email });
        } else {
            // Обновляем существующий профиль, если нужно
            if (profile.name || profile.image) {
                const updateData: ProfileUpdateData = { updated_at: new Date().toISOString() };
                if (profile.name && !user.name) updateData.full_name = profile.name;
                if (profile.image && !user.avatar_url) updateData.avatar_url = profile.image;
                
                if (Object.keys(updateData).length > 1) {
                    await supabase
                        .from('profiles')
                        .update(updateData)
                        .eq('user_id', user.id);
                }
            }
        }
        
        return user;
    } catch (error) {
        logError('Error in createOrUpdateOAuthUser', error);
        return null;
    }
}

// Валидация SMS кода
function validateSMSCode(inputCode: string, storedCode: string | null | undefined, expiresAt: string | null | undefined): boolean {
    if (!storedCode || !expiresAt) return false;
    if (inputCode !== storedCode) return false;
    if (new Date(expiresAt) < new Date()) return false;
    return true;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                smsCode: { label: 'SMS Code', type: 'text' }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Введите email и пароль');
                }

                try {
                    const user = await getUserByEmail(credentials.email);
                    
                    if (!user) {
                        throw new Error('Пользователь не найден');
                    }

                    if (user.is_banned) {
                        throw new Error('Аккаунт заблокирован');
                    }

                    if (!user.password) {
                        throw new Error('Этот аккаунт создан через социальные сети. Используйте соответствующий вход.');
                    }

                    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isPasswordValid) {
                        throw new Error('Неверный пароль');
                    }

                    // Проверка SMS кода
                    const testMode = process.env.SMS_TEST_MODE === 'true';
                    if (!testMode && credentials.smsCode) {
                        if (!validateSMSCode(credentials.smsCode, user.sms_code, user.sms_code_expires)) {
                            throw new Error('Неверный или истекший SMS код');
                        }
                        
                        // Очищаем использованный код
                        await supabase
                            .from('profiles')
                            .update({ sms_code: null, sms_code_expires: null })
                            .eq('user_id', user.id);
                    }

                    logInfo('User logged in', { userId: user.id, email: user.email });
                    
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
                        image: user.avatar_url || undefined   
                    };
                } catch (error) {
                    logError('Credentials authorization error', error, 'warning');
                    const errorMessage = error instanceof Error ? error.message : 'Ошибка аутентификации';
                    throw new Error(errorMessage);
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    role: 'buyer',
                    role_selected: false
                };
            }
        }),
        YandexProvider({
            clientId: process.env.YANDEX_CLIENT_ID || "",
            clientSecret: process.env.YANDEX_CLIENT_SECRET || "",
            profile(profile) {
                return {
                    id: profile.id,
                    name: profile.real_name || profile.display_name,
                    email: profile.default_email,
                    image: profile.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200` : null,
                    role: 'buyer',
                    role_selected: false
                };
            }
        }),
        VkProvider({
            clientId: process.env.VK_CLIENT_ID || "",
            clientSecret: process.env.VK_CLIENT_SECRET || "",
            profile(profile) {
                return {
                    id: profile.id.toString(),
                    name: `${profile.first_name} ${profile.last_name}`,
                    email: profile.email || `${profile.id}@vk.com`,
                    image: profile.photo_max,
                    role: 'buyer',
                    role_selected: false
                };
            }
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: SESSION_MAX_AGE,
    },
    callbacks: {
        async signIn({ user, account }) {
            // Для OAuth провайдеров создаем или обновляем пользователя
            if (account && account.provider !== 'credentials' && user.email) {
                try {
                    const dbUser = await createOrUpdateOAuthUser({
                        email: user.email,
                        name: user.name,
                        image: user.image
                    }, account.provider);
                    
                    if (!dbUser) {
                        logError('OAuth signIn failed - user creation failed', { provider: account.provider, email: user.email });
                        return false;
                    }
                    
                    user.id = dbUser.id;
                    user.role = dbUser.role;
                    user.role_selected = dbUser.role_selected;
                    user.image = dbUser.avatar_url;
                    
                    return true;
                } catch (error) {
                    logError('Error in OAuth signIn', error);
                    return false;
                }
            }
            
            // Проверка бана для всех пользователей
            if (user.id) {
                try {
                    const dbUser = await getUserById(user.id);
                    if (dbUser?.is_banned) {
                        logInfo('Banned user attempted to sign in', { userId: user.id, email: user.email });
                        return false;
                    }
                } catch (error) {
                    logError('Error checking ban status', error);
                }
            }
            
            return true;
        },

        async jwt({ token, user, account, trigger, session: triggerSession }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.roleSelected = user.role_selected;
                token.phone = user.phone;
                token.city = user.city;
                token.is_verified = user.is_verified;
                token.is_partner = user.is_partner;
                token.image = user.image ?? undefined;

                if (account?.provider !== 'credentials' && !user.role_selected) {
                    token.requiresRoleSelection = true;
                }
            }

            // Получаем свежие данные из БД при каждом обновлении токена
            if (token.id && !trigger) {
                try {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('avatar_url, full_name')
                        .eq('user_id', token.id as string)
                        .maybeSingle();
                    
                    if (!error && profile) {
                        if (profile.avatar_url) {
                            token.image = profile.avatar_url;
                        }
                        if (profile.full_name && !token.name) {
                            token.name = profile.full_name;
                        }
                    }
                } catch (error) {
                    // Не логируем ошибку, так как это может быть часто
                }
            }

            // Обновление при trigger "update"
            if (trigger === "update" && triggerSession) {
                if (triggerSession.image) token.image = triggerSession.image;
                if (triggerSession.name) token.name = triggerSession.name;
                if (triggerSession.role) token.role = triggerSession.role;
                if (triggerSession.roleSelected !== undefined) token.roleSelected = triggerSession.roleSelected;
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
                session.user.is_banned = token.is_banned as boolean;  // теперь тип существует
                session.user.requiresRoleSelection = token.requiresRoleSelection as boolean;
                session.user.image = token.image as string || null;
                session.user.name = (token.name as string) || session.user.name;
            }
            return session;
        },

        async redirect({ url, baseUrl }) {
            // Безопасный редирект
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        }
    },
    pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
        newUser: '/auth/role-selection'
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
    // Добавляем логирование
    events: {
        async signIn({ user }) {
            logInfo('User signed in', { userId: user.id, email: user.email });
        },
        async signOut({ token }) {
            logInfo('User signed out', { userId: token.sub });
        }
    }
};