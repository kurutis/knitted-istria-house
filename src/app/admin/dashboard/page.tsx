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
            console.error('Ошибка загрузки статистики', error)
            setError(error.message)
        } finally{
            setLoading(false)
        }
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
        <div className="mt-5 flex items-start justify-center">
            <div className="flex flex-col gap-5 w-[90%] max-w-7xl">
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
                    <div className="flex gap-4">
                        <Link href="/admin/catalog/yarn/new" className="px-4 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90">Добавить новую пряжу</Link>
                        <Link href="/admin/users/new" className="px-4 py-2 border-2 border-firm-pink text-firm-pink rounded-lg hover:bg-firm-pink hover:text-white transition">Создать пользователя</Link>
                        <Link href="/admin/support" className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition">Проверить обращения</Link>
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
                                        <td className="p-3"> <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'master' ? 'bg-purple-100 text-purple-700' : user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{user.role === 'master' ? 'Мастер' : user.role === 'admin' ? 'Админ' : 'Покупатель'}</span></td>
                                        <td className="p-3">{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}