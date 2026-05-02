'use client'

import { signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface BuyerProfileProps {
    session: any
}

export default function BuyerProfile({ session }: BuyerProfileProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState('profile')
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [becomeMasterLoading, setBecomeMasterLoading] = useState(false)

    const [profileData, setProfileData] = useState({
        fullname: '',
        email: '',
        phone: '',
        city: '',
        address: '',
        avatarUrl: null as string | null,
        newsletterAgreement: false,
        role: 'buyer'
    })

    const [orders, setOrders] = useState([])
    const [favorites, setFavorites] = useState([])
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalSpent: 0,
        favoriteCount: 0
    })

    useEffect(() => {
        fetchProfileData()
        fetchOrders()
        fetchFavorites()
    }, [])

    const fetchProfileData = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/user/profile')
            const data = await response.json()
            setProfileData({
                ...data,
                role: data.role || 'buyer'
            })
        } catch (error) {
            console.error('Error fetching profile:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchOrders = async () => {
        try {
            const response = await fetch('/api/user/orders')
            const data = await response.json()
            setOrders(data)
            const total = data.reduce((sum: number, order: any) => sum + order.total_amount, 0)
            setStats(prev => ({ ...prev, totalOrders: data.length, totalSpent: total }))
        } catch (error) {
            console.error('Error fetching orders:', error)
        }
    }

    const fetchFavorites = async () => {
        try {
            const response = await fetch('/api/user/favorites')
            const data = await response.json()
            setFavorites(data)
            setStats(prev => ({ ...prev, favoriteCount: data.length }))
        } catch (error) {
            console.error('Error fetching favorites:', error)
        }
    }

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const formData = new FormData()
            formData.append('fullname', profileData.fullname)
            formData.append('phone', profileData.phone || '')
            formData.append('city', profileData.city || '')
            formData.append('address', profileData.address || '')
            formData.append('newsletterAgreement', String(profileData.newsletterAgreement))
            
            if (avatarFile) {
                formData.append('avatar', avatarFile)
            }

            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                body: formData
            })

            const data = await response.json()

            if (response.ok) {
                setIsEditing(false)
                setAvatarFile(null)
                setAvatarPreview(null)
                await fetchProfileData()
                alert('Профиль успешно обновлен')
            } else {
                alert(data.error || 'Ошибка при обновлении профиля')
            }
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Ошибка при обновлении профиля')
        } finally {
            setSaving(false)
        }
    }

    const handleBecomeMaster = async () => {
        if (!confirm('Вы уверены, что хотите стать мастером?\n\nПосле этого вы сможете добавлять товары, создавать мастер-классы и вести блог.')) {
            return
        }

        setBecomeMasterLoading(true)
        try {
            const response = await fetch('/api/user/become-master', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    city: profileData.city,
                    phone: profileData.phone
                })
            })

            const data = await response.json()

            if (response.ok) {
                alert('Поздравляем! Вы стали мастером. Страница будет обновлена.')
                // Обновляем сессию и перезагружаем страницу
                window.location.href = '/profile'
            } else {
                alert(data.error || 'Ошибка при переходе в статус мастера')
            }
        } catch (error) {
            console.error('Error becoming master:', error)
            alert('Ошибка при переходе в статус мастера')
        } finally {
            setBecomeMasterLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target
        setProfileData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const getStatusColor = (status: string) => {
        switch(status){
            case 'new': return 'text-blue-600 bg-blue-50'
            case 'confirmed': return 'text-green-600 bg-green-50'
            case 'shipped': return 'text-purple-600 bg-purple-50'
            case 'delivered': return 'text-gray-600 bg-gray-50'
            case 'cancelled': return 'text-red-600 bg-red-50'
            default: return 'text-gray-600 bg-gray-50'
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

    if (loading) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-5 flex items-start justify-center">
            <div className="flex flex-col gap-5 w-[80%] max-w-6xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">Личный кабинет</h1>
                        <p className="text-gray-600 mt-1">Добро пожаловать, {profileData.fullname || session?.user?.name}</p>
                        {profileData.role === 'buyer' && (
                            <p className="text-sm text-firm-orange mt-1">Статус: Покупатель</p>
                        )}
                        {profileData.role === 'master' && (
                            <p className="text-sm text-firm-pink mt-1">Статус: Мастер</p>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Заказов</p>
                            <p className="text-2xl font-bold text-firm-orange">{stats.totalOrders}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Потрачено</p>
                            <p className="text-2xl font-bold text-firm-pink">{stats.totalSpent.toLocaleString()} ₽</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">В избранном</p>
                            <p className="text-2xl font-bold text-firm-orange">{stats.favoriteCount}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-8">
                    <div className="w-1/4">
                        <div className="bg-white rounded-lg shadow-md p-4 sticky top-5">
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative w-24 h-24 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden border-2 border-white shadow-lg group">
                                    {avatarPreview ? (
                                        <Image src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" width={96} height={96} />
                                    ) : profileData.avatarUrl ? (
                                        <Image src={profileData.avatarUrl}  alt="avatar" className="w-full h-full object-cover" width={96}  height={96} />
                                    ) : (
                                        <span className="text-3xl font-['Montserrat_Alternates'] font-semibold text-white">{profileData.fullname?.charAt(0).toUpperCase() || session?.user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                                    )}
                                    
                                    {isEditing && (
                                        <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <span className="text-white text-xs">Изменить</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                        </label>
                                    )}
                                </div>
                                <h3 className="mt-3 font-['Montserrat_Alternates'] font-semibold text-lg text-center">
                                    {profileData.fullname || session?.user?.name}
                                </h3>
                                <p className="text-sm text-gray-500 text-center">{profileData.email || session?.user?.email}</p>
                                {profileData.city && (
                                    <p className="text-xs text-gray-400 mt-1">📍 {profileData.city}</p>
                                )}
                            </div>

                            <nav className="space-y-1">
                                <button className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'profile' ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`} onClick={() => setActiveTab('profile')}><span>👤</span> Мой профиль</button>
                                <button className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'orders' ? 'bg-firm-pink text-white' : 'hover:bg-[#eaeaea]'}`} onClick={() => setActiveTab('orders')}><span>📦</span> Мои заказы {orders.length > 0 && (<span className="ml-auto bg-white text-firm-pink text-xs px-2 py-1 rounded-full">{orders.length}</span> )}</button>
                                <button className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'favorites' ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`} onClick={() => setActiveTab('favorites')}><span>❤️</span> Избранное{favorites.length > 0 && (<span className="ml-auto bg-white text-firm-orange text-xs px-2 py-1 rounded-full">{favorites.length}</span> )}</button>
                                <button className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${activeTab === 'settings' ? 'bg-firm-pink text-white' : 'hover:bg-[#eaeaea]'}`} onClick={() => setActiveTab('settings')}><span>⚙️</span> Настройки</button>
                                <div className="border-t border-gray-200 my-2"></div>
                                <button className="w-full text-left px-4 py-3 rounded-lg transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 text-red-600 hover:bg-red-50" onClick={() => signOut({callbackUrl: '/'})}><span>🚪</span> Выйти</button>
                            </nav>
                        </div>
                    </div>

                    <div className="w-3/4">
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Мой профиль</h2>
                                    <div className="flex gap-3">
                                        {profileData.role === 'buyer' && (
                                            <button
                                                onClick={handleBecomeMaster}
                                                disabled={becomeMasterLoading}
                                                className="px-4 py-2 border-2 border-firm-pink rounded-lg hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white transition-all duration-300 font-['Montserrat_Alternates'] disabled:opacity-50"
                                            >
                                                {becomeMasterLoading ? 'Загрузка...' : 'Стать мастером'}
                                            </button>
                                        )}
                                        {!isEditing ? (
                                            <button className="px-4 py-2 border-2 border-firm-orange rounded-lg hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white transition-all duration-300 font-['Montserrat_Alternates']" onClick={() => setIsEditing(true)}>Редактировать</button>
                                        ) : (
                                            <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 font-['Montserrat_Alternates']"
                                                onClick={() => {
                                                    setIsEditing(false)
                                                    setAvatarFile(null)
                                                    setAvatarPreview(null)
                                                }}
                                            >
                                                Отмена
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">ФИО <span className="text-red-500">*</span></label>
                                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange focus:outline-2" type="text" name="fullname" value={profileData.fullname} onChange={handleInputChange} required placeholder="Иванов Иван Иванович" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Телефон</label>
                                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink focus:outline-2" type="tel" name="phone" value={profileData.phone || ''} onChange={handleInputChange} placeholder="+7 (999) 123-45-67"/>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Город</label>
                                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange focus:outline-2" type="text" name="city"  value={profileData.city || ''} onChange={handleInputChange} placeholder="Москва" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Адрес доставки</label>
                                            <input className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink focus:outline-2" type="text" name="address" value={profileData.address || ''} onChange={handleInputChange} placeholder="ул. Примерная, д. 1, кв. 1" />
                                        </div>
                                        <div className="flex items-center gap-3 mt-4">
                                            <div className="relative flex items-center">
                                                <input type="checkbox" name="newsletterAgreement" checked={profileData.newsletterAgreement} onChange={handleInputChange} className="w-5 h-5 appearance-none border-2 border-firm-orange rounded-md bg-[#EAEAEA] checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer" />
                                                {profileData.newsletterAgreement && (<svg className="absolute w-4 h-4 text-white left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>)}
                                            </div>
                                            <label className="text-gray-700 cursor-pointer select-none font-['Montserrat_Alternates']">Получать рассылку о новинках и акциях</label>
                                        </div>
                                        
                                        <button type="submit" disabled={saving} className="w-full mt-6 p-3 bg-firm-pink text-white rounded-lg hover:scale-105 transition-all duration-300 font-['Montserrat_Alternates'] font-semibold disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Сохранение...' : 'Сохранить изменения'}</button>
                                    </form>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="border-b border-gray-300 pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Имя</p>
                                                <p className="text-lg font-medium">{profileData.fullname || 'Не указано'}</p>
                                            </div>
                                            <div className="border-b border-gray-300 pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Email</p>
                                                <p className="text-lg font-medium">{profileData.email}</p>
                                            </div>
                                            <div className="border-b border-gray-300 pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Телефон</p>
                                                <p className="text-lg font-medium">{profileData.phone || 'Не указано'}</p>
                                            </div>
                                            <div className="border-b border-gray-300 pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Город</p>
                                                <p className="text-lg font-medium">{profileData.city || 'Не указано'}</p>
                                            </div>
                                            <div className="col-span-2 border-gray-300 border-b pb-4">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Адрес доставки</p>
                                                <p className="text-lg font-medium">{profileData.address || 'Не указано'}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">Рассылка</p>
                                                <p className="text-lg font-medium">
                                                    {profileData.newsletterAgreement ? '✅ Подписан' : '❌ Не подписан'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Orders, Favorites, Settings tabs remain the same */}
                        {activeTab === 'orders' && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Мои заказы</h2>
                                {orders.length === 0 ? (
                                    <div className="text-center py-12 bg-[#eaeaea] rounded-lg">
                                        <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">У вас пока нет заказов</p>
                                        <Link href="/catalog" className="inline-block px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates']">Перейти в каталог</Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {orders.map((order: any) => (
                                            <div key={order.id} className="border border-gray-300 rounded-lg p-5 hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="font-['Montserrat_Alternates'] font-semibold text-lg">Заказ #{order.order_number}</span>
                                                        <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span>
                                                    </div>
                                                    <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium">{order.items_count} товаров</p>
                                                    </div>
                                                    <span className="font-['Montserrat_Alternates'] font-bold text-firm-orange text-xl">{order.total_amount} ₽</span>
                                                </div>
                                                <div className="mt-3 flex justify-end">
                                                    <Link href={`/profile/orders/${order.id}`} className="text-sm text-firm-orange hover:underline">Подробнее</Link>
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
                                    <div className="text-center py-12 bg-[#eaeaea] rounded-lg">
                                        <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">В избранном пока нет товаров</p>
                                        <Link href="/catalog" className="inline-block px-6 py-3 bg-firm-pink text-white rounded-lg hover:bg-opacity-90 transition-all duration-300 font-['Montserrat_Alternates']">Перейти в каталог</Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        {favorites.map((item: any) => (
                                            <div key={item.id} className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <Link href={`/catalog/${item.id}`}>
                                                    <div className="aspect-square bg-[#eaeaea] rounded-lg mb-3 flex items-center justify-center">
                                                        {item.image ? (<Image src={item.image} alt={item.title} width={200} height={200} className="object-cover rounded-lg"/>) : ( <span className="text-gray-400 text-sm">Нет фото</span>)}
                                                    </div>
                                                    <h3 className="font-['Montserrat_Alternates'] font-semibold truncate">{item.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-1">от {item.master_name}</p>
                                                    <p className="text-firm-pink font-['Montserrat_Alternates'] font-bold mt-2">{item.price.toLocaleString()} ₽</p>
                                                </Link>
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
                                        <form className="space-y-4 max-w-md">
                                            <div>
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Текущий пароль</label>
                                                <input type="password" className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" placeholder="••••••••"/>
                                            </div>
                                            <div>
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Новый пароль</label>
                                                <input type="password" className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-pink" placeholder="не менее 6 символов" />
                                            </div>
                                            <div>
                                                <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Подтверждение</label>
                                                <input type="password" className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange" placeholder="повторите пароль" />
                                            </div>
                                            <button className="px-4 py-2 border-2 border-firm-orange rounded-lg hover:scale-105 transition-all duration-300 font-['Montserrat_Alternates']">Изменить пароль</button>
                                        </form>
                                    </div>
                                    <div className="border-t border-gray-300 pt-6">
                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Уведомления</h3>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3">
                                                <input type="checkbox" className="w-5 h-5 accent-firm-orange" defaultChecked />
                                                <span className="font-['Montserrat_Alternates']">О статусе заказов</span>
                                            </label>
                                            <label className="flex items-center gap-3">
                                                <input type="checkbox" className="w-5 h-5 accent-firm-pink" defaultChecked />
                                                <span className="font-['Montserrat_Alternates']">О новинках и акциях</span>
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