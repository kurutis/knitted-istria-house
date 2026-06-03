'use client'

import { useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { toast } from 'react-hot-toast'
import { UserIcon } from "@/components/icons/UserIcon"
import { CatalogPinkIcon } from "@/components/icons/CatalogPinkIcon"
import { MasterIcon } from "@/components/icons/MasterIcon"

export default function SignUpPage() {
    const router = useRouter()
    const [step, setStep] = useState<'form' | 'verify'>('form')
    const [verifyMethod, setVerifyMethod] = useState<'sms' | 'email' | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [code, setCode] = useState('')
    const [resendTimer, setResendTimer] = useState(0)
    const [isMobile, setIsMobile] = useState(false)
    
    const [formData, setFormData] = useState({name: '', email: '', phone: '', city: '', password: '', confirmPassword: '', role: 'buyer', newsletterAgreement: false})
    const [availableMethods, setAvailableMethods] = useState<('sms' | 'email')[]>([])
    const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email'>('email')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        if (type === 'checkbox') {
            setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked })
        } else {
            setFormData({ ...formData, [name]: value })
        }
    }

    const isValidEmail = (email: string) => {
        if (!email) return false
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const isValidPhone = (phone: string) => {
        if (!phone) return false
        const cleaned = phone.replace(/[^0-9]/g, '')
        return cleaned.length >= 10 && cleaned.length <= 12
    }

    useEffect(() => {
        const hasEmail = isValidEmail(formData.email)
        const hasPhone = isValidPhone(formData.phone)
        
        const methods: ('sms' | 'email')[] = []
        if (hasEmail) methods.push('email')
        if (hasPhone) methods.push('sms')
        
        setAvailableMethods(methods)
        
        if (methods.length > 0) {
            const defaultMethod = methods.includes('email') ? 'email' : 'sms'
            setSelectedMethod(defaultMethod)
        }
    }, [formData.email, formData.phone])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const hasEmail = isValidEmail(formData.email)
        const hasPhone = isValidPhone(formData.phone)

        if (!hasEmail && !hasPhone) {
            setError('Укажите email ИЛИ номер телефона')
            toast.error('Укажите email ИЛИ номер телефона')
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
            const response = await fetch("/api/auth/register", {method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, verificationMethod: selectedMethod})})

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка регистрации')
            }

            setUserId(data.userId)
            setVerifyMethod(selectedMethod)
            setStep('verify')
            startResendTimer()
            toast.success(data.message || 'Код отправлен!')

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
            setError(errorMessage)
            toast.error(errorMessage)
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
            const response = await fetch("/api/auth/verify", {method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify({userId, code, method: verifyMethod})})

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка верификации')
            }

            toast.success('Аккаунт успешно подтвержден!')
            router.push(`/auth/signin?verified=true`)

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleResendCode = async () => {
        if (resendTimer > 0) return
        
        try {
            const response = await fetch("/api/auth/resend-verification", {method: 'POST', headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, method: verifyMethod, email: formData.email, phone: formData.phone, name: formData.name})})

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка отправки')
            }

            toast.success('Код отправлен повторно!')
            startResendTimer()

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
            toast.error(errorMessage)
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

    if (step === 'verify') {
        const contact = verifyMethod === 'sms' ? formData.phone : formData.email
        const icon = verifyMethod === 'sms' ? '📱' : '📧'
        
        return (
            <div className="min-h-screen bg-main flex items-center justify-center py-8 sm:py-12 px-4">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-main rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100">
                    <div className="text-center">
                        <div className="mx-auto w-20 h-20 sm:w-20 sm:h-20 bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                            <span className="text-3xl sm:text-3xl">{icon}</span>
                        </div>
                        <h2 className="font-montserrat font-bold text-2xl sm:text-3xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Подтверждение</h2>
                        <p className="text-firm-gray text-xs sm:text-sm mt-2">Мы отправили код подтверждения на <br /><strong className="text-firm-orange">{contact}</strong></p>
                    </div>

                    <div className="mt-6">
                        <label className="block text-text mb-2 text-xs sm:text-sm font-medium">Код подтверждения</label>
                        <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-full p-2.5 sm:p-3 rounded-xl bg-forms border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 text-center text-xl sm:text-2xl tracking-widest text-text" placeholder="0000"  maxLength={4} autoFocus />
                    </div>

                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="text-firm-red text-xs sm:text-sm text-center">{error}</p>
                        </div>
                    )}

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleVerify} disabled={loading || code.length !== 4} className="w-full mt-6 py-2.5 sm:py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base">{loading ? 'Проверка...' : 'Подтвердить'}</motion.button>

                    <div className="text-center mt-4">
                        <button onClick={handleResendCode} disabled={resendTimer > 0} className="text-xs sm:text-sm text-firm-gray hover:text-firm-orange transition-colors disabled:opacity-50">{resendTimer > 0 ? `Отправить повторно через ${resendTimer} сек` : 'Отправить код повторно'}</button>
                    </div>

                    <div className="text-center mt-4">
                        <Link href="/auth/signin" className="text-xs sm:text-sm text-firm-gray hover:text-firm-orange transition-colors">← Вернуться на страницу входа</Link>
                    </div>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-main flex items-center justify-center py-8 sm:py-12 px-4">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-md w-full bg-main rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100" >
                <div className="text-center">
                    <div className="mx-auto w-20 h-20 sm:w-20 sm:h-20 bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                        <UserIcon size={isMobile ? 36 : 32} color="white" />
                    </div>
                    <h2 className="font-montserrat font-bold text-2xl sm:text-3xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Создать аккаунт</h2>
                    <p className="mt-1 sm:mt-2 text-firm-gray text-xs sm:text-sm">Присоединяйтесь к нашему сообществу</p>
                </div>

                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-firm-red text-xs sm:text-sm text-center">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="block text-text mb-1 text-xs sm:text-sm font-medium">Имя и фамилия *</label>
                        <input className="w-full p-2.5 sm:p-3 rounded-xl bg-forms border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Иван Иванов" />
                    </div>

                    <div>
                        <label className="block text-text mb-1 text-xs sm:text-sm font-medium">Email</label>
                        <input className="w-full p-2.5 sm:p-3 rounded-xl bg-forms border-2 border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ivan@example.com" />
                    </div>

                    <div>
                        <label className="block text-text mb-1 text-xs sm:text-sm font-medium">Телефон</label>
                        <input className="w-full p-2.5 sm:p-3 rounded-xl bg-forms border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+7 (999) 123-45-67"  />
                    </div>

                    <p className="text-xs text-firm-gray -mt-2">* Укажите email или номер телефона для входа и подтверждения</p>

                    {availableMethods.length > 1 && (
                        <div>
                            <label className="block text-text mb-2 text-xs sm:text-sm font-medium">Способ подтверждения</label>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative flex items-center">
                                        <input type="radio" checked={selectedMethod === 'email'} onChange={() => setSelectedMethod('email')} className="w-4 h-4 appearance-none border-2 border-firm-pink rounded-full bg-forms checked:bg-firm-pink checked:border-firm-pink transition-all cursor-pointer" />
                                        {selectedMethod === 'email' && (<div className="absolute w-2 h-2 bg-main rounded-full left-1 top-1 pointer-events-none"></div>)}
                                    </div>
                                    <span className="text-xs sm:text-sm text-firm-gray">Email</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div className="relative flex items-center">
                                        <input type="radio" checked={selectedMethod === 'sms'} onChange={() => setSelectedMethod('sms')} className="w-4 h-4 appearance-none border-2 border-firm-orange rounded-full bg-forms checked:bg-firm-orange checked:border-firm-orange transition-all cursor-pointer" />
                                        {selectedMethod === 'sms' && (<div className="absolute w-2 h-2 bg-main rounded-full left-1 top-1 pointer-events-none"></div>)}
                                    </div>
                                    <span className="text-xs sm:text-sm text-firm-gray">SMS</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {availableMethods.length === 1 && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs sm:text-sm text-firm-gray">{availableMethods[0] === 'email' ? 'Код подтверждения будет отправлен на указанный email' : 'Код подтверждения будет отправлен SMS на указанный телефон'}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-text mb-1 text-xs sm:text-sm font-medium">Город *</label>
                        <input className="w-full p-2.5 sm:p-3 rounded-xl bg-main border-2 border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" type="text" name="city" value={formData.city} onChange={handleChange} required placeholder="Москва" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 py-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative flex items-center">
                                <input type="radio" name="role" value="buyer" checked={formData.role === 'buyer'} onChange={handleChange} className="w-4 h-4 appearance-none border-2 border-firm-orange rounded-full bg-main checked:bg-firm-orange checked:border-firm-orange transition-all cursor-pointer" />
                                {formData.role === 'buyer' && (<div className="absolute w-2 h-2 bg-main rounded-full left-1 top-1 pointer-events-none"></div>)}
                            </div>
                            <CatalogPinkIcon size={18} color="#D97C8E" />
                            <span className="text-xs sm:text-sm text-firm-gray">Покупатель</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className="relative flex items-center">
                                <input type="radio" name="role" value="master" checked={formData.role === 'master'} onChange={handleChange} className="w-4 h-4 appearance-none border-2 border-firm-pink rounded-full bg-main checked:bg-firm-pink checked:border-firm-pink transition-all cursor-pointer" />
                                {formData.role === 'master' && (<div className="absolute w-2 h-2 bg-main rounded-full left-1 top-1 pointer-events-none"></div>)}
                            </div>
                            <MasterIcon size={18} color="#D97C8E" />
                            <span className="text-xs sm:text-sm text-firm-gray">Продавец (Мастер)</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-text mb-1 text-xs sm:text-sm font-medium">Пароль *</label>
                        <input className="w-full p-2.5 sm:p-3 rounded-xl bg-forms border-2 border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="не менее 6 символов" />
                    </div>

                    <div>
                        <label className="block text-text mb-1 text-xs sm:text-sm font-medium">Подтверждение пароля *</label>
                        <input className="w-full p-2.5 sm:p-3 rounded-xl bg-forms border-2 border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="повторите пароль" />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input type="checkbox" name="newsletterAgreement" checked={formData.newsletterAgreement} onChange={handleChange} className="w-4 h-4 sm:w-5 sm:h-5 appearance-none border-2 border-firm-pink rounded-md bg-main checked:bg-firm-pink checked:border-firm-pink transition-all cursor-pointer" />
                            {formData.newsletterAgreement && (
                                <svg className="absolute w-3 h-3 sm:w-4 sm:h-4 text-main left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                        <span className="text-xs sm:text-sm text-firm-gray select-none group-hover:text-firm-pink transition-colors">Получать рассылку о новинках и акциях</span>
                    </label>

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full mt-4 sm:mt-6 py-2.5 sm:py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 text-sm sm:text-base">{loading ? 'Регистрация...' : 'Зарегистрироваться'}</motion.button>
                </form>

                <p className="text-center text-xs sm:text-sm text-firm-gray mt-6">Уже есть аккаунт?{' '}<Link href="/auth/signin" className="font-medium text-firm-orange hover:text-firm-pink">Войти</Link></p>

                <div className="text-center mt-4">
                    <Link href="/" className="text-xs sm:text-sm text-firm-gray hover:text-firm-orange">← Вернуться на главную</Link>
                </div>
            </motion.div>
        </div>
    )
}