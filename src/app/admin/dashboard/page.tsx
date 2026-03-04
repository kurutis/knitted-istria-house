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

    useEffect(()=>{
        if (status === 'loading') return

        if (!session || session.user.role !== 'admin'){
            router.push('/auth/signin')
            return
        }

        loadDashboardStats()
    }, [session, status, router])

    const loadDashboardStats  = async () => {
        try{
            const response = await fetch('/api/admin/dashboard')
            if (!response.ok) throw new Error('Failed to load stats')
        } catch (error){
            console.error('Ошибка загрузки статистики', error)
        }finally{
            setLoading(false)
        }
    }

    if (loading){
        return(
            <div>
                <div>Загрузка...</div>
            </div>
        )
    }

    return (
        <div>
            <h1>Дашбоард администратора</h1>

            <div>
                <div>
                    <div>
                        <div>
                            <p>Всего пользователей</p>
                            <p>{stats.totalUsers}</p>
                        </div>
                        <div>
                            <span>👥</span>
                        </div>
                    </div>
                    <Link href="/admin/users">Посмотреть всех →</Link>
                </div>

                <div>
                    <div>
                        <div>
                            <p>Мастеров</p>
                            <p>{stats.totalMasters}</p>
                        </div>
                        <div>
                            <span>🎨</span>
                        </div>
                    </div>
                    <Link href="/admin/moderation/masters">Управление мастерами →</Link>
                </div>

                <div>
                    <div>
                        <div>
                            <p>Товаров</p>
                            <p>{stats.totalProducts}</p>
                        </div>
                        <div>
                            <span>🛍️</span>
                        </div>
                    </div>
                    <Link href="/admin/moderation/products">Модерация товаров →</Link>
                </div>

                <div>
                    <div>
                        <div>
                            <p>Заказов</p>
                            <p>{stats.totalOrders}</p>
                        </div>
                        <div>
                            <span>📦</span>
                        </div>
                    </div>
                    <Link href="/admin/analytics">Аналитика продаж</Link>
                </div>
            </div>

            <div>
                <div>
                    <h2>Ожидают модерации</h2>
                    <div>
                        <div>
                            <span>Мастера</span>
                            <Link href="/admin/moderation/masters">{stats.pendingModeration.masters} новых</Link>
                        </div>
                        <div>
                            <span>Товары</span>
                            <Link href="/admin/moderation/products">{stats.pendingModeration.products} новых</Link>
                        </div>
                        <div>
                            <span>Записи блога</span>
                            <Link href="/admin/moderation/blog">{stats.pendingModeration.blogPosts}</Link>
                        </div>
                    </div>
                </div>

                
                <div>
                    <h2>Быстрые действия</h2>
                        <div>
                            <Link href="/admin/catalog/yarn/new">Добавить новую пряжу</Link>
                            <Link href="/admin/users/new">Создать пользователя</Link>
                            <Link href="/admin/support">Проверить обращения</Link>
                        </div>
                </div>

                <div>
                    <div>
                        <h2>Последние пользователи</h2>
                    </div>
                    <div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Имя</th>
                                    <th>Email</th>
                                    <th>Роль</th>
                                    <th>Дата регистрации</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.recentUsers.map((user) =>(
                                    <tr key={user.id}>
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span>{user.role === 'master' ? 'Maстер': user.role === 'admin' ? 'Админ' : 'Покупатель'}</span>
                                        </td>
                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
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