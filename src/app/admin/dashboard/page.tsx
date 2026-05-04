'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

interface DashboardStats {
    totalUsers: number
    totalMasters: number
    totalProducts: number
    totalOrders: number
    pendingModeration: {
        masters: number
        products: number
    }
    recentUsers: Array<{
        id: string
        name?: string
        full_name?: string
        email: string
        role: string
        created_at: string
    }>
    recentOrders: Array<{
        id: string
        order_number: string
        total_amount: number
        status: string
        created_at: string
        buyer_name?: string
        buyer_email?: string
    }>
}

export default function AdminDashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showYarnModal, setShowYarnModal] = useState(false)
    const [showUserModal, setShowUserModal] = useState(false)
    const [saving, setSaving] = useState(false)
    
    const [yarnForm, setYarnForm] = useState({
        name: '', article: '', brand: '', color: '', composition: '',
        weight_grams: '', length_meters: '', price: '', in_stock: true,
        stock_quantity: '', image_url: '', description: ''
    })

    const [userForm, setUserForm] = useState({
        email: '', password: '', name: '', phone: '', role: 'buyer'
    })

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadDashboardStats()
    }, [session, status, router])

    const loadDashboardStats = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/dashboard')
            
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to load stats')
            }
            
            const data = await response.json()
            setStats(data)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleYarnInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setYarnForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }))
    }

    const handleAddYarn = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        
        try {
            const response = await fetch('/api/admin/yarn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...yarnForm,
                    weight_grams: yarnForm.weight_grams ? parseFloat(yarnForm.weight_grams) : null,
                    length_meters: yarnForm.length_meters ? parseFloat(yarnForm.length_meters) : null,
                    price: yarnForm.price ? parseFloat(yarnForm.price) : null,
                    stock_quantity: yarnForm.stock_quantity ? parseInt(yarnForm.stock_quantity) : 0
                })
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create yarn')
            }
            
            setShowYarnModal(false)
            resetYarnForm()
            alert('Пряжа успешно добавлена')
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании пряжи'
            alert(errorMessage)
        } finally {
            setSaving(false)
        }
    }

    const resetYarnForm = () => {
        setYarnForm({
            name: '', article: '', brand: '', color: '', composition: '',
            weight_grams: '', length_meters: '', price: '', in_stock: true,
            stock_quantity: '', image_url: '', description: ''
        })
    }

    const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setUserForm(prev => ({ ...prev, [name]: value }))
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        
        try {
            const response = await fetch('/api/admin/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm)
            })
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create user')
            }
            
            setShowUserModal(false)
            resetUserForm()
            alert('Пользователь успешно создан')
            await loadDashboardStats()
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании пользователя'
            alert(errorMessage)
        } finally {
            setSaving(false)
        }
    }

    const resetUserForm = () => {
        setUserForm({ email: '', password: '', name: '', phone: '', role: 'buyer' })
    }

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center min-h-[60vh]"
            >
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                    />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка...</p>
                </div>
            </motion.div>
        )
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center min-h-[60vh]"
            >
                <div className="text-center">
                    <p className="text-firm-red mb-4">{error}</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={loadDashboardStats}
                        className="px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                        Попробовать снова
                    </motion.button>
                </div>
            </motion.div>
        )
    }

    if (!stats) return null

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, duration: 0.5 }
        })
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 p-4 sm:p-6"
        >
            {/* Заголовок */}
            <motion.h1
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent"
            >
                Панель управления
            </motion.h1>

            {/* Статистика */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Всего пользователей', value: stats.totalUsers, icon: '👥', link: '/admin/users', color: 'from-orange-500 to-pink-500' },
                    { label: 'Мастеров', value: stats.totalMasters, icon: '🎨', link: '/admin/moderation/masters', color: 'from-pink-500 to-purple-500' },
                    { label: 'Товаров', value: stats.totalProducts, icon: '🛍️', link: '/admin/moderation/products', color: 'from-orange-500 to-yellow-500' },
                    { label: 'Заказов', value: stats.totalOrders, icon: '📦', link: '/admin/analytics', color: 'from-pink-500 to-red-500' }
                ].map((item, index) => (
                    <motion.div
                        key={item.label}
                        custom={index}
                        initial="hidden"
                        animate="visible"
                        variants={cardVariants}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="bg-white rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-sm font-['Montserrat_Alternates']">{item.label}</p>
                                <p className={`text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                                    {item.value}
                                </p>
                            </div>
                            <span className="text-3xl">{item.icon}</span>
                        </div>
                        <Link
                            href={item.link}
                            className="text-sm text-firm-orange hover:underline mt-2 inline-block transition-all duration-300"
                        >
                            Подробнее →
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Ожидают модерации */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl shadow-xl p-6"
            >
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800 mb-4">
                    Ожидают модерации
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-firm-pink to-firm-orange rounded-xl">
                        <span className="font-medium text-main">👨‍🎨 Мастера</span>
                        <Link
                            href="/admin/moderation/masters"
                            className="text-main font-semibold hover:underline"
                        >
                            {stats.pendingModeration.masters} новых
                        </Link>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-firm-pink to-firm-orange rounded-xl">
                        <span className="font-medium text-main">🎁 Товары</span>
                        <Link
                            href="/admin/moderation/products"
                            className="text-main font-semibold hover:underline"
                        >
                            {stats.pendingModeration.products} новых
                        </Link>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-firm-pink to-firm-orange rounded-xl">
                        <span className="font-medium text-main">📝 Записи блога</span>
                        <span className="text-main font-semibold">0 новых</span>
                    </div>
                </div>
            </motion.div>

            {/* Быстрые действия */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl shadow-xl p-6"
            >
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800 mb-4">
                    Быстрые действия
                </h2>
                <div className="flex flex-wrap gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowYarnModal(true)}
                        className="font-['Montserrat_Alternates'] border-2 border-firm-orange p-3 rounded-xl transition-all duration-300 hover:bg-firm-orange hover:text-white cursor-pointer"
                    >
                        🧶 Добавить новую пряжу
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowUserModal(true)}
                        className="font-['Montserrat_Alternates'] border-2 border-firm-pink p-3 rounded-xl transition-all duration-300 hover:bg-firm-pink hover:text-white cursor-pointer"
                    >
                        👤 Создать пользователя
                    </motion.button>
                    <Link href="/admin/support">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="font-['Montserrat_Alternates'] border-2 border-gray-300 p-3 rounded-xl transition-all duration-300 hover:bg-gray-100 cursor-pointer"
                        >
                            💬 Проверить обращения
                        </motion.button>
                    </Link>
                </div>
            </motion.div>

            {/* Последние пользователи */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800">
                        Последние пользователи
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Имя</th>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Email</th>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Роль</th>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Дата регистрации</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {stats.recentUsers?.map((user, index) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 to-transparent transition-all duration-300"
                                    >
                                        <td className="p-4 text-gray-800">{user.name || user.full_name || '-'}</td>
                                        <td className="p-4 text-gray-600">{user.email}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                user.role === 'master' ? 'bg-firm-green text-main' :
                                                user.role === 'admin' ? 'bg-firm-red text-main' :
                                                'bg-firm-orange text-main'
                                            }`}>
                                                {user.role === 'master' ? 'Мастер' : user.role === 'admin' ? 'Админ' : 'Покупатель'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500">{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Модальное окно добавления пряжи */}
            <AnimatePresence>
                {showYarnModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowYarnModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                        Добавить пряжу
                                    </h2>
                                    <button onClick={() => setShowYarnModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">✕</button>
                                </div>

                                <form onSubmit={handleAddYarn} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Название *</label>
                                            <input type="text" name="name" value={yarnForm.name} onChange={handleYarnInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Артикул *</label>
                                            <input type="text" name="article" value={yarnForm.article} onChange={handleYarnInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Бренд</label>
                                            <input type="text" name="brand" value={yarnForm.brand} onChange={handleYarnInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Цвет</label>
                                            <input type="text" name="color" value={yarnForm.color} onChange={handleYarnInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Состав</label>
                                        <input type="text" name="composition" value={yarnForm.composition} onChange={handleYarnInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Вес (г)</label>
                                            <input type="number" name="weight_grams" value={yarnForm.weight_grams} onChange={handleYarnInputChange} step="0.01" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Длина (м)</label>
                                            <input type="number" name="length_meters" value={yarnForm.length_meters} onChange={handleYarnInputChange} step="0.01" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Цена (₽)</label>
                                            <input type="number" name="price" value={yarnForm.price} onChange={handleYarnInputChange} step="0.01" className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Количество на складе</label>
                                            <input type="number" name="stock_quantity" value={yarnForm.stock_quantity} onChange={handleYarnInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" name="in_stock" checked={yarnForm.in_stock} onChange={handleYarnInputChange} className="w-5 h-5 rounded accent-firm-orange" />
                                        <label className="text-gray-700">В наличии</label>
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">URL изображения</label>
                                        <input type="url" name="image_url" value={yarnForm.image_url} onChange={handleYarnInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" placeholder="https://..." />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Описание</label>
                                        <textarea name="description" value={yarnForm.description} onChange={handleYarnInputChange} rows={3} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <motion.button
                                            type="submit"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={saving}
                                            className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium"
                                        >
                                            {saving ? '⏳ Сохранение...' : '➕ Добавить'}
                                        </motion.button>
                                        <button
                                            type="button"
                                            onClick={() => setShowYarnModal(false)}
                                            className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Модальное окно создания пользователя */}
            <AnimatePresence>
                {showUserModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowUserModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                        Создать пользователя
                                    </h2>
                                    <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">✕</button>
                                </div>

                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Email *</label>
                                        <input type="email" name="email" value={userForm.email} onChange={handleUserInputChange} required className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Пароль *</label>
                                        <input type="password" name="password" value={userForm.password} onChange={handleUserInputChange} required minLength={6} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Имя</label>
                                        <input type="text" name="name" value={userForm.name} onChange={handleUserInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300" />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Телефон</label>
                                        <input type="tel" name="phone" value={userForm.phone} onChange={handleUserInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300" />
                                    </div>

                                    <div>
                                        <label className="block text-gray-700 mb-1 font-['Montserrat_Alternates']">Роль</label>
                                        <select name="role" value={userForm.role} onChange={handleUserInputChange} className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300">
                                            <option value="buyer">Покупатель</option>
                                            <option value="master">Мастер</option>
                                            <option value="admin">Администратор</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <motion.button
                                            type="submit"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={saving}
                                            className="flex-1 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium"
                                        >
                                            {saving ? '⏳ Создание...' : '👤 Создать'}
                                        </motion.button>
                                        <button
                                            type="button"
                                            onClick={() => setShowUserModal(false)}
                                            className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300"
                                        >
                                            Отмена
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}