'use client'

import Image from "next/image"
import Link from "next/link"
import React, { useEffect, useState } from "react"
import { signOut } from "next-auth/react"

interface BuyerProfileProps{
    session: any
}

export default function BuyerProfile({session}: BuyerProfileProps){
    const [activeTab, setActiveTab] = useState('profile')
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)

    const [profileData, setProfileData] = useState({fullname: '', email: '', phone: '', city: '', address: '', avatarUrl: null,  newsletterAgreement: false})

    const [orders] = useState([{id: '1', order_number: 'ORD-20250219-000001', status: 'new', created_at: new Date().toISOString(), items_count: 2, total_amount: 3500}])

    const [favorites] = useState([
        { id: '1', title: 'Вязаный свитер', price: 3500, image: null },
        { id: '2', title: 'Шапка с помпоном', price: 1200, image: null }
    ])

    useEffect(() => {
         fetchProfileData()
    })

    const fetchProfileData = async () => {
        try{
            setLoading(true)
            const response = await fetch('api/user/profile')
            const data = await response.json()
            setProfileData(data)
        }catch (error) {
            console.error('Error fetching profile:', error)
        } finally{
            setLoading(false)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()

        setIsEditing(false)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target
        setProfileData(prev => ({...prev, [name]: value}))
    }

    const getStatusColor = (status: string) => {
        switch(status){
            case 'new': return'text-blue-600'
            case 'confirmed': return 'text-green-600'
            case 'shipped': return 'text-purple-600'
            case 'delivered': return 'text-gray-600'
            case 'cancelled': return 'text-red-600'
            default: return 'text-gray-600'
        }
    }

     const getStatusText = (status: string) => {
        switch(status){
            case 'new': return 'Новый'
            case 'confirmed': return 'Подтвержден'
            case 'shipped': return 'Отправлен'
            case 'delivered': return 'Доставлен'
            case 'cancelled': return 'Отменен'
            default: return status
        }
    }

    return(
        <div className="mt-5 flex items-start justify-center">
            <div className="flex flex-col gap-5 w-[80%] max-w-6xl">
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">Личный кабинет</h1>
                    <p className="text-gray-600 mt-1">Добро пожаловать, {profileData.fullname || session?.user?.name}</p>
                </div>
                <div className="flex gap-8">
                    <div className="w-1/4">
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-24 h-24 rounded-full bg-firm-orange flex items-center justify-center overflow-hidden border-2 border-firm-pink">
                                    {profileData.avatarUrl ? (
                                        <Image width={96} height={96} src={profileData.avatarUrl} alt="avatar" />
                                    ): (
                                        <span className="text-3xl font-['Montserrat_Alternates'] font-semibold text-white">
                                            {profileData.fullname?.charAt(0).toUpperCase() || session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    )}
                                </div>
                                <h3 className="mt-3 font-['Montserrat_Alternates'] font-semibold text-lg">{profileData.fullname || session?.user?.name}</h3>
                                <p className="text-sm text-gray-500">{session?.user?.email}</p>
                            </div>
                            <nav className="space-y-2">
                                <button className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] ${activeTab === 'profile' ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`} onClick={()=> setActiveTab('profile')}>Мой профиль</button>
                                <button className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2 ${activeTab === 'orders' ? 'bg-firm-pink text-white' : 'hover:bg-[#eaeaea]'}`} onClick={() => setActiveTab('orders')}>Мои заказы</button>
                                <button className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`} onClick={() => setActiveTab('favorites')}>Избранное</button>
                                <button className={`w-full text-left px-4 py-2 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2 ${activeTab === 'settings' ? 'bg-firm-pink text-white' : 'hover:bg-[#eaeaea]'}`}  onClick={() => setActiveTab('settings')}>Настройки</button>
                                <button className="w-full text-left px-4 py-2 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-2 text-red-600 hover:bg-red-50" onClick={() => signOut({callbackUrl: '/'})}>Выйти</button>
                            </nav>
                        </div>
                    </div>
                    <div className="w-3/4">
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex justify-between items-center mb-6 h-[8vh]">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Мой профиль</h2>
                                    {!isEditing ? (
                                        <button className="px-4 py-2 border-2 border-firm-orange rounded-lg hover:cursor-pointer hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white transition-all duration-300 font-['Montserrat_Alternates']" onClick={() => setIsEditing(true)}>Редактировать</button>
                                    ): (
                                        <button className="px-4 py-2 bg-gray-500 text-white rounded-lg ease-in-out hover:outline-2 hover:outline-red-600 transition-all duration-300 font-['Montserrat_Alternates']" onClick={() => setIsEditing(false)}>Отмена</button>
                                    )}
                                </div>
                                <div>
                                    {isEditing ? (
                                        <form className="space-y-4 flex flex-col items-center h-[55vh]" onSubmit={handleProfileUpdate}>
                                            <div className="w-full">
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">ФИО *</label>
                                                <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" type="text" name="fullname" value={profileData.fullname || ''} onChange={handleInputChange} required placeholder="Имя" />
                                            </div>
                                            <div className="w-full">
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Email *</label>
                                                <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink" type="email" name="email" value={profileData.email || ''} onChange={handleInputChange} required placeholder="Email" />
                                            </div>
                                            <div className="w-full">
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Телефон *</label>
                                                <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" type="tel" name="phone" value={profileData.phone || ''} onChange={handleInputChange} required placeholder="Телефон" />
                                            </div>
                                            <div className="w-full">
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Город</label>
                                                <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink" type="text" name="city" value={profileData.city || ''} onChange={handleInputChange} required placeholder="Город" />
                                            </div>
                                            <div className="w-full">
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Адрес доставки</label>
                                                <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" type="text" name="address" value={profileData.address || ''} onChange={handleInputChange} required placeholder="Адрес доставки" />
                                            </div>
                                            <button className="mt-4 p-3 bg-firm-pink text-white rounded-lg border-firm-pink hover:cursor-pointer hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white transition-all duration-300 font-['Montserrat_Alternates']" type="submit">Сохранить изменения</button>
                                        </form>
                                    ): (
                                        <div className="space-y-4">
                                            <div className="border-b pb-4 border-gray-300">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Имя</p>
                                                <p className="text-lg">{profileData.fullname || session?.user?.name || 'Не указано'}</p>
                                            </div>
                                            <div className="border-b pb-4 border-gray-300">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Email</p>
                                                <p className="text-lg">{profileData.email || session?.user?.email}</p>
                                            </div>
                                            <div className="border-b pb-4 border-gray-300">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Телефон</p>
                                                <p className="text-lg">{profileData.phone || 'Не указано'}</p>
                                            </div>
                                            <div className="border-b pb-4 border-gray-300">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Город</p>
                                                <p className="text-lg">{profileData.city || 'Не указано'}</p>
                                            </div>
                                            <div className="border-b pb-4 border-gray-300">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Адрес доставки</p>
                                                <p className="text-lg">{profileData.address || 'Не указано'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'orders' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Мои заказы</h2>
                                {orders.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">У вас пока нет заказов</p>
                                        <Link className="inline-block px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates']" href={'/catalog'}>Перейти в каталог</Link>
                                    </div>
                                ): (
                                    <div className="space-y-4">
                                        {orders.map((orders: any) => (
                                            <div key={orders.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow border-gray-300">
                                                <div className="flex justify-between items-center mb-3">
                                                    <div>
                                                        <span className="font-['Montserrat_Alternates'] font-semibold">Заказ №{orders.order_number}</span>
                                                        <span className={`ml-3 px-2 py-1 rounded text-sm ${getStatusColor(orders.status)} bg-opacity-10`}>{getStatusText(orders.status)}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-500">{new Date(orders.created_at).toLocaleDateString('ru-RU')}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-['Montserrat_Alternates']">{orders.items_count} товаров</span>
                                                    <span className="font-['Montserrat_Alternates'] font-semibold text-firm-orange">{orders.total_amount} ₽</span>
                                                </div>
                                                <div className="mt-3">
                                                    <Link className="text-sm text-firm-orange hover:underline font-['Montserrat_Alternates']" href={`/profile/orders/${orders.id}`}>Подробнее</Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'favorites' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Избранное</h2>
                                {favorites.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">В избранном пока нет товаров</p>
                                        <Link className="inline-block px-6 py-3 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates']" href="/catalog">Перейти в католог</Link>
                                    </div>
                                ): (
                                    <div className="grid grid-cols-2 gap-4">
                                        {favorites.map((item: any) => (
                                            <div className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow" key={item.id}>
                                                <div className="aspect-square bg-[#eaeaea] rounded-lg mb-3 flex items-center justify-center">
                                                    {item.image ? (
                                                        <Image className="object-cover rounded-bg" src={item.image} alt="product" />
                                                    ): (<span className="text-gray-500">Нет фото</span>)}
                                                </div>
                                                <h3 className="font-['Montserrat_Alternates'] font-semibold truncate">{item.title}</h3>
                                                <p className="text-firm-pink font-['Montserrat_Alternates'] font-bold mt-2">{item.price} ₽</p>
                                                <Link className="mt-3 inline-block text-sm text-firm-orange hover:underline" href={`/catalog/${item.id}`}>Подробнее</Link>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'settings' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Настройки</h2>
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Смена пароля</h3>
                                        <form className="h-80 space-y-4 flex flex-col justify-center items-center">
                                            <div className="w-full h-60 space-y-4">
                                                <div className="w-full">
                                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Текущий пароль</label>
                                                    <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" type="password" placeholder="Текущий пароль" />
                                                </div>
                                                <div className="w-full">
                                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Новый пароль</label>
                                                    <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink" type="password" placeholder="Новый пароль" />
                                                </div>
                                                <div className="w-full">
                                                    <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Подтверждение пароля</label>
                                                    <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" type="password" placeholder="Повторите новый пароль" />
                                                </div>
                                            </div>
                                            <button className="w-[30%] h-12 px-4 py-2 border-2 border-firm-orange rounded-lg hover:cursor-pointer hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white transition-all duration-300 font-['Montserrat_Alternates']" type="submit">Изменить пароль</button>
                                        </form>
                                    </div>
                                    <div className="border-t border-gray-300">
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3 mt-3">Уведомления</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3">
                                                <input className="w-5 h-5 appearance-none border-2 border-firm-pink rounded-md bg-[#EAEAEA] checked:bg-firm-pink checked:border-firm-pink transition-all duration-200 cursor-pointer" type="checkbox" defaultChecked />
                                                <span>Получать уведомления о статусе заказов</span>
                                            </label>
                                            <label className="flex items-center gap-3">
                                                <input className="w-5 h-5 appearance-none border-2 border-firm-orange rounded-md bg-[#EAEAEA] checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer" type="checkbox" />
                                                <span>Получать рассылку о новинках и акциях</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
