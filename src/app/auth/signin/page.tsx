'use client'

import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import React, { useState } from "react"
import Link from "next/link";
import Image from "next/image";
import google from '../../../../public/google.svg'
import yandex from '../../../../public/yandex.svg'
import vk from '../../../../public/vk.svg'


export default function SignInPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || '/'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [smsCode, setSmsCode] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) =>{
        e.preventDefault()
        setLoading(true)
        setError('')

        try{
            const result = await signIn('credentials', {email, password, smsCode, redirect: false, callbackUrl})

            console.log("Sign in result:", result)

            if(result?.error){
                setError(result.error)
            } else if (result?.ok){
                router.push(callbackUrl)
                router.refresh()
            }
        }catch (err:any){
            setError(err.message || 'Произошла ошибка')
        }finally{
            setLoading(false)
        }
    }

    return(
        <div className="mt-5 flex items-center justify-center">
            <div className="flex flex-col gap-5 w-[70%]">
                <div>
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Вход в аккаунт</h2>
                </div>
                <div className="h-2.5">
                    {error && (
                        <span className="text-red-500">{error}</span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="w-full flex justify-center flex-col">
                    <div className="flex flex-col gap-5 mb-5">
                        <div>
                            <input className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-orange" id="email" name="email" type="email" autoComplete="email" required placeholder="Email адрес" value={email} onChange={(e)=>setEmail(e.target.value)} />
                        </div>
                        <div>
                            <input className="w-full p-2 rounded-l bg-[#EAEAEA] outline-firm-pink" id="password" name="password" type="password" autoComplete="current-password" required placeholder="Пароль" value={password} onChange={(e)=> setPassword(e.target.value)} />
                        </div>
                        <div>
                            <input className="p-2 rounded-l bg-[#EAEAEA] outline-firm-orange" id="smsCode" name="smsCode" type="smsCode" placeholder="SMS код" value={smsCode} onChange={(e)=>setPassword(e.target.value)} />
                        </div>
                    </div>
                    
                    {/* Чекбокс "Запомнить пароль" и ссылка "Забыли пароль?" в одной строке */}
                    <div className="w-full flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    id="rememberMe" 
                                    name="rememberMe" 
                                    checked={rememberMe} 
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-5 h-5 appearance-none border-2 border-firm-orange rounded-md bg-[#EAEAEA] checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer"
                                />
                                {rememberMe && (
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
                            <label htmlFor="rememberMe" className="text-gray-700 cursor-pointer select-none">
                                Запомнить пароль
                            </label>
                        </div>
                        
                        <Link href="/auth/forgot-password" className="text-firm-pink hover:underline">
                            Забыли пароль?
                        </Link>
                    </div>

                    <div className="flex justify-center mb-5 mt-5 h-[5vh]">
                        <button className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 w-[25%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white hover:cursor-pointer" type="submit" disabled={loading}>{loading ? 'Вход...' : 'Войти'}</button>
                    </div>

                    <div className="flex justify-center flex-col items-center gap-2 h-[10vh]">
                        <p className="h-[24vh]">Или продолжить через</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={()=>signIn('google', {callbackUrl})}>
                                <Image className="size-10 duration-400 ease-in-out hover:size-12 hover:cursor-pointer" src={google} alt="google" />
                            </button>
                            <button type="button" onClick={()=>signIn('yandex', {callbackUrl})}>
                                <Image className="size-10 duration-400 ease-in-out hover:size-12" src={yandex} alt="yandex" />
                            </button>
                            <button type="button" onClick={()=>signIn('vk', {callbackUrl})}>
                                <Image className="size-10 duration-400 ease-in-out hover:size-12" src={vk} alt="vk" />
                            </button>
                        </div>  
                    </div>
                    
                    <div className="flex justify-center flex-col items-center gap-5 mb-5 mt-10 h-[5vh]">
                        <p className="h-[20vh]">Нет аккаунта?</p>
                        <Link href="/auth/signup" className="w-[25%]">
                            <button className="w-full h-[5vh] font-['Montserrat_Alternates'] font-[450] border-2 border-firm-pink p-2 rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white hover:cursor-pointer">
                                Зарегистрироваться
                            </button>
                        </Link>
                    </div>

                    <div className="flex justify-center mt-5">
                        <Link href="/">Вернуться на главную</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}