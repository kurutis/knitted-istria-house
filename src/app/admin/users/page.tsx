'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import {debounce} from 'lodash'
import Image from "next/image"
import Link from "next/link"

interface User {
    id: string
    name: string
    email: string
    phone: string
    city: string
    role: 'buyer' | 'master' | 'admin'
    role_selected: boolean
    is_verified: boolean
    is_partner: boolean
    is_banned: boolean
    created_at: string
    full_name: string
    avatar_url: string
    master_verified: boolean
    master_partner: boolean
}

interface UsersResponse {
    users: User[]
    total: number
    page: number
    totalPages: number
}

export default function AdminUsersPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)
    const usersPerPage = 10

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadUsers()
    }, [session, status, router, currentPage, roleFilter, search])

    const debouncedSearch = useCallback(debounce((searchTerm: string) => {setSearch(searchTerm); setCurrentPage(1)}, 500),[])

    const loadUsers = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({page: currentPage.toString(), limit: usersPerPage.toString(), role: roleFilter, search: search})

            const response = await fetch(`/api/admin/users?${params}`)
            if (!response.ok) throw new Error('Failed to load users')

            const data: UsersResponse = await response.json()
            setUsers(data.users || [])
            setTotalPages(data.totalPages || 1)
            setTotalUsers(data.total || 0)
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (userId: string, updates: any) => {
        try {
            const response = await fetch('/api/admin/users', {method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, updates })})
            if (!response.ok) throw new Error('Failed to update user')

            setUsers(users.map(user => user.id === userId ? { ...user, ...updates } : user))
        } catch (error) {
            console.error("Ошибка обновления:", error)
        }
    }

    const handleVerifyMaster = async (userId: string) => {
        if (!confirm("Подтвердить верификацию мастера?")) return
        handleUpdateStatus(userId, { is_verified: true })
    }

    const handleTogglePartner = async (userId: string, currentStatus: boolean) => {
        handleUpdateStatus(userId, { is_partner: !currentStatus })
    }

    const handleToggleBan = async (userId: string, currentStatus: boolean) => {
        const action = currentStatus ? 'Разблокировать' : 'Заблокировать'
        if (!confirm(`Вы уверены, что хотите ${action} пользователя?`)) return

        if (currentStatus) {
            handleUpdateStatus(userId, { is_banned: false, ban_reason: null })
        } else {
            const reason = prompt('Укажите причину блокировки:')
            if (!reason) return
            handleUpdateStatus(userId, { is_banned: true, ban_reason: reason })
        }
    }

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка пользователей...</p>
                </div>
            </div>
        )
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Админ</span>
            case 'master': return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Мастер</span>
            default: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Покупатель</span>
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Управление пользователями</h1>
                <p className="text-gray-500">Всего: {totalUsers}</p>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <input type="text" placeholder="Поиск по имени, email или телефону..." onChange={(e) => debouncedSearch(e.target.value)} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange" />
                </div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink">
                    <option value="all">Все роли</option>
                    <option value="buyer">Покупатели</option>
                    <option value="master">Мастера</option>
                    <option value="admin">Администраторы</option>
                </select>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#EAEAEA]">
                            <tr>
                                <th className="text-left p-4">Пользователь</th>
                                <th className="text-left p-4">Контакты</th>
                                <th className="text-left p-4">Роль</th>
                                <th className="text-left p-4">Статусы</th>
                                <th className="text-left p-4">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-gray-200 hover:bg-[#FAFAFA] transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden">
                                                {user.avatar_url ? (<Image src={user.avatar_url} alt={user.name || user.full_name} width={40} height={40} className="object-cover" />) : (<span className="text-lg">{user.name?.charAt(0) || user.full_name?.charAt(0) || 'U'}</span>)}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{user.name || user.full_name || 'Без имени'}</div>
                                                <div className="text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString('ru-RU')}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            <div className="font-medium">{user.email}</div>
                                            <div className="text-gray-500">{user.phone || '—'}</div>
                                            <div className="text-gray-500 text-xs">{user.city || '—'}</div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {getRoleBadge(user.role)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.master_verified && (<span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Верифицирован</span>)}
                                            {user.master_partner && (<span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">Партнер</span>)}
                                            {user.is_banned && (<span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Заблокирован</span>)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-2">
                                            {user.role === 'master' && !user.master_verified && (<button onClick={() => handleVerifyMaster(user.id)} className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition">Верифицировать</button>)}
                                            {user.role === 'master' && (<button onClick={() => handleTogglePartner(user.id, user.master_partner)} className={`px-3 py-1 text-sm rounded-lg transition ${user.master_partner ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-firm-orange text-white hover:bg-opacity-90'}`}>{user.master_partner ? 'Снять партнера' : 'Сделать партнером'}</button>)}
                                            <button onClick={() => handleToggleBan(user.id, user.is_banned)} className={`px-3 py-1 text-sm rounded-lg transition ${user.is_banned ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`}>{user.is_banned ? 'Разблокировать' : 'Заблокировать'}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-500">
                        Показано {(currentPage - 1) * usersPerPage + 1} - {Math.min(currentPage * usersPerPage, totalUsers)} из {totalUsers}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded-lg hover:bg-[#EAEAEA] disabled:opacity-50 disabled:cursor-not-allowed transition">Назад</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)).map((page, index, array) => (
                                <div key={page} className="flex items-center">
                                    {index > 0 && page - array[index - 1] > 1 && (<span className="px-2 text-gray-400">...</span>)}
                                    <button onClick={() => setCurrentPage(page)} className={`px-3 py-1 border rounded-lg transition ${currentPage === page ? 'bg-firm-orange text-white border-firm-orange' : 'hover:bg-[#EAEAEA]'}`}>{page}</button>
                                </div>
                            ))}
                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded-lg hover:bg-[#EAEAEA] disabled:opacity-50 disabled:cursor-not-allowed transition">Вперед</button>
                    </div>
                </div>
            )}
        </div>
    )
}