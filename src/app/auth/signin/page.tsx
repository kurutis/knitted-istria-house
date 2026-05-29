'use client'

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import React, { useState, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { toast } from 'react-hot-toast'
import google from '../../../../public/google.svg'
import yandex from '../../../../public/yandex.svg'
import vk from '../../../../public/vk.svg'
import { PasswordIcon } from "@/components/icons/PasswordIcon"
import { UserIcon } from "@/components/icons/UserIcon"

function SignInForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    const verified = searchParams.get('verified')
    const [isMobile, setIsMobile] = useState(false)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

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
                        className="mx-auto w-20 h-20 sm:w-20 sm:h-20 bg-gradient-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
                    >
                        <UserIcon size={isMobile ? 36 : 32} color="white" />
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
                        <input
                            className="w-full p-2.5 sm:p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="ivan@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-text mb-1 sm:mb-2 text-xs sm:text-sm font-medium">Пароль</label>
                        <input
                            className="w-full p-2.5 sm:p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
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

                {/* Социальные кнопки - увеличенные иконки на мобильных */}
                <div className="flex items-center justify-center gap-6 sm:gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('google', { callbackUrl })}
                        className="p-2 sm:p-3 rounded-xl transition-all"
                    >
                        <Image src={google} alt="Google" width={isMobile ? 36 : 28} height={isMobile ? 36 : 28} className="w-9 h-9 sm:w-6 sm:h-6" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('yandex', { callbackUrl })}
                        className="p-2 sm:p-3 rounded-xl transition-all"
                    >
                        <Image src={yandex} alt="Yandex" width={isMobile ? 36 : 28} height={isMobile ? 36 : 28} className="w-9 h-9 sm:w-6 sm:h-6" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('vk', { callbackUrl })}
                        className="p-2 sm:p-3 rounded-xl transition-all"
                    >
                        <Image src={vk} alt="VK" width={isMobile ? 36 : 28} height={isMobile ? 36 : 28} className="w-9 h-9 sm:w-6 sm:h-6" />
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