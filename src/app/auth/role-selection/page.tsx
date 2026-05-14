'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import React, { useEffect, useState } from "react"
import toast from "react-hot-toast"

export default function RoleSelectionPage(){
    const {data: session, update} = useSession()
    const router = useRouter()
    const [formData, setFormData] = useState({role: 'buyer', phone: '', city: '', newsletterAgreement: false})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (session?.user?.roleSelected){
           router.push('/')
        }
    }, [session, router])

    const handleSumbit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (formData.role === 'master' && (!formData.phone || !formData.city)){
            setError('Для мастера обязательно указать телефон и город')
            setLoading(false)
            return
        }

        try{
            const response = await fetch('/api/user/select-role', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(formData)})

            if (!response.ok){
                const errorData = await response.json()
                throw new Error(errorData.error || 'Ошибка при выборе роли')
            }

            await update({...session, user:{...session?.user, ...formData, roleSelected: true}})
            
            toast.success('Регистрация успешно завершена!')
            router.push('/')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Произошла ошибка')
            toast.error(err instanceof Error ? err.message : 'Произошла ошибка')
        }finally{
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const {name, value, type} = e.target

        if (type === 'checkbox'){setFormData({...formData, [name]: (e.target as HTMLInputElement).checked})}else{setFormData({...formData, [name]: value})}
    }

    if (!session?.user?.requiresRoleSelection){
        return null
    }

    return(
        <div className="mt-5 flex items-center justify-center">
            <div className="flex flex-col gap-5 w-[70%] max-w-2xl">
                <div>
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-3xl">Завершение регистрации</h2>
                    <p className="text-gray-600 mt-2">Добропожаловать, <span className="font-semibold text-firm-pink">{session.user.name}</span>! <br /> Завершите настройку профиля:</p>

                    <div className="h-2.5">
                        {error && (
                            <span className="text-red-500">{error}</span>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSumbit} className="w-full flex justify-center flex-col">
                    <div className="flex gap-5 mb-8">
                        <div onClick={()=>setFormData({...formData, role: "buyer"})} className={`flex-1 p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${formData.role === 'buyer' ? 'border-firm-orange bg-firm-orange bg-opacity-5' : 'border-gray-200 hover:border-firm-orange'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.role === 'buyer'  ? 'border-firm-pink' : 'border-gray-400'}`}>
                                    {formData.role === 'buyer' &&(
                                        <div className="w-3 h-3 rounded-full bg-firm-pink"></div>
                                    )}
                                </div>
                                <label htmlFor="buyer" className={`font-['Montserrat_Alternates'] font-semibold text-lg cursor-pointer ${formData.role === 'buyer' ? 'text-white' : ''}`}>Покупатель</label>
                            </div>
                            <div>
                                <p className={`text-sm ml-8 ${formData.role === 'buyer' ? 'text-gray-200' : 'text-gray-600'}`}>Хочу покупать уникальные вязанные изделия</p>
                            </div>
                        </div>
                        <div className={`flex-1 p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${formData.role === 'master' ? 'border-firm-pink bg-firm-pink bg-opacity-5' : 'border-gray-200 hover:border-firm-pink'}`} onClick={()=>setFormData({...formData, role: "master"})}>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.role === 'master' ? 'border-firm-orange' : 'border-gray-400'}`}>
                                    {formData.role === 'master' && (
                                        <div className="w-3 h-3 rounded-full bg-firm-orange" />
                                    )}
                                </div>
                                <label className={`font-['Montserrat_Alternates'] font-semibold text-lg cursor-pointer ${formData.role === 'master' ? 'text-white' : ''}`} htmlFor="master">Продавец</label>
                            </div>
                            <p className={`text-sm ml-8 ${formData.role === 'master' ? 'text-gray-200' : 'text-gray-600'}`}>Хочу продавать свои вязанные изделия</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Телефон</label>
                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+7 (XXX) XXX-XX-XX" required />
                        </div>
                        <div>
                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Город *</label>
                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink" placeholder="Москва..." type="text" name="city" value={formData.city} onChange={handleChange} required={formData.role === 'master'} />
                            <p className="text-sm text-gray-500 mt-1">{formData.role === 'master' ? 'Обязательно для определения зоны доставки' : 'Для персонализации предложений'}</p>
                        </div>
                        <div className="flex flex-center gap-3 mt-4">
                            <div className="relative flex items-center">
                                <input className="w-5 h-5 appearance-none border-2 border-firm-orange rounded-md bg-[#eaeaea] checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer" type="checkbox" name="newsletterAgreement" checked={formData.newsletterAgreement} onChange={handleChange} id="newsletter" />
                                {formData.newsletterAgreement &&(
                                    <svg className="absolute w-4 h-4 text-white left-0.5 top-1 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </div>
                            <label htmlFor="newsletterAgreement" className="text-gray-700 cursor-pointer select-none font-['Montserrat_Alternates']">Согласен получать рассылку о новинках и акциях</label>
                        </div>
                    </div>

                    <div className="flex justify-center mt-5">
                        <button className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-pink p-3 w-[40%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={loading}>{loading ? "Сохранение..." : "Завершить регистрацию"}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}