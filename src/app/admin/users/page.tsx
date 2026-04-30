'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { debounce } from 'lodash'
import { motion, AnimatePresence } from "framer-motion"
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
    }, [session, status, router, currentPage, roleFilter, search])

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
                search: search
            })

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
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updates })
            })
            if (!response.ok) throw new Error('Failed to update user')

            setUsers(users.map(user => user.id === userId ? { ...user, ...updates } : user))
        } catch (error) {
            console.error("Ошибка обновления:", error)
        }
    }

    const handleVerifyMaster = async (userId: string) => {
        setPendingAction({ userId, action: 'verify' })
        if (confirm("Подтвердить верификацию мастера?")) {
            handleUpdateStatus(userId, { is_verified: true })
        }
        setPendingAction(null)
    }

    const handleTogglePartner = async (userId: string, currentStatus: boolean) => {
        setPendingAction({ userId, action: 'partner' })
        handleUpdateStatus(userId, { is_partner: !currentStatus })
        setPendingAction(null)
    }

    const openBanModal = (userId: string, isBanned: boolean) => {
        if (!isBanned) {
            setSelectedUser(users.find(u => u.id === userId) || null)
            setShowBanModal(true)
        } else {
            handleUpdateStatus(userId, { is_banned: false, ban_reason: null })
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
                return <span className="px-2 py-1 bg-firm-red text-main rounded-full text-xs font-medium shadow-sm">Админ</span>
            case 'master':
                return <span className="px-2 py-1 bg-firm-green text-main rounded-full text-xs font-medium shadow-sm">Мастер</span>
            default:
                return <span className="px-2 py-1 bg-firm-orange text-main rounded-full text-xs font-medium shadow-sm">Покупатель</span>
        }
    }

    const getStatusBadge = (type: string, value: boolean) => {
        if (!value) return null
        switch (type) {
            case 'verified':
                return <span className="px-2 py-1 bg-firm-green text-main rounded-full text-xs font-medium">Верифицирован</span>
            case 'partner':
                return <span className="px-2 py-1 bg-firm-pink text-main rounded-full text-xs font-medium">Партнер</span>
            case 'banned':
                return <span className="px-2 py-1 bg-firm-red text-main rounded-full text-xs font-medium">Заблокирован</span>
            default:
                return null
        }
    }

    if (loading && users.length === 0) {
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
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка пользователей...</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 p-4 sm:p-6"
        >
            {/* Заголовок */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <motion.h1 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent"
                >
                    Управление пользователями
                </motion.h1>
                <motion.p 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-gray-500 bg-gray-100 px-4 py-2 rounded-full text-sm"
                >
                    Всего: {totalUsers} пользователей
                </motion.p>
            </div>

            {/* Фильтры */}
            <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col sm:flex-row gap-4"
            >
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
                    <option value="buyer">Покупатели</option>
                    <option value="master">Мастера</option>
                    <option value="admin">Администраторы</option>
                </select>
            </motion.div>

            {/* Таблица пользователей */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden"
            >
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
                                        className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 to-transparent transition-all duration-300 group"
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <motion.div 
                                                    whileHover={{ scale: 1.1 }}
                                                    className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md"
                                                >
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.name || user.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg">{user.name?.charAt(0) || user.full_name?.charAt(0) || 'U'}</span>
                                                    )}
                                                </motion.div>
                                                <div>
                                                    <div className="font-semibold text-gray-800">{user.name || user.full_name || 'Без имени'}</div>
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
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {getStatusBadge('verified', user.master_verified)}
                                                {getStatusBadge('partner', user.master_partner)}
                                                {getStatusBadge('banned', user.is_banned)}
                                                {!user.master_verified && !user.master_partner && !user.is_banned && (
                                                    <span className="text-gray-400 text-xs">—</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                {user.role === 'master' && !user.master_verified && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleVerifyMaster(user.id)}
                                                        disabled={pendingAction?.userId === user.id}
                                                        className="px-3 py-1 text-sm bg-firm-green text-main rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                    >
                                                        {pendingAction?.userId === user.id && pendingAction?.action === 'verify' ? '⏳' : '✓ Верифицировать'}
                                                    </motion.button>
                                                )}
                                                {user.role === 'master' && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleTogglePartner(user.id, user.master_partner)}
                                                        disabled={pendingAction?.userId === user.id}
                                                        className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${
                                                            user.master_partner 
                                                                ? 'bg-firm-orange text-main hover:shadow-lg' 
                                                                : 'bg-gradient-to-r from-firm-orange to-firm-pink text-main hover:shadow-lg'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {user.master_partner ? '★ Снять партнера' : '☆ Сделать партнером'}
                                                    </motion.button>
                                                )}
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => openBanModal(user.id, user.is_banned)}
                                                    className={`px-3 py-1 text-sm rounded-lg transition-all duration-300 ${
                                                        user.is_banned 
                                                            ? 'bg-firm-green text-main hover:shadow-lg' 
                                                            : 'bg-firm-red text-main hover:shadow-lg'
                                                    }`}
                                                >
                                                    {user.is_banned ? '🔓 Разблокировать' : '🔒 Заблокировать'}
                                                </motion.button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Пагинация */}
            {totalPages > 1 && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row justify-between items-center gap-4"
                >
                    <div className="text-sm text-gray-500">
                        Показано {(currentPage - 1) * usersPerPage + 1} - {Math.min(currentPage * usersPerPage, totalUsers)} из {totalUsers}
                    </div>
                    <div className="flex gap-1 flex-wrap justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        >
                            ← Назад
                        </motion.button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
                            .map((page, index, array) => (
                                <div key={page} className="flex items-center">
                                    {index > 0 && page - array[index - 1] > 1 && (
                                        <span className="px-2 text-gray-400">...</span>
                                    )}
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-1 border rounded-lg transition-all duration-300 ${
                                            currentPage === page 
                                                ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-main border-transparent shadow-md' 
                                                : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        {page}
                                    </motion.button>
                                </div>
                            ))}
                        
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        >
                            Вперед →
                        </motion.button>
                    </div>
                </motion.div>
            )}

            {/* Модальное окно блокировки */}
            <AnimatePresence>
                {showBanModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowBanModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-['Montserrat_Alternates'] font-semibold mb-4">Блокировка пользователя</h2>
                            <p className="text-gray-600 mb-4">
                                Вы собираетесь заблокировать пользователя <strong>{selectedUser?.name || selectedUser?.email}</strong>.
                            </p>
                            <textarea
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="Укажите причину блокировки..."
                                className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 mb-4"
                                rows={3}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBanModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={confirmBan}
                                    disabled={!banReason.trim()}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                >
                                    Заблокировать
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}