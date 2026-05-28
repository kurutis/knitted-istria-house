'use client'

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import React, { useState, Suspense } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from 'react-hot-toast'
import { LockIcon } from "@/components/icons/LockIcon"
import { MailIcon } from "@/components/icons/MailIcon"
import { UserIcon } from "@/components/icons/UserIcon"

function SignInForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    const verified = searchParams.get('verified')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    React.useEffect(() => {
        if (verified === 'true') {
            toast.success('Аккаунт успешно подтвержден!')
        }
    }, [verified])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                email: email,
                password: password,
                redirect: false,
                callbackUrl
            })

            if (result?.error) {
                setError(result.error)
                toast.error(result.error)
            } else if (result?.ok) {
                toast.success('Вход выполнен успешно!')
                router.push(callbackUrl)
                router.refresh()
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-main flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full space-y-6 sm:space-y-8 bg-main rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100"
            >
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
                    >
                        <LockIcon size={32} color="white" />
                    </motion.div>
                    <h2 className="font-montserrat font-bold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Добро пожаловать
                    </h2>
                    <p className="mt-1 sm:mt-2 text-firm-gray text-xs sm:text-sm">Войдите через email</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-red-50 border border-red-200 rounded-xl p-3"
                    >
                        <p className="text-firm-red text-xs sm:text-sm text-center">{error}</p>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
                    <div>
                        <label className="block text-text mb-1 sm:mb-2 text-xs sm:text-sm font-medium">
                            Email
                        </label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <MailIcon size={16} color="#9CA3AF" />
                            </div>
                            <input
                                className="w-full p-2.5 sm:p-3 pl-9 sm:pl-10 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="ivan@example.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-text mb-1 sm:mb-2 text-xs sm:text-sm font-medium">Пароль</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                <LockIcon size={16} color="#9CA3AF" />
                            </div>
                            <input
                                className="w-full p-2.5 sm:p-3 pl-9 sm:pl-10 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 appearance-none border-2 border-firm-orange rounded bg-main checked:bg-firm-orange checked:border-firm-orange transition-all cursor-pointer"
                                />
                                {rememberMe && (
                                    <svg className="absolute w-3 h-3 text-main left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-xs sm:text-sm text-firm-gray">Запомнить меня</span>
                        </label>

                        <Link href="/auth/forgot-password" className="text-xs sm:text-sm text-firm-pink hover:text-firm-orange transition-colors text-center sm:text-right">
                            Забыли пароль?
                        </Link>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Вход...</span>
                            </div>
                        ) : (
                            'Войти'
                        )}
                    </motion.button>
                </form>

                <div className="relative my-4 sm:my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs sm:text-sm">
                        <span className="px-3 sm:px-4 bg-main text-firm-gray">Или продолжить через</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('google', { callbackUrl })}
                        className="flex items-center justify-center gap-1 sm:gap-2 p-2.5 sm:p-3 border-2 border-gray-200 rounded-xl hover:border-firm-orange hover:bg-firm-orange/5 transition-all"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium text-firm-gray">Google</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('yandex', { callbackUrl })}
                        className="flex items-center justify-center gap-1 sm:gap-2 p-2.5 sm:p-3 border-2 border-gray-200 rounded-xl hover:border-firm-orange hover:bg-firm-orange/5 transition-all"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.04 12.15c-.08 2.87.88 5.64 2.57 7.9 1.04 1.39 2.32 2.5 3.74 3.27 1.42.77 2.96 1.17 4.5 1.17.84 0 1.68-.11 2.5-.33 1.22-.33 2.36-.9 3.33-1.67.97-.77 1.78-1.72 2.37-2.81.6-1.09.96-2.29 1.07-3.53h-5.7v-3.45h8.9c.08.56.12 1.12.12 1.69 0 3.33-1.14 6.53-3.23 9.04-1.75 2.1-4.1 3.68-6.78 4.56-1.26.42-2.58.63-3.9.63-1.52 0-3.02-.28-4.43-.83-1.42-.55-2.68-1.35-3.77-2.36-1.09-1-1.99-2.19-2.68-3.51-.7-1.32-1.11-2.76-1.23-4.24.02-.86.11-1.72.26-2.57.16-.85.38-1.67.67-2.48.29-.8.65-1.57 1.06-2.29.41-.73.88-1.42 1.39-2.07.94-1.18 2.04-2.21 3.26-3.05 1.21-.84 2.56-1.48 3.98-1.9 1.42-.42 2.9-.63 4.37-.63 2.37 0 4.67.56 6.73 1.63 1.19.62 2.26 1.45 3.17 2.44l-3.31 2.95c-.68-.73-1.5-1.31-2.41-1.73-1.15-.53-2.39-.8-3.65-.8-1.18 0-2.34.22-3.42.66-1.08.44-2.02 1.07-2.81 1.85-.79.78-1.43 1.71-1.89 2.73-.46 1.02-.74 2.13-.83 3.27z" fill="#FC3F1D" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium text-firm-gray">Яндекс</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('vk', { callbackUrl })}
                        className="flex items-center justify-center gap-1 sm:gap-2 p-2.5 sm:p-3 border-2 border-gray-200 rounded-xl hover:border-firm-orange hover:bg-firm-orange/5 transition-all"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.579 6.855c.14-.465 0-.805-.655-.805h-2.17c-.55 0-.805.29-.94.61 0 0-1.1 2.68-2.66 4.42-.5.5-.73.66-1 .66-.14 0-.34-.16-.34-.62v-4.4c0-.55-.16-.805-.62-.805h-3.4c-.34 0-.55.26-.55.5 0 .53.78.65.86 2.14v3.23c0 .71-.13.84-.4.84-.73 0-2.51-2.69-3.57-5.76-.2-.59-.41-.82-.96-.82h-2.18c-.66 0-.79.29-.79.61 0 .57.73 3.41 3.41 7.16 1.79 2.57 4.31 3.97 6.6 3.97 1.38 0 1.55-.31 1.55-.84v-1.94c0-.62.13-.74.57-.74.32 0 .88.16 2.18 1.39 1.48 1.48 1.73 2.14 2.56 2.14h2.17c.66 0 .99-.31.8-.92-.21-.61-1-1.49-2.02-2.54-.52-.54-1.29-1.12-1.52-1.41-.33-.37-.24-.53 0-.86 0 0 2.67-3.77 2.95-5.05z" fill="#4C75A3" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium text-firm-gray">VK</span>
                    </motion.button>
                </div>

                <p className="text-center text-xs sm:text-sm text-firm-gray mt-4 sm:mt-6">
                    Нет аккаунта?{' '}
                    <Link href="/auth/signup" className="font-medium text-firm-orange hover:text-firm-pink transition-colors">
                        Зарегистрироваться
                    </Link>
                </p>

                <div className="text-center">
                    <Link href="/" className="text-xs sm:text-sm text-firm-gray hover:text-firm-orange transition-colors">
                        ← Вернуться на главную
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh] text-firm-gray">Загрузка...</div>}>
            <SignInForm />
        </Suspense>
    )
}