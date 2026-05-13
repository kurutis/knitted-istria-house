'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { debounce } from 'lodash'
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface User {
    id: string
    email: string
    role: string
    role_text: string
    created_at: string
    is_banned: boolean
    ban_reason: string | null
    name: string | null
    phone: string | null
    city: string | null
    avatar_url: string | null
    is_verified: boolean
    is_partner: boolean
}

interface UsersResponse {
    users: User[]
    pagination: {
        total: number
        page: number
        limit: number
        totalPages: number
        hasMore: boolean
    }
    stats: {
        total: number
        by_role: {
            buyer: number
            master: number
            admin: number
        }
        banned: number
        active: number
    }
    lastUpdated: string
}

interface UserUpdates {
    is_verified?: boolean
    is_partner?: boolean
    is_banned?: boolean
    ban_reason?: string | null
    role?: string
}

export default function AdminUsersPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)
    const [stats, setStats] = useState<UsersResponse['stats'] | null>(null)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [showBanModal, setShowBanModal] = useState(false)
    const [banReason, setBanReason] = useState('')
    const [pendingAction, setPendingAction] = useState<{ userId: string; action: string } | null>(null)
    const usersPerPage = 10

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadUsers()
    }, [session, status, router, currentPage, roleFilter, statusFilter, search])

    const debouncedSearch = useCallback(
        debounce((searchTerm: string) => {
            setSearch(searchTerm)
            setCurrentPage(1)
        }, 500),
        []
    )

    const loadUsers = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: usersPerPage.toString(),
                role: roleFilter,
                status: statusFilter,
                search: search
            })

            const response = await fetch(`/api/admin/users?${params}`)
            if (!response.ok) throw new Error('Failed to load users')

            const data: UsersResponse = await response.json()
            setUsers(data.users || [])
            setTotalPages(data.pagination.totalPages || 1)
            setTotalUsers(data.pagination.total || 0)
            setStats(data.stats)
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (userId: string, updates: UserUpdates) => {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updates })
            })
            if (!response.ok) throw new Error('Failed to update user')

            const result = await response.json()
            alert(result.message)
            
            // Обновляем локальный список
            setUsers(users.map(user => 
                user.id === userId ? { ...user, ...updates } : user
            ))
            
            // Перезагружаем статистику
            loadUsers()
        } catch (error) {
            console.error("Ошибка обновления:", error)
            alert("Ошибка при обновлении статуса пользователя")
        }
    }

    const handleVerifyMaster = async (userId: string, currentStatus: boolean) => {
        if (currentStatus) return
        setPendingAction({ userId, action: 'verify' })
        if (confirm("Подтвердить верификацию мастера?")) {
            await handleUpdateStatus(userId, { is_verified: true })
        }
        setPendingAction(null)
    }

    const handleTogglePartner = async (userId: string, currentStatus: boolean) => {
        setPendingAction({ userId, action: 'partner' })
        await handleUpdateStatus(userId, { is_partner: !currentStatus })
        setPendingAction(null)
    }

    const handleToggleRole = async (userId: string, currentRole: string) => {
        const newRole = (currentRole === 'buyer' ? 'master' : currentRole === 'master' ? 'buyer' : 'buyer') as 'buyer' | 'master' | 'admin'
        if (confirm(`Изменить роль пользователя на "${newRole === 'master' ? 'Мастер' : newRole === 'admin' ? 'Администратор' : 'Покупатель'}"?`)) {
            await handleUpdateStatus(userId, { role: newRole })
        }
    }

    const openBanModal = (user: User) => {
        if (!user.is_banned) {
            setSelectedUser(user)
            setShowBanModal(true)
        } else {
            handleUpdateStatus(user.id, { is_banned: false, ban_reason: null })
        }
    }

    const confirmBan = () => {
        if (selectedUser && banReason.trim()) {
            handleUpdateStatus(selectedUser.id, { is_banned: true, ban_reason: banReason })
            setShowBanModal(false)
            setBanReason('')
            setSelectedUser(null)
        }
    }

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Админ</span>
            case 'master':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Мастер</span>
            default:
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Покупатель</span>
        }
    }

    const getStatusBadge = (type: string, value: boolean) => {
        if (!value) return null
        switch (type) {
            case 'verified':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Верифицирован</span>
            case 'partner':
                return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Партнер</span>
            case 'banned':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">Заблокирован</span>
            default:
                return null
        }
    }

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка пользователей...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4 sm:p-6">
            {/* Заголовок */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                    Управление пользователями
                </h1>
                <div className="flex gap-3">
                    {stats && (
                        <div className="text-gray-500 bg-gray-100 px-4 py-2 rounded-full text-sm">
                            Всего: {stats.total} | Активных: {stats.active} | Заблокировано: {stats.banned}
                        </div>
                    )}
                </div>
            </div>

            {/* Фильтры */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <input 
                        type="text" 
                        placeholder="🔍 Поиск по имени, email или телефону..." 
                        onChange={(e) => debouncedSearch(e.target.value)} 
                        className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300"
                    />
                </div>
                <select 
                    value={roleFilter} 
                    onChange={(e) => {
                        setRoleFilter(e.target.value)
                        setCurrentPage(1)
                    }} 
                    className="p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-pink transition-all duration-300 cursor-pointer"
                >
                    <option value="all">Все роли</option>
                    <option value="buyer">Покупатели ({stats?.by_role.buyer || 0})</option>
                    <option value="master">Мастера ({stats?.by_role.master || 0})</option>
                    <option value="admin">Администраторы ({stats?.by_role.admin || 0})</option>
                </select>
                <select 
                    value={statusFilter} 
                    onChange={(e) => {
                        setStatusFilter(e.target.value)
                        setCurrentPage(1)
                    }} 
                    className="p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-firm-orange transition-all duration-300 cursor-pointer"
                >
                    <option value="all">Все статусы</option>
                    <option value="active">Активные</option>
                    <option value="banned">Заблокированные</option>
                </select>
            </div>

            {/* Таблица пользователей */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Пользователь</th>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700 hidden sm:table-cell">Контакты</th>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Роль</th>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700 hidden md:table-cell">Статусы</th>
                                <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {users.map((user, index) => (
                                    <motion.tr 
                                        key={user.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-300 group"
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.name || ''} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg">{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-800">{user.name || 'Без имени'}</div>
                                                    <div className="text-sm text-gray-400">{new Date(user.created_at).toLocaleDateString('ru-RU')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 hidden sm:table-cell">
                                            <div className="text-sm">
                                                <div className="font-medium text-gray-700">{user.email}</div>
                                                <div className="text-gray-400">{user.phone || '—'}</div>
                                                <div className="text-gray-400 text-xs">{user.city || '—'}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {getRoleBadge(user.role)}
                                            <button
                                                onClick={() => handleToggleRole(user.id, user.role)}
                                                className="ml-2 text-xs text-gray-400 hover:text-firm-orange transition"
                                                title="Изменить роль"
                                            >
                                                🔄
                                            </button>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {getStatusBadge('verified', user.is_verified)}
                                                {getStatusBadge('partner', user.is_partner)}
                                                {getStatusBadge('banned', user.is_banned)}
                                                {!user.is_verified && !user.is_partner && !user.is_banned && (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {user.role === 'master' && !user.is_verified && (
                                                    <button
                                                        onClick={() => handleVerifyMaster(user.id, user.is_verified)}
                                                        disabled={pendingAction?.userId === user.id}
                                                        className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                                                    >
                                                        {pendingAction?.userId === user.id && pendingAction?.action === 'verify' ? '⏳' : '✓ Верифицировать'}
                                                    </button>
                                                )}
                                                {user.role === 'master' && (
                                                    <button
                                                        onClick={() => handleTogglePartner(user.id, user.is_partner)}
                                                        disabled={pendingAction?.userId === user.id}
                                                        className={`px-3 py-1 text-sm rounded-lg transition ${
                                                            user.is_partner 
                                                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                                                                : 'bg-purple-500 text-white hover:bg-purple-600'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {user.is_partner ? '★ Снять партнера' : '☆ Сделать партнером'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openBanModal(user)}
                                                    className={`px-3 py-1 text-sm rounded-lg transition ${
                                                        user.is_banned 
                                                            ? 'bg-green-500 text-white hover:bg-green-600' 
                                                            : 'bg-red-500 text-white hover:bg-red-600'
                                                    }`}
                                                >
                                                    {user.is_banned ? '🔓 Разблокировать' : '🔒 Заблокировать'}
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-500">
                        Показано {(currentPage - 1) * usersPerPage + 1} - {Math.min(currentPage * usersPerPage, totalUsers)} из {totalUsers}
                    </div>
                    <div className="flex gap-1 flex-wrap justify-center">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            ← Назад
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                            .map((page, index, array) => (
                                <div key={page} className="flex items-center">
                                    {index > 0 && page - array[index - 1] > 1 && (
                                        <span className="px-2 text-gray-400">...</span>
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-1 border rounded-lg transition ${
                                            currentPage === page 
                                                ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white border-transparent' 
                                                : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                </div>
                            ))}
                        
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Вперед →
                        </button>
                    </div>
                </div>
            )}

            {/* Модальное окно блокировки */}
            <AnimatePresence>
                {showBanModal && selectedUser && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowBanModal(false)}
                    >
                        <div
                            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-['Montserrat_Alternates'] font-semibold mb-4">Блокировка пользователя</h2>
                            <p className="text-gray-600 mb-4">
                                Вы собираетесь заблокировать пользователя <strong>{selectedUser.name || selectedUser.email}</strong>.
                            </p>
                            <textarea
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Укажите причину блокировки..."
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-red-500 transition mb-4"
                                rows={3}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBanModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={confirmBan}
                                    disabled={!banReason.trim()}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50"
                                >
                                    Заблокировать
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}