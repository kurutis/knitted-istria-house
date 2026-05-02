'use client'

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import React, { useState, Suspense } from "react"
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion"
import { toast } from 'react-hot-toast'
import google from '../../../../public/google.svg'
import yandex from '../../../../public/yandex.svg'
import vk from '../../../../public/vk.svg'

// Компонент, который использует useSearchParams
function SignInForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/'
    const verified = searchParams.get('verified')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [smsCode, setSmsCode] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showSms, setShowSms] = useState(false)

    React.useEffect(() => {
        if (verified === 'true') {
            toast.success('Аккаунт успешно подтвержден!')
        }
    }, [verified])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try{
            const result = await signIn('credentials', {email, password, smsCode, redirect: false, callbackUrl})

            if(result?.error){
                setError(result.error)
                toast.error(result.error)
            } else if (result?.ok){
                toast.success('Вход выполнен успешно!')
                router.push(callbackUrl)
                router.refresh()
            }
        }catch (err: any){
            setError(err.message || 'Произошла ошибка')
            toast.error(err.message || 'Произошла ошибка')
        }finally{
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8"
            >
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="mx-auto w-20 h-20 bg-gradient-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center mb-4"
                    >
                        <span className="text-3xl">🔐</span>
                    </motion.div>
                    <h2 className="font-['Montserrat_Alternates'] font-bold text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Добро пожаловать
                    </h2>
                    <p className="mt-2 text-gray-500 text-sm">Войдите в свой аккаунт</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-red-50 border border-red-200 rounded-xl p-3"
                    >
                        <p className="text-red-600 text-sm text-center">{error}</p>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Email адрес</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Пароль</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 appearance-none border-2 border-firm-orange rounded bg-white checked:bg-firm-orange checked:border-firm-orange transition-all cursor-pointer"
                                />
                                {rememberMe && (
                                    <svg className="absolute w-3 h-3 text-white left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-sm text-gray-600">Запомнить меня</span>
                        </label>

                        <Link href="/auth/forgot-password" className="text-sm text-firm-pink hover:text-firm-orange transition-colors">
                            Забыли пароль?
                        </Link>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Вход...</span>
                            </div>
                        ) : (
                            'Войти'
                        )}
                    </motion.button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-400">Или продолжить через</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('google', { callbackUrl })}
                        className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        <Image src={google} alt="Google" width={24} height={24} />
                        <span className="text-sm font-medium text-gray-700">Google</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('yandex', { callbackUrl })}
                        className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        <Image src={yandex} alt="Yandex" width={24} height={24} />
                        <span className="text-sm font-medium text-gray-700">Яндекс</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => signIn('vk', { callbackUrl })}
                        className="flex items-center justify-center gap-2 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        <Image src={vk} alt="VK" width={24} height={24} />
                        <span className="text-sm font-medium text-gray-700">VK</span>
                    </motion.button>
                </div>

                <p className="text-center text-sm text-gray-600 mt-6">
                    Нет аккаунта?{' '}
                    <Link href="/auth/signup" className="font-medium text-firm-orange hover:text-firm-pink transition-colors">
                        Зарегистрироваться
                    </Link>
                </p>

                <div className="text-center">
                    <Link href="/" className="text-sm text-gray-400 hover:text-firm-orange transition-colors">
                        ← Вернуться на главную
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}

// Основной компонент с Suspense
export default function SignInPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]">Загрузка...</div>}>
            <SignInForm />
        </Suspense>
    )
}