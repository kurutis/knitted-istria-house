'use client'

import { useRouter } from "next/navigation"
import React, { useState } from "react"
import Link from "next/link"

export default function SignUpPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({name: '', email: '', phone: '', city: '', password: '', confirmPassword: '', role: 'buyer', newsletterAgreement: false})
    const [error, setError]  = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>{
        const {name, value, type} = e.target

        if (type === 'checkbox'){
            setFormData({...formData, [name]: (e.target as HTMLInputElement).checked})
        }else{
            setFormData({...formData, [name]: value})
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (formData.password !== formData.confirmPassword){
            setError('Пароли не совпадают')
            setLoading(false)
            return
        }

        if (formData.password.length < 6){
            setError('Пароль должен быть не менее 6 символов')
            setLoading(false)
            return
        }

        try{
            const response = await fetch("/api/auth/register", {method: 'POST', headers: {"Content-Type": "application/json"}, body: JSON.stringify(formData)})

            const data = await response.json()

            if (!response.ok){
                throw new Error(data.error || 'Ошибка регистрации')
            }

            router.push(`/auth/verify-sms?email=${encodeURIComponent(formData.email)}`)
        }catch (err:any){
            setError(err.message)
        }finally{
            setLoading(false)
        }
    }

    return(
        <div className="mt-5 flex items-center justify-center">
            <div className="flex flex-col gap-5 w-[70%]">
                <div>
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Создать аккаунт</h2>
                </div>
                 <div className="h-2.5">
                    {error && (
                        <span className="text-red-500">{error}</span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="w-full flex justify-center flex-col">
                    <div className="flex flex-col gap-5 mb-5">
                        <div>
                            <input className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-orange" id="name" name="name" type="text" required placeholder="Иван Иванов" value={formData.name} onChange={handleChange} />
                        </div>
                        <div>
                            <input  className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-pink" id="email" name="email" type="email" required placeholder="email@example.com" value={formData.email} onChange={handleChange} />
                        </div>
                        <div>
                            <input className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-orange" type="tel" name="phone" id="phone" required placeholder="+7 (999) 123 45-67" value={formData.phone} onChange={handleChange} />
                        </div>
                        <div>
                            <input  className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-pink" type="text" name="city" id="city" required placeholder="Москва" value={formData.city} onChange={handleChange} />
                        </div>
                        <div className="flex gap-4 p-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                type="radio"
                                name="role"
                                value="buyer"
                                checked={formData.role === 'buyer'}
                                onChange={handleChange}
                                className="w-4 h-4 appearance-none border-2 border-firm-orange rounded-full bg-white checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer"
                                />
                                <span className="text-gray-700">Покупатель</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                type="radio"
                                name="role"
                                value="master"
                                checked={formData.role === 'master'}
                                onChange={handleChange}
                                className="w-4 h-4 appearance-none border-2 border-firm-pink rounded-full bg-white checked:bg-firm-pink checked:border-firm-pink transition-all duration-200 cursor-pointer"
                                />
                                <span className="text-gray-700">Продавец (Мастер)</span>
                            </label>
                        </div>
                        <div>
                            <input className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-orange" type="password" name="password" id="password" required minLength={6} placeholder="Не менее 6 символов" value={formData.password} onChange={handleChange} />
                        </div>
                        <div>
                            <input  className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-pink"  type="password" name="confirmPassword" id="confirmPassword" required placeholder="Повторите пароль" value={formData.confirmPassword} onChange={handleChange} />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    id="newsletterAgreement" 
                                    name="newsletterAgreement" 
                                    checked={formData.newsletterAgreement} 
                                    onChange={handleChange}
                                    className="w-5 h-5 appearance-none border-2 border-firm-pink rounded-md bg-[#EAEAEA] checked:bg-firm-pink checked:border-firm-pink transition-all duration-200 cursor-pointer"
                                />
                                {formData.newsletterAgreement && (
                                    <svg 
                                        className="absolute w-4 h-4 text-white left-0.5 top-0.5 pointer-events-none" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="3" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                            <label htmlFor="newsletterAgreement" className="text-gray-700 cursor-pointer select-none">
                                Согласен получать рассылку о новинках и акциях
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-center flex-col items-center gap-2 h-[10vh]">
                        <button className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 w-[25%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white hover:cursor-pointer" type="submit" disabled={loading}>{loading ? 'Регистрация...' : 'Зарегистрироваться'}</button>
                    </div>

                    <div className="flex justify-center flex-col items-center gap-5 mb-5 mt-10 h-[5vh]">
                        <p className="h-[20vh]">Уже есть аккаунта?</p>
                        <Link href="/auth/signin" className="w-[25%]"><button className="w-full font-['Montserrat_Alternates'] font-[450] border-2 border-firm-pink p-2 rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white hover:cursor-pointer">Войти</button></Link>
                    </div>

                    <div className="flex justify-center mt-5">
                        <Link href="/">Вернуться на главную</Link>
                    </div>
                </form>
            </div> 
        </div>
    )
}