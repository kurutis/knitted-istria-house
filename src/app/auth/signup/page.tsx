'use client'

import { useRouter } from "next/navigation"
import React, { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from 'react-hot-toast'

export default function SignUpPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        password: '',
        confirmPassword: '',
        role: 'buyer',
        newsletterAgreement: false
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

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
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка регистрации')
            }

            toast.success('Регистрация успешна! Подтвердите номер телефона')
            router.push(`/auth/verify-sms?email=${encodeURIComponent(formData.email)}`)
        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
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
                        <span className="text-3xl">✨</span>
                    </motion.div>
                    <h2 className="font-['Montserrat_Alternates'] font-bold text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Создать аккаунт
                    </h2>
                    <p className="mt-2 text-gray-500 text-sm">Присоединяйтесь к нашему сообществу</p>
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

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Имя и фамилия</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Иван Иванов"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Email адрес</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="ivan@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Телефон</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="+7 (999) 123-45-67"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Город</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all"
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
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Пароль</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all"
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
                        <label className="block text-gray-700 mb-2 text-sm font-medium">Подтверждение пароля</label>
                        <input
                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all"
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder="повторите пароль"
                        />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                name="newsletterAgreement"
                                checked={formData.newsletterAgreement}
                                onChange={handleChange}
                                className="w-5 h-5 appearance-none border-2 border-firm-pink rounded-md bg-white checked:bg-firm-pink checked:border-firm-pink transition-all duration-200 cursor-pointer"
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
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Регистрация...</span>
                            </div>
                        ) : (
                            'Зарегистрироваться'
                        )}
                    </motion.button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                    Уже есть аккаунт?{' '}
                    <Link href="/auth/signin" className="font-medium text-firm-orange hover:text-firm-pink transition-colors">
                        Войти
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