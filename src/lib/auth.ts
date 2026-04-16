import { NextAuthOptions } from "next-auth";
import { pgAdapter } from "./auth-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import bcrypt from "bcryptjs";
import GoogleProvider from "next-auth/providers/google";
import YandexProvider from "next-auth/providers/yandex";
import VkProvider from "next-auth/providers/vk";

export const authOptions: NextAuthOptions = {
    adapter: pgAdapter,
    providers: [
        CredentialsProvider({name: 'credentials', credentials: {email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' }, smsCode: { label: 'SMS Code', type: 'text' }},
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Введите email и пароль')
                }

                try {
                    
                    const user = await db.getUserByEmail(credentials.email)
                    
                    if (!user) {throw new Error('Пользователь не найден')}

                    if (!user.password) {throw new Error('Этот аккаунт создан через социальные сети. Используйте соответствующий вход.')}

                    const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

                    if (!isPasswordValid) {
                        throw new Error('Неверный пароль')
                    }

                    const testMode = process.env.SMS_TEST_MODE === 'true'
                    
                    if (!testMode && credentials.smsCode) {
                        if (credentials.smsCode !== user.sms_code) {throw new Error('Неверный SMS код')}
                        if (user.sms_code_expires && new Date(user.sms_code_expires) < new Date()) {throw new Error('SMS код истек')}
                    }

                    if (user.is_banned) {throw new Error('Аккаунт заблокирован')}

                    return {id: user.id, email: user.email, name: user.name || user.full_name || user.email?.split('@')[0], role: user.role || 'buyer', role_selected: user.role_selected || false, phone: user.phone || user.profile_phone, city: user.city, is_verified: user.master_verified || false, is_partner: user.master_partner || false}
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
        async jwt({ token, user, account, profile }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.roleSelected = user.role_selected
                token.phone = user.phone
                token.city = user.city
                token.is_verified = user.is_verified
                token.is_partner = user.is_partner

                if (account?.provider !== 'credentials' && !user.role_selected) {
                    token.requiresRoleSelection = true
                }
            }

            if (token.id) {
                try {
                    const dbUser = await db.getUserById(token.id as string)
                    if (dbUser) {
                        token.role = dbUser.role
                        token.roleSelected = dbUser.role_selected
                        token.is_verified = dbUser.master_verified || false
                        token.is_partner = dbUser.master_partner || false
                        token.is_banned = dbUser.is_banned || false
                    }
                } catch (error) {
                    console.error("Error updating token from DB:", error)
                }
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
            }

            return session
        },

        async signIn({ user, account, profile }) {
            if (account?.provider !== 'credentials') {
                try {
                    const existingUser = await db.getUserByEmail(user.email!)

                    if (!existingUser) {
                        user.role_selected = false
                        user.role = 'buyer'
                    } else {
                        user.id = existingUser.id
                        user.role = existingUser.role
                        user.role_selected = existingUser.role_selected
                    }
                }catch (error) {
                    console.error("Error in signIn callback:", error)
                    return false
                }
            }
            if (user.id) {
                try {
                    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
                
                    if (isValidUUID) {
                        const dbUser = await db.getUserById(user.id)
                        if (dbUser?.is_banned) {
                            return false
                        }
                    }
                } catch (error) {
                    console.error("Error checking ban status:", error)
                }
            }

            return true
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