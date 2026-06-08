'use client'

import { useRouter, useSearchParams } from "next/navigation"
import React, { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { MailIcon } from "@/components/icons/MailIcon"
import { RefreshIcon } from "@/components/icons/RefreshIcon"

function VerifySmsForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get('email')

    const [smsCode, setSmsCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [resendTimer, setResendTimer] = useState(60)
    const [canResend, setCanResend] = useState(false)

    useEffect(() => {
        if (!email) {
            router.push("/auth/signin")
        }
    }, [email, router])

    useEffect(() => {
        if (resendTimer > 0){
            const timer = setTimeout(()=> setResendTimer(resendTimer - 1), 1000)
            return () => clearTimeout(timer)
        }else{
            setCanResend(true)
        }
    }, [resendTimer])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (!smsCode || smsCode.length !== 4) {
            setError('Введите корректный 4-значный код')
            setLoading(false)
            return
        }

        try{
            const response = await fetch('/api/auth/verify-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, smsCode })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Неверный SMS код')
            }

            router.push('/auth/signin?verified=true')
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
            setError(errorMessage)
        }finally{
            setLoading(false)
        }
    }

    const handleResendSMS = async () => {
        if (!canResend) return
        
        try{
            setError('')
            const response = await fetch('/api/auth/resend-sms', {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({email})
            })
            
            if(!response.ok){
                throw new Error("Ошибка отправки SMS")
            }

            setResendTimer(60)
            setCanResend(false)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка'
            setError(errorMessage)
        }
    }

    if (!email) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh] bg-main">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                    />
                    <p className="mt-4 text-firm-gray">Перенаправление...</p>
                </div>
            </div>
        )
    }

    return(
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-[80vh] flex items-center justify-center bg-main px-4"
        >
            <div className="flex flex-col gap-6 w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-linear-to-r from-firm-orange to-firm-pink rounded-2xl flex items-center justify-center mb-4 shadow-md">
                        <MailIcon size={32} color="#ffffff" />
                    </div>
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Подтверждение регистрации
                    </h2>
                    <p className="text-firm-gray mt-3">
                        На номер, привязанный к <span className="font-semibold text-text">{email}</span>, отправлен SMS код
                    </p>
                    <p className="text-sm text-firm-gray mt-2">
                        <span className="text-firm-orange font-medium">Тестовый код: 1111</span>
                    </p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-firm-red/10 border border-firm-red/30 text-firm-red rounded-xl p-3 text-center text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="smsCode" className="block text-text mb-2 font-['Montserrat_Alternates'] font-medium">
                            SMS код <span className="text-firm-red">*</span>
                        </label>
                        <input 
                            type="text"
                            id="smsCode"
                            value={smsCode} 
                            onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                            placeholder="0000" 
                            required 
                            maxLength={4}
                            className="w-full p-3 rounded-xl bg-forms text-text text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoFocus
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit" 
                        disabled={loading || smsCode.length !== 4}
                        className="w-full py-3 bg-linear-to-r from-firm-orange to-firm-pink text-white rounded-xl font-['Montserrat_Alternates'] font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <RefreshIcon size={18} color="#ffffff" className="animate-spin" />
                                Проверка...
                            </span>
                        ) : (
                            'Подтвердить'
                        )}
                    </motion.button>

                    <div className="text-center">
                        <button 
                            type="button"
                            onClick={handleResendSMS} 
                            disabled={resendTimer > 0}
                            className={`font-['Montserrat_Alternates'] text-sm transition-all duration-300 hover:text-firm-orange disabled:opacity-50 disabled:cursor-not-allowed ${
                                resendTimer > 0 ? 'text-firm-gray' : 'text-text'
                            }`}
                        >
                            {resendTimer > 0 
                                ? `Отправить повторно через ${resendTimer} сек` 
                                : 'Отправить SMS повторно'
                            }
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <Link 
                            href="/auth/signin"
                            className="text-sm text-firm-gray hover:text-firm-orange transition-all duration-300"
                        >
                            ← Вернуться на страницу входа
                        </Link>
                    </div>
                </form>
            </div>
        </motion.div>
    )
}

// Основной компонент с Suspense
export default function VerifySmsPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh] bg-main">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                    />
                    <p className="mt-4 text-firm-gray">Загрузка...</p>
                </div>
            </div>
        }>
            <VerifySmsForm />
        </Suspense>
    )
}