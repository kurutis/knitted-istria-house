'use client'

import { useRouter, useSearchParams } from "next/navigation"
import React, { useEffect, useState, Suspense } from "react"
import Link from "next/link"

// Компонент, который использует useSearchParams
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
            
        }catch (err: any){
            setError(err.message || 'Произошла ошибка')
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
        }catch(err: any){
            setError(err.message)
        }
    }

    if (!email) {
        return (
            <div className="mt-5 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Перенаправление...</p>
                </div>
            </div>
        )
    }

    return(
        <div className="mt-5 flex items-center justify-center">
            <div className="flex flex-col gap-5 w-[70%]">
                <div>
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Подтверждение регистрации</h2>
                    <p className="text-gray-600 mt-2">
                        На номер, привязанный к <span className="font-semibold">{email}</span>, отправлен SMS код
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        <strong className="text-firm-orange">Тестовый код: 1111</strong>
                    </p>
                </div>

                <div className="h-2.5">
                    {error && (
                        <span className="text-red-500">{error}</span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="w-full flex justify-center flex-col">
                    <div className="flex flex-col gap-5 mb-5">
                        <div>
                            <label htmlFor="smsCode" className="block text-gray-700 mb-1">
                                SMS код *
                            </label>
                            <input 
                                type="text"
                                id="smsCode"
                                value={smsCode} 
                                onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                                placeholder="1111" 
                                required 
                                maxLength={4}
                                className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-orange text-center text-2xl tracking-widest"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex justify-center mb-5 mt-5 h-[5vh]">
                        <button 
                            type="submit" 
                            disabled={loading || smsCode.length !== 4}
                            className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 w-[25%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Проверка...' : 'Подтвердить'}
                        </button>
                    </div>

                    <div className="flex justify-center mb-5">
                        <button 
                            type="button"
                            onClick={handleResendSMS} 
                            disabled={resendTimer > 0}
                            className={`font-['Montserrat_Alternates'] font-[450] transition-all duration-300 hover:text-firm-orange hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${resendTimer > 0 ? 'text-gray-400' : 'text-gray-700'}`}
                        >
                            {resendTimer > 0 
                                ? `Отправить повторно через ${resendTimer} сек` 
                                : `Отправить SMS повторно`
                            }
                        </button>
                    </div>

                    <div className="flex justify-center mt-5">
                        <Link 
                            href="/auth/signin"
                            className="text-gray-600 hover:text-firm-orange transition-all duration-300"
                        >
                            Вернуться на страницу входа
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Основной компонент с Suspense
export default function VerifySmsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]">Загрузка...</div>}>
            <VerifySmsForm />
        </Suspense>
    )
}