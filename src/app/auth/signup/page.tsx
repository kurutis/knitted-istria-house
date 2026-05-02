'use client'

import { useRouter } from "next/navigation"
import React, { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from 'react-hot-toast'

export default function SignUpPage() {
    const router = useRouter()
    const [step, setStep] = useState<'form' | 'verify'>('form')
    const [verifyMethod, setVerifyMethod] = useState<'sms' | 'email' | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [code, setCode] = useState('')
    const [resendTimer, setResendTimer] = useState(0)
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        password: '',
        confirmPassword: '',
        role: 'buyer',
        newsletterAgreement: false,
        verificationMethod: 'sms'
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        if (type === 'checkbox') {
            setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked })
        } else {
            setFormData({ ...formData, [name]: value })
        }
    }

    // Валидация email
    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    // Валидация телефона
    const isValidPhone = (phone: string) => {
        const cleaned = phone.replace(/[^0-9]/g, '')
        return cleaned.length >= 10 && cleaned.length <= 12
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        // Валидация
        if (!isValidEmail(formData.email)) {
            setError('Введите корректный email адрес')
            toast.error('Введите корректный email адрес')
            setLoading(false)
            return
        }

        if (!isValidPhone(formData.phone)) {
            setError('Введите корректный номер телефона')
            toast.error('Введите корректный номер телефона')
            setLoading(false)
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Пароли не совпадают')
            toast.error('Пароли не совпадают')
            setLoading(false)
            return
        }

        if (formData.password.length < 6) {
            setError('Пароль должен быть не менее 6 символов')
            toast.error('Пароль должен быть не менее 6 символов')
            setLoading(false)
            return
        }

        try {
            const response = await fetch("/api/auth/register", {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    verificationMethod: formData.verificationMethod
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка регистрации')
            }

            setUserId(data.userId)
            setVerifyMethod(formData.verificationMethod)
            setStep('verify')
            startResendTimer()
            toast.success(data.message || 'Код отправлен!')

        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        if (!code || code.length !== 4) {
            toast.error('Введите корректный код из 4 цифр')
            return
        }

        setLoading(true)
        try {
            const response = await fetch("/api/auth/verify", {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    code,
                    method: verifyMethod
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка верификации')
            }

            toast.success('Аккаунт успешно подтвержден!')
            router.push(`/auth/signin?verified=true`)

        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleResendCode = async () => {
        if (resendTimer > 0) return
        
        try {
            const response = await fetch("/api/auth/resend-verification", {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    method: verifyMethod,
                    email: formData.email,
                    phone: formData.phone,
                    name: formData.name
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка отправки')
            }

            toast.success('Код отправлен повторно!')
            startResendTimer()

        } catch (err: any) {
            toast.error(err.message)
        }
    }

    const startResendTimer = () => {
        setResendTimer(60)
        const timer = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    // Страница верификации кода
    if (step === 'verify') {
        const contact = verifyMethod === 'sms' ? formData.phone : formData.email
        const icon = verifyMethod === 'sms' ? '📱' : '📧'
        
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8"
                >
                    <div className="text-center">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center mb-4">
                            <span className="text-3xl">{icon}</span>
                        </div>
                        <h2 className="font-['Montserrat_Alternates'] font-bold text-2xl">
                            Подтверждение
                        </h2>
                        <p className="text-gray-500 text-sm mt-2">
                            Мы отправили код подтверждения на <br />
                            <strong className="text-firm-orange">
                                {verifyMethod === 'sms' ? formData.phone : formData.email}
                            </strong>
                        </p>
                        {process.env.NODE_ENV === 'development' && (
                            <p className="text-xs text-gray-400 mt-2">
                                Тестовый код: <span className="text-firm-orange font-bold">1111</span>
                            </p>
                        )}
                    </div>

                    <div className="mt-6">
                        <label className="block text-gray-700 mb-2 text-sm font-medium">
                            Код подтверждения
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 text-center text-2xl tracking-widest"
                            placeholder="0000"
                            maxLength={4}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3"
                        >
                            <p className="text-red-600 text-sm text-center">{error}</p>
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleVerify}
                        disabled={loading || code.length !== 4}
                        className="w-full mt-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Проверка...</span>
                            </div>
                        ) : (
                            'Подтвердить'
                        )}
                    </motion.button>

                    <div className="text-center mt-4">
                        <button
                            onClick={handleResendCode}
                            disabled={resendTimer > 0}
                            className="text-sm text-gray-500 hover:text-firm-orange transition-colors disabled:opacity-50"
                        >
                            {resendTimer > 0 
                                ? `Отправить повторно через ${resendTimer} сек`
                                : 'Отправить код повторно'}
                        </button>
                    </div>

                    <div className="text-center mt-4">
                        <Link href="/auth/signin" className="text-sm text-gray-400 hover:text-firm-orange">
                            ← Вернуться на страницу входа
                        </Link>
                    </div>
                </motion.div>
            </div>
        )
    }

    // Форма регистрации
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center py-12 px-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8"
            >
                <div className="text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center mb-4">
                        <span className="text-3xl">✨</span>
                    </div>
                    <h2 className="font-['Montserrat_Alternates'] font-bold text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Создать аккаунт
                    </h2>
                    <p className="mt-2 text-gray-500 text-sm">Присоединяйтесь к нашему сообществу</p>
                </div>

                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-red-600 text-sm text-center">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Имя и фамилия *</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Иван Иванов"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Email *</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="ivan@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Телефон *</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="+7 (999) 123-45-67"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Город *</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20"
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            required
                            placeholder="Москва"
                        />
                    </div>

                    <div className="flex gap-4 py-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative flex items-center">
                                <input
                                    type="radio"
                                    name="role"
                                    value="buyer"
                                    checked={formData.role === 'buyer'}
                                    onChange={handleChange}
                                    className="w-4 h-4 appearance-none border-2 border-firm-orange rounded-full bg-white checked:bg-firm-orange checked:border-firm-orange transition-all cursor-pointer"
                                />
                                {formData.role === 'buyer' && (
                                    <div className="absolute w-2 h-2 bg-white rounded-full left-1 top-1 pointer-events-none"></div>
                                )}
                            </div>
                            <span className="text-sm text-gray-700">🛍️ Покупатель</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative flex items-center">
                                <input
                                    type="radio"
                                    name="role"
                                    value="master"
                                    checked={formData.role === 'master'}
                                    onChange={handleChange}
                                    className="w-4 h-4 appearance-none border-2 border-firm-pink rounded-full bg-white checked:bg-firm-pink checked:border-firm-pink transition-all cursor-pointer"
                                />
                                {formData.role === 'master' && (
                                    <div className="absolute w-2 h-2 bg-white rounded-full left-1 top-1 pointer-events-none"></div>
                                )}
                            </div>
                            <span className="text-sm text-gray-700">✨ Продавец (Мастер)</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Пароль *</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            placeholder="не менее 6 символов"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Подтверждение пароля *</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20"
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder="повторите пароль"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Способ подтверждения *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className="relative flex items-center">
                                    <input
                                        type="radio"
                                        name="verificationMethod"
                                        value="sms"
                                        checked={formData.verificationMethod === 'sms'}
                                        onChange={handleChange}
                                        className="w-4 h-4 appearance-none border-2 border-firm-orange rounded-full bg-white checked:bg-firm-orange checked:border-firm-orange transition-all cursor-pointer"
                                    />
                                    {formData.verificationMethod === 'sms' && (
                                        <div className="absolute w-2 h-2 bg-white rounded-full left-1 top-1 pointer-events-none"></div>
                                    )}
                                </div>
                                <span className="text-sm text-gray-700">📱 SMS на телефон</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className="relative flex items-center">
                                    <input
                                        type="radio"
                                        name="verificationMethod"
                                        value="email"
                                        checked={formData.verificationMethod === 'email'}
                                        onChange={handleChange}
                                        className="w-4 h-4 appearance-none border-2 border-firm-pink rounded-full bg-white checked:bg-firm-pink checked:border-firm-pink transition-all cursor-pointer"
                                    />
                                    {formData.verificationMethod === 'email' && (
                                        <div className="absolute w-2 h-2 bg-white rounded-full left-1 top-1 pointer-events-none"></div>
                                    )}
                                </div>
                                <span className="text-sm text-gray-700">📧 Email</span>
                            </label>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                name="newsletterAgreement"
                                checked={formData.newsletterAgreement}
                                onChange={handleChange}
                                className="w-5 h-5 appearance-none border-2 border-firm-pink rounded-md bg-white checked:bg-firm-pink checked:border-firm-pink transition-all cursor-pointer"
                            />
                            {formData.newsletterAgreement && (
                                <svg className="absolute w-4 h-4 text-white left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                        <span className="text-sm text-gray-600 select-none group-hover:text-firm-pink transition-colors">
                            Получать рассылку о новинках и акциях
                        </span>
                    </label>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </motion.button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                    Уже есть аккаунт?{' '}
                    <Link href="/auth/signin" className="font-medium text-firm-orange hover:text-firm-pink">
                        Войти
                    </Link>
                </p>

                <div className="text-center mt-4">
                    <Link href="/" className="text-sm text-gray-400 hover:text-firm-orange">
                        ← Вернуться на главную
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}