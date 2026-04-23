'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface DashboardStats {
    totalUsers: number
    totalMasters: number
    totalProducts: number
    totalOrders: number
    pendingModeration: {
        masters: number
        products: number
    }
    recentUsers: Array<any>
    recentOrders: Array<any>
}

export default function AdminDashboardPage(){
    const {data: session, status} = useSession()
    const router = useRouter()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showYarnModal, setShowYarnModal] = useState(false)
    const [showUserModal, setShowUserModal] = useState(false)
    const [saving, setSaving] = useState(false)
    
    const [yarnForm, setYarnForm] = useState({name: '', article: '', brand: '', color: '', composition: '', weight_grams: '', length_meters: '', price: '', in_stock: true, stock_quantity: '', image_url: '', description: ''})

    const [userForm, setUserForm] = useState({email: '', password: '', name: '', phone: '', role: 'buyer'})

    useEffect(()=>{
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin'){
            router.push('/auth/signin')
            return
        }

        loadDashboardStats()
    }, [session, status, router])

    const loadDashboardStats = async () => {
        try{
            setLoading(true)
            const response = await fetch('/api/admin/dashboard')
            
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to load stats')
            }
            
            const data = await response.json()
            setStats(data)
        } catch (error: any){
            setError(error.message)
        } finally{
            setLoading(false)
        }
    }

    const handleYarnInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setYarnForm(prev => ({...prev,[name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value}))
    }

    const handleAddYarn = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        
        try {
            const response = await fetch('/api/admin/yarn', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...yarnForm, weight_grams: yarnForm.weight_grams ? parseFloat(yarnForm.weight_grams) : null, length_meters: yarnForm.length_meters ? parseFloat(yarnForm.length_meters) : null, price: yarnForm.price ? parseFloat(yarnForm.price) : null, stock_quantity: yarnForm.stock_quantity ? parseInt(yarnForm.stock_quantity) : 0})})
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create yarn')
            }
            
            setShowYarnModal(false)
            resetYarnForm()
            alert('Пряжа успешно добавлена')
        } catch (error: any) {
            alert(error.message || 'Ошибка при создании пряжи')
        } finally {
            setSaving(false)
        }
    }

    const resetYarnForm = () => {
        setYarnForm({name: '', article: '', brand: '', color: '', composition: '', weight_grams: '', length_meters: '', price: '', in_stock: true, stock_quantity: '', image_url: '', description: ''})
    }

    const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setUserForm(prev => ({ ...prev, [name]: value }))
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        
        try {
            const response = await fetch('/api/admin/users/create', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm)})
            
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create user')
            }
            
            setShowUserModal(false)
            resetUserForm()
            alert('Пользователь успешно создан')
            await loadDashboardStats()
        } catch (error: any) {
            alert(error.message || 'Ошибка при создании пользователя')
        } finally {
            setSaving(false)
        }
    }

    const resetUserForm = () => {
        setUserForm({email: '', password: '', name: '', phone: '', role: 'buyer'})
    }

    if (loading){
        return(
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button onClick={loadDashboardStats} className="px-6 py-3 bg-firm-orange text-white rounded-lg">Попробовать снова</button>
                </div>
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="space-y-6">
            <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">Панель управления</h1>

            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">Всего пользователей</p>
                            <p className="text-3xl font-bold text-firm-orange">{stats.totalUsers}</p>
                        </div>
                        <span className="text-2xl">👥</span>
                    </div>
                    <Link href="/admin/users" className="text-sm text-firm-orange hover:underline mt-2 inline-block">Посмотреть всех →</Link>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">Мастеров</p>
                            <p className="text-3xl font-bold text-firm-pink">{stats.totalMasters}</p>
                        </div>
                        <span className="text-2xl">🎨</span>
                    </div>
                    <Link href="/admin/moderation/masters" className="text-sm text-firm-pink hover:underline mt-2 inline-block">Управление мастерами →</Link>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">Товаров</p>
                            <p className="text-3xl font-bold text-firm-orange">{stats.totalProducts}</p>
                        </div>
                        <span className="text-2xl">🛍️</span>
                    </div>
                    <Link href="/admin/moderation/products" className="text-sm text-firm-orange hover:underline mt-2 inline-block">Модерация товаров →</Link>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm">Заказов</p>
                            <p className="text-3xl font-bold text-firm-pink">{stats.totalOrders}</p>
                        </div>
                        <span className="text-2xl">📦</span>
                    </div>
                    <Link href="/admin/analytics" className="text-sm text-firm-pink hover:underline mt-2 inline-block">Аналитика продаж →</Link>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-4">Ожидают модерации</h2>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                        <span className="font-medium">Мастера</span>
                        <Link href="/admin/moderation/masters" className="text-firm-orange font-semibold">{stats.pendingModeration.masters} новых</Link>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                        <span className="font-medium">Товары</span>
                        <Link href="/admin/moderation/products" className="text-firm-orange font-semibold">{stats.pendingModeration.products} новых</Link>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                        <span className="font-medium">Записи блога</span>
                        <Link href="/admin/moderation/blog" className="text-firm-orange font-semibold">0 новых</Link>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-4">Быстрые действия</h2>
                <div className="flex gap-4 h-15">
                    <button onClick={() => setShowYarnModal(true)} className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 w-[20%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white hover:cursor-pointer">Добавить новую пряжу</button>
                    <button onClick={() => setShowUserModal(true)} className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-pink p-2 w-[20%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-pink hover:text-white hover:cursor-pointer">Создать пользователя</button>
                    <Link href="/admin/support" className="text-center font-['Montserrat_Alternates'] font-[450] border-2 border-gray-200 p-4 w-[20%] rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-gray-100 hover:cursor-pointer">Проверить обращения</Link>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-4">Последние пользователи</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#EAEAEA]">
                            <tr>
                                <th className="text-left p-3 rounded-l-lg">Имя</th>
                                <th className="text-left p-3">Email</th>
                                <th className="text-left p-3">Роль</th>
                                <th className="text-left p-3 rounded-r-lg">Дата регистрации</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentUsers?.map((user) => (
                                <tr key={user.id} className="border-b border-gray-200 hover:bg-[#EAEAEA]">
                                    <td className="p-3">{user.name || user.full_name || '-'}</td>
                                    <td className="p-3">{user.email}</td>
                                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${user.role === 'master' ? 'bg-purple-100 text-purple-700' : user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{user.role === 'master' ? 'Мастер' : user.role === 'admin' ? 'Админ' : 'Покупатель'}</span></td>
                                    <td className="p-3">{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showYarnModal && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowYarnModal(false)}>
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Добавить пряжу</h2>
                                <button onClick={() => setShowYarnModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                            </div>

                            <form onSubmit={handleAddYarn} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1">Название *</label>
                                        <input type="text" name="name" value={yarnForm.name} onChange={handleYarnInputChange} required className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1">Артикул *</label>
                                        <input type="text" name="article" value={yarnForm.article} onChange={handleYarnInputChange} required className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1">Бренд</label>
                                        <input type="text" name="brand" value={yarnForm.brand} onChange={handleYarnInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1">Цвет</label>
                                        <input type="text" name="color" value={yarnForm.color} onChange={handleYarnInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1">Состав</label>
                                    <input type="text" name="composition" value={yarnForm.composition} onChange={handleYarnInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1">Вес (г)</label>
                                        <input type="number" name="weight_grams" value={yarnForm.weight_grams} onChange={handleYarnInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1">Длина (м)</label>
                                        <input type="number" name="length_meters" value={yarnForm.length_meters} onChange={handleYarnInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-700 mb-1">Цена (₽)</label>
                                        <input type="number" name="price" value={yarnForm.price} onChange={handleYarnInputChange} step="0.01" className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 mb-1">Количество на складе</label>
                                        <input type="number" name="stock_quantity" value={yarnForm.stock_quantity} onChange={handleYarnInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input type="checkbox" name="in_stock" checked={yarnForm.in_stock} onChange={handleYarnInputChange} className="w-5 h-5 accent-firm-orange" />
                                    <label className="text-gray-700">В наличии</label>
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1">URL изображения</label>
                                    <input type="url" name="image_url" value={yarnForm.image_url} onChange={handleYarnInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1">Описание</label>
                                    <textarea name="description" value={yarnForm.description} onChange={handleYarnInputChange} rows={3} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">{saving ? 'Сохранение...' : 'Добавить'}</button>
                                    <button type="button" onClick={() => setShowYarnModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Отмена</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showUserModal && (
                <div className="fixed inset-0 bg-[#00000059] bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowUserModal(false)}>
                    <div className="bg-white rounded-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Создать пользователя</h2>
                                <button onClick={() => setShowUserModal(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
                            </div>

                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-gray-700 mb-1">Email *</label>
                                    <input type="email" name="email" value={userForm.email} onChange={handleUserInputChange} required className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1">Пароль *</label>
                                    <input type="password" name="password" value={userForm.password} onChange={handleUserInputChange} required minLength={6} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1">Имя</label>
                                    <input type="text" name="name" value={userForm.name} onChange={handleUserInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1">Телефон</label>
                                    <input type="tel" name="phone" value={userForm.phone} onChange={handleUserInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink" />
                                </div>

                                <div>
                                    <label className="block text-gray-700 mb-1">Роль</label>
                                    <select name="role" value={userForm.role} onChange={handleUserInputChange} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange">
                                        <option value="buyer">Покупатель</option>
                                        <option value="master">Мастер</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="submit" disabled={saving} className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50">{saving ? 'Создание...' : 'Создать'}</button>
                                    <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition">Отмена</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}