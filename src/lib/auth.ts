import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";
import GoogleProvider from "next-auth/providers/google";
import YandexProvider from "next-auth/providers/yandex";
import VkProvider from "next-auth/providers/vk";

// Вспомогательные функции для работы с пользователями через Supabase
async function getUserByEmail(email: string) {
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
                avatar_url,
                sms_code,
                sms_code_expires
            ),
            masters!left (
                is_verified,
                is_partner
            )
        `)
        .eq('email', email)
        .maybeSingle()

    if (error || !user) return null

    return {
        id: user.id,
        email: user.email,
        password: user.password_hash,
        role: user.role,
        role_selected: user.role_selected,
        is_banned: user.is_banned,
        created_at: user.created_at,
        updated_at: user.updated_at,
        name: user.profiles?.full_name,
        avatar_url: user.profiles?.avatar_url,
        phone: user.profiles?.phone,
        city: user.profiles?.city,
        sms_code: user.profiles?.sms_code,
        sms_code_expires: user.profiles?.sms_code_expires,
        master_verified: user.masters?.is_verified,
        master_partner: user.masters?.is_partner
    }
}

async function getUserById(id: string) {
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
        .maybeSingle()

    if (error || !user) return null

    return {
        id: user.id,
        email: user.email,
        password: user.password_hash,
        role: user.role,
        role_selected: user.role_selected,
        is_banned: user.is_banned,
        created_at: user.created_at,
        updated_at: user.updated_at,
        name: user.profiles?.full_name,
        phone: user.profiles?.phone,
        city: user.profiles?.city,
        address: user.profiles?.address,
        avatar_url: user.profiles?.avatar_url,
        newsletter_agreement: user.profiles?.newsletter_agreement,
        sms_code: user.profiles?.sms_code,
        sms_code_expires: user.profiles?.sms_code_expires,
        master_verified: user.masters?.is_verified,
        master_partner: user.masters?.is_partner,
        description: user.masters?.description,
        rating: user.masters?.rating,
        total_sales: user.masters?.total_sales
    }
}

// Функция для создания или обновления пользователя через OAuth
async function createOrUpdateOAuthUser(profile: any, provider: string) {
    try {
        console.log('📝 createOrUpdateOAuthUser called:', { email: profile.email, provider })
        
        // Ищем пользователя по email
        let user = await getUserByEmail(profile.email)
        
        if (!user) {
            console.log('👤 Creating new user...')
            
            // Создаем нового пользователя
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    id: profile.id, // Важно: используем ID из провайдера
                    email: profile.email,
                    role: 'buyer',
                    role_selected: false,
                    is_banned: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()
            
            if (createError) {
                console.error('❌ Error creating user:', createError)
                return null
            }
            
            console.log('✅ User created:', newUser.id)
            
            // Создаем профиль
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    user_id: newUser.id,
                    full_name: profile.name,
                    avatar_url: profile.image,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            
            if (profileError) {
                console.error('❌ Error creating profile:', profileError)
            } else {
                console.log('✅ Profile created')
            }
            
            user = {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
                role_selected: newUser.role_selected,
                is_banned: newUser.is_banned,
                name: profile.name,
                avatar_url: profile.image
            }
        } else {
            console.log('👤 User already exists:', user.id)
        }
        
        return user
    } catch (error) {
        console.error('❌ Error in createOrUpdateOAuthUser:', error)
        return null
    }
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
                    throw new Error('Введите email и пароль')
                }

                try {
                    const user = await getUserByEmail(credentials.email)
                    
                    if (!user) {
                        throw new Error('Пользователь не найден')
                    }

                    if (!user.password) {
                        throw new Error('Этот аккаунт создан через социальные сети. Используйте соответствующий вход.')
                    }

                    const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

                    if (!isPasswordValid) {
                        throw new Error('Неверный пароль')
                    }

                    const testMode = process.env.SMS_TEST_MODE === 'true'
                    
                    if (!testMode && credentials.smsCode) {
                        if (credentials.smsCode !== user.sms_code) {
                            throw new Error('Неверный SMS код')
                        }
                        if (user.sms_code_expires && new Date(user.sms_code_expires) < new Date()) {
                            throw new Error('SMS код истек')
                        }
                    }

                    if (user.is_banned) {
                        throw new Error('Аккаунт заблокирован')
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name || user.email?.split('@')[0],
                        role: user.role || 'buyer',
                        role_selected: user.role_selected || false,
                        phone: user.phone,
                        city: user.city,
                        is_verified: user.master_verified || false,
                        is_partner: user.master_partner || false,
                        image: user.avatar_url || null
                    }
                } catch (error: any) {
                    throw new Error(error.message || 'Ошибка аутентификации')
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
                }
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
                }
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
                }
            }
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async signIn({ user, account }) {
            // Для OAuth провайдеров создаем или обновляем пользователя
            if (account?.provider !== 'credentials' && user.email) {
                try {
                    const dbUser = await createOrUpdateOAuthUser({
                        email: user.email,
                        name: user.name,
                        image: user.image
                    }, account.provider)
                    
                    if (!dbUser) {
                        return false
                    }
                    
                    user.id = dbUser.id
                    user.role = dbUser.role
                    user.role_selected = dbUser.role_selected
                    user.image = dbUser.avatar_url
                    
                    return true
                } catch (error) {
                    console.error("Error in OAuth signIn:", error)
                    return false
                }
            }
            
            // Проверка бана для всех пользователей
            if (user.id) {
                try {
                    const dbUser = await getUserById(user.id)
                    if (dbUser?.is_banned) {
                        return false
                    }
                } catch (error) {
                    console.error("Error checking ban status:", error)
                }
            }
            
            return true
        },

        async jwt({ token, user, account, trigger, session: triggerSession }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.roleSelected = user.role_selected
                token.phone = user.phone
                token.city = user.city
                token.is_verified = user.is_verified
                token.is_partner = user.is_partner
                token.image = user.image || null  // <-- важно!

                if (account?.provider !== 'credentials' && !user.role_selected) {
                    token.requiresRoleSelection = true
                }
            }

            // Получаем свежие данные из БД
            if (token.id) {
                try {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('avatar_url, full_name')
                        .eq('user_id', token.id)
                        .single()
                    
                    if (!error && profile) {
                        if (profile.avatar_url) {
                            token.image = profile.avatar_url  // <-- обновляем из БД
                        }
                        if (profile.full_name && !token.name) {
                            token.name = profile.full_name
                        }
                    }
                } catch (error) {
                    console.error('Error fetching profile:', error)
                }
            }

            // Обновление при trigger "update"
            if (trigger === "update" && triggerSession?.image) {
                token.image = triggerSession.image
            }

            return token
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.roleSelected = token.roleSelected as boolean
                session.user.phone = token.phone as string
                session.user.city = token.city as string
                session.user.is_verified = token.is_verified as boolean
                session.user.is_partner = token.is_partner as boolean
                session.user.is_banned = token.is_banned as boolean
                session.user.requiresRoleSelection = token.requiresRoleSelection as boolean
                session.user.image = token.image as string || null  // <-- важно!
                session.user.name = token.name as string || session.user.name
            }
            return session
        },

        async redirect({ url, baseUrl }) {
            if (url.startsWith('/')) return `${baseUrl}${url}`
            else if (new URL(url).origin === baseUrl) return url
            return baseUrl
        }
    },
    pages: {
        signIn: "/auth/signin",
        signUp: '/auth/signup',
        error: "/auth/error",
        newUser: '/auth/role-selection'
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development'
}