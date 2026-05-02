'use client'

import { signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast, Toaster } from 'react-hot-toast'

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
            toast.error('Ошибка загрузки профиля')
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
                toast.success('Профиль успешно обновлен!')
            } else {
                toast.error(data.error || 'Ошибка при обновлении профиля')
            }
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error('Ошибка при обновлении профиля')
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
                toast.success('Поздравляем! Вы стали мастером!')
                setTimeout(() => {
                    window.location.href = '/profile'
                }, 1500)
            } else {
                toast.error(data.error || 'Ошибка при переходе в статус мастера')
            }
        } catch (error) {
            console.error('Error becoming master:', error)
            toast.error('Ошибка при переходе в статус мастера')
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
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка профиля...</p>
                </motion.div>
            </div>
        )
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
            <Toaster position="top-right" />
            
            <div className="mt-5 flex items-start justify-center py-8 px-4">
                <div className="flex flex-col gap-6 w-full max-w-7xl">
                    {/* Header с анимацией */}
                    <motion.div
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gradient-to-r from-firm-orange/10 to-firm-pink/10 rounded-2xl p-6 backdrop-blur-sm"
                    >
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div>
                                <h1 className="font-['Montserrat_Alternates'] font-bold text-3xl md:text-4xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                    Личный кабинет
                                </h1>
                                <p className="text-gray-600 mt-2">
                                    Добро пожаловать, {profileData.fullname || session?.user?.name}
                                </p>
                                {profileData.role === 'buyer' && (
                                    <motion.span 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-firm-orange to-firm-pink text-white text-xs rounded-full"
                                    >
                                        🛍️ Покупатель
                                    </motion.span>
                                )}
                                {profileData.role === 'master' && (
                                    <motion.span 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="inline-block mt-2 px-3 py-1 bg-gradient-to-r from-firm-pink to-firm-orange text-white text-xs rounded-full"
                                    >
                                        ✨ Мастер
                                    </motion.span>
                                )}
                            </div>
                            
                            <div className="flex gap-6">
                                <motion.div whileHover={{ scale: 1.05 }} className="text-right">
                                    <p className="text-sm text-gray-500">Заказов</p>
                                    <p className="text-3xl font-bold text-firm-orange">{stats.totalOrders}</p>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} className="text-right">
                                    <p className="text-sm text-gray-500">Потрачено</p>
                                    <p className="text-3xl font-bold text-firm-pink">{stats.totalSpent.toLocaleString()} ₽</p>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} className="text-right">
                                    <p className="text-sm text-gray-500">В избранном</p>
                                    <p className="text-3xl font-bold text-firm-orange">{stats.favoriteCount}</p>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Sidebar */}
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5 }}
                            className="md:w-1/3 lg:w-1/4"
                        >
                            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-5 backdrop-blur-sm bg-white/95 border border-gray-100">
                                <div className="flex flex-col items-center mb-6">
                                    <motion.div 
                                        whileHover={{ scale: 1.05 }}
                                        className="relative w-28 h-28 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden border-4 border-white shadow-lg group cursor-pointer"
                                    >
                                        {avatarPreview ? (
                                            <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" />
                                        ) : profileData.avatarUrl ? (
                                            <img src={profileData.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-['Montserrat_Alternates'] font-bold text-white">
                                                {profileData.fullname?.charAt(0).toUpperCase() || session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </span>
                                        )}
                                        
                                        {isEditing && (
                                            <label className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <span className="text-white text-sm">Изменить</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                            </label>
                                        )}
                                    </motion.div>
                                    <h3 className="mt-4 font-['Montserrat_Alternates'] font-semibold text-xl text-center">
                                        {profileData.fullname || session?.user?.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 text-center">{profileData.email || session?.user?.email}</p>
                                    {profileData.city && (
                                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">📍 {profileData.city}</p>
                                    )}
                                </div>

                                <nav className="space-y-2">
                                    {[
                                        { id: 'profile', icon: '👤', label: 'Мой профиль' },
                                        { id: 'orders', icon: '📦', label: 'Мои заказы', count: orders.length },
                                        { id: 'favorites', icon: '❤️', label: 'Избранное', count: favorites.length },
                                        { id: 'settings', icon: '⚙️', label: 'Настройки' }
                                    ].map((tab) => (
                                        <motion.button
                                            key={tab.id}
                                            whileHover={{ x: 5 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 ${
                                                activeTab === tab.id
                                                    ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-lg'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            <span className="text-xl">{tab.icon}</span>
                                            <span className="flex-1">{tab.label}</span>
                                            {tab.count !== undefined && tab.count > 0 && (
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    activeTab === tab.id
                                                        ? 'bg-white text-firm-orange'
                                                        : 'bg-firm-orange/20 text-firm-orange'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </motion.button>
                                    ))}
                                    
                                    <div className="border-t border-gray-200 my-2 pt-2"></div>
                                    
                                    <motion.button
                                        whileHover={{ x: 5 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => signOut({ callbackUrl: '/' })}
                                        className="w-full text-left px-4 py-3 rounded-xl transition-all duration-300 font-['Montserrat_Alternates'] flex items-center gap-3 text-red-600 hover:bg-red-50"
                                    >
                                        <span className="text-xl">🚪</span>
                                        <span>Выйти</span>
                                    </motion.button>
                                </nav>
                            </div>
                        </motion.div>

                        {/* Main Content */}
                        <motion.div 
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="md:w-2/3 lg:w-3/4"
                        >
                            <AnimatePresence mode="wait">
                                {/* Profile Tab */}
                                {activeTab === 'profile' && (
                                    <motion.div
                                        key="profile"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
                                    >
                                        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                                            <h2 className="font-['Montserrat_Alternates'] font-bold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                                Мой профиль
                                            </h2>
                                            <div className="flex gap-3">
                                                {profileData.role === 'buyer' && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={handleBecomeMaster}
                                                        disabled={becomeMasterLoading}
                                                        className="px-5 py-2 bg-gradient-to-r from-firm-pink to-firm-orange text-white rounded-xl font-['Montserrat_Alternates'] font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                    >
                                                        {becomeMasterLoading ? (
                                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                                        ) : (
                                                            '✨ Стать мастером'
                                                        )}
                                                    </motion.button>
                                                )}
                                                {!isEditing ? (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setIsEditing(true)}
                                                        className="px-5 py-2 border-2 border-firm-orange text-firm-orange rounded-xl font-['Montserrat_Alternates'] font-medium hover:bg-firm-orange hover:text-white transition-all duration-300"
                                                    >
                                                        ✏️ Редактировать
                                                    </motion.button>
                                                ) : (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => {
                                                            setIsEditing(false)
                                                            setAvatarFile(null)
                                                            setAvatarPreview(null)
                                                        }}
                                                        className="px-5 py-2 bg-gray-500 text-white rounded-xl font-['Montserrat_Alternates'] font-medium hover:bg-gray-600 transition-all"
                                                    >
                                                        Отмена
                                                    </motion.button>
                                                )}
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <motion.form
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                onSubmit={handleProfileUpdate}
                                                className="space-y-5"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div>
                                                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] text-sm font-medium">
                                                            ФИО <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="fullname"
                                                            value={profileData.fullname}
                                                            onChange={handleInputChange}
                                                            required
                                                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all"
                                                            placeholder="Иванов Иван Иванович"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] text-sm font-medium">
                                                            Телефон
                                                        </label>
                                                        <input
                                                            type="tel"
                                                            name="phone"
                                                            value={profileData.phone || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all"
                                                            placeholder="+7 (999) 123-45-67"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] text-sm font-medium">
                                                            Город
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="city"
                                                            value={profileData.city || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all"
                                                            placeholder="Москва"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] text-sm font-medium">
                                                            Адрес доставки
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="address"
                                                            value={profileData.address || ''}
                                                            onChange={handleInputChange}
                                                            className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all"
                                                            placeholder="ул. Примерная, д. 1, кв. 1"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            name="newsletterAgreement"
                                                            checked={profileData.newsletterAgreement}
                                                            onChange={handleInputChange}
                                                            className="w-5 h-5 appearance-none border-2 border-firm-orange rounded-md bg-white checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer"
                                                        />
                                                        {profileData.newsletterAgreement && (
                                                            <svg className="absolute w-4 h-4 text-white left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <label className="text-gray-700 cursor-pointer select-none font-['Montserrat_Alternates'] text-sm">
                                                        Получать рассылку о новинках и акциях
                                                    </label>
                                                </div>
                                                
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    type="submit"
                                                    disabled={saving}
                                                    className="w-full mt-6 p-3 bg-gradient-to-r from-firm-pink to-firm-orange text-white rounded-xl font-['Montserrat_Alternates'] font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                >
                                                    {saving ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                            <span>Сохранение...</span>
                                                        </div>
                                                    ) : (
                                                        '💾 Сохранить изменения'
                                                    )}
                                                </motion.button>
                                            </motion.form>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                            >
                                                <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                                                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates'] mb-1">Имя</p>
                                                    <p className="text-lg font-medium">{profileData.fullname || 'Не указано'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                                                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates'] mb-1">Email</p>
                                                    <p className="text-lg font-medium">{profileData.email}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                                                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates'] mb-1">Телефон</p>
                                                    <p className="text-lg font-medium">{profileData.phone || 'Не указано'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                                                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates'] mb-1">Город</p>
                                                    <p className="text-lg font-medium">{profileData.city || 'Не указано'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow md:col-span-2">
                                                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates'] mb-1">Адрес доставки</p>
                                                    <p className="text-lg font-medium">{profileData.address || 'Не указано'}</p>
                                                </div>
                                                <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow md:col-span-2">
                                                    <p className="text-gray-500 text-sm font-['Montserrat_Alternates'] mb-1">Рассылка</p>
                                                    <p className="text-lg font-medium">
                                                        {profileData.newsletterAgreement ? '✅ Подписан' : '❌ Не подписан'}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Orders Tab */}
                                {activeTab === 'orders' && (
                                    <motion.div
                                        key="orders"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
                                    >
                                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Мои заказы</h2>
                                        {orders.length === 0 ? (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl">
                                                <div className="text-6xl mb-4">📦</div>
                                                <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">У вас пока нет заказов</p>
                                                <Link href="/catalog" className="inline-block px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all">
                                                    🛍️ Перейти в каталог
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {orders.map((order: any, idx: number) => (
                                                    <motion.div
                                                        key={order.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        whileHover={{ y: -2 }}
                                                        className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all"
                                                    >
                                                        <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                                                            <div>
                                                                <span className="font-['Montserrat_Alternates'] font-semibold text-lg">Заказ #{order.order_number}</span>
                                                                <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                                                    {getStatusText(order.status)}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm text-gray-500">
                                                                {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center flex-wrap gap-2">
                                                            <p className="font-medium">{order.items_count} товаров</p>
                                                            <span className="font-['Montserrat_Alternates'] font-bold text-xl text-firm-orange">{order.total_amount.toLocaleString()} ₽</span>
                                                        </div>
                                                        <div className="mt-3 flex justify-end">
                                                            <Link href={`/profile/orders/${order.id}`} className="text-sm text-firm-orange hover:underline inline-flex items-center gap-1">
                                                                Подробнее →
                                                            </Link>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Favorites Tab */}
                                {activeTab === 'favorites' && (
                                    <motion.div
                                        key="favorites"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
                                    >
                                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Избранное</h2>
                                        {favorites.length === 0 ? (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl">
                                                <div className="text-6xl mb-4">❤️</div>
                                                <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">В избранном пока нет товаров</p>
                                                <Link href="/catalog" className="inline-block px-6 py-3 bg-gradient-to-r from-firm-pink to-firm-orange text-white rounded-xl hover:shadow-lg transition-all">
                                                    🛍️ Перейти в каталог
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                                {favorites.map((item: any, idx: number) => (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        whileHover={{ y: -5 }}
                                                        className="border border-gray-200 rounded-xl p-4 hover:shadow-xl transition-all bg-white"
                                                    >
                                                        <Link href={`/catalog/${item.id}`}>
                                                            <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                                                {item.image ? (
                                                                    <img src={item.image} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                                ) : (
                                                                    <span className="text-gray-400 text-sm">Нет фото</span>
                                                                )}
                                                            </div>
                                                            <h3 className="font-['Montserrat_Alternates'] font-semibold truncate">{item.title}</h3>
                                                            <p className="text-sm text-gray-500 mt-1">от {item.master_name}</p>
                                                            <p className="text-firm-pink font-['Montserrat_Alternates'] font-bold mt-2 text-lg">{item.price.toLocaleString()} ₽</p>
                                                        </Link>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Settings Tab */}
                                {activeTab === 'settings' && (
                                    <motion.div
                                        key="settings"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
                                    >
                                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl mb-6">Настройки</h2>
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4">🔐 Смена пароля</h3>
                                                <form className="space-y-4 max-w-md">
                                                    <div>
                                                        <label className="block text-gray-700 mb-2 text-sm font-medium">Текущий пароль</label>
                                                        <input type="password" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" placeholder="••••••••" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-700 mb-2 text-sm font-medium">Новый пароль</label>
                                                        <input type="password" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all" placeholder="не менее 6 символов" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-gray-700 mb-2 text-sm font-medium">Подтверждение</label>
                                                        <input type="password" className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all" placeholder="повторите пароль" />
                                                    </div>
                                                    <motion.button
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        className="px-6 py-2 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl font-['Montserrat_Alternates'] font-medium hover:shadow-lg transition-all"
                                                    >
                                                        Изменить пароль
                                                    </motion.button>
                                                </form>
                                            </div>
                                            <div className="border-t border-gray-200 pt-6">
                                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-4">🔔 Уведомления</h3>
                                                <div className="space-y-3">
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input type="checkbox" className="w-5 h-5 accent-firm-orange" defaultChecked />
                                                        <span className="text-gray-700">О статусе заказов</span>
                                                    </label>
                                                    <label className="flex items-center gap-3 cursor-pointer">
                                                        <input type="checkbox" className="w-5 h-5 accent-firm-pink" defaultChecked />
                                                        <span className="text-gray-700">О новинках и акциях</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}