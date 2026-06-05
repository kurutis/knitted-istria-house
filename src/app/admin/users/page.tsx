'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { debounce } from 'lodash'
import { motion, AnimatePresence } from "framer-motion"

import { SearchIcon } from "@/components/icons/SearchIcon"
import { UserIcon } from "@/components/icons/UserIcon"
import { CheckCircleIcon } from "@/components/icons/CheckCircleIcon"
import { CloseIcon } from "@/components/icons/CloseIcon"
import { StarIcon } from "@/components/icons/StarIcon"
import { EditIcon } from "@/components/icons/EditIcon"
import { ClockIcon } from "@/components/icons/ClockIcon"

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

const RoleBadge = ({ role }: { role: string }) => {
    const getRoleColor = () => {
        if (role === 'admin') return 'bg-red-50 text-red-700 border-red-200'
        if (role === 'master') return 'bg-green-50 text-green-700 border-green-200'
        return 'bg-blue-50 text-blue-700 border-blue-200'
    }
    const getRoleText = () => {
        if (role === 'admin') return 'Администратор'
        if (role === 'master') return 'Мастер'
        return 'Покупатель'
    }
    return (<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor()}`}>{getRoleText()}</span>)
}

const StatusBadge = ({ type, value }: { type: 'verified' | 'partner' | 'banned'; value: boolean }) => {
    if (!value) return null
    const config = {verified: { label: 'Верифицирован', color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircleIcon className="w-3 h-3" color="#22C55E" /> }, partner: { label: 'Партнер', color: 'bg-firm-pink/10 text-firm-pink border-firm-pink/20', icon: <StarIcon className="w-3 h-3" color="#D97C8E" /> }, banned: { label: 'Заблокирован', color: 'bg-red-50 text-red-700 border-red-200', icon: <CloseIcon className="w-3 h-3" color="#EF4444" /> }}
    const c = config[type]
    return (<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${c.color}`}>{c.icon}{c.label}</span>)
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
    const [isMobile, setIsMobile] = useState(false)
    const usersPerPage = 10

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

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
            const params = new URLSearchParams({page: currentPage.toString(), limit: usersPerPage.toString(), role: roleFilter, status: statusFilter, search: search})

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
            
            setUsers(users.map(user => 
                user.id === userId ? { ...user, ...updates } : user
            ))
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

    const fadeInUp = {initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }}

    if (loading && users.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 font-montserrat text-firm-gray text-sm sm:text-base">Загрузка пользователей...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 via-main to-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                    <h1 className="font-montserrat font-bold text-2xl sm:text-3xl lg:text-4xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Управление пользователями</h1>
                    {stats && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                            <UserIcon className="w-4 h-4" color="#737682" />
                            <span className="text-sm text-firm-gray"> Всего: {stats.total} | Активных: {stats.active} | Заблокировано: {stats.banned}</span>
                        </div>
                    )}
                </motion.div>

                {/* Фильтры */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <SearchIcon className="w-4 h-4" color="#737682" />
                        </div>
                        <input type="text" placeholder="Поиск по имени, email или телефону..." onChange={(e) => debouncedSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" />
                    </div>
                    <div className="flex gap-3">
                        <select value={roleFilter} onChange={(e) => {setRoleFilter(e.target.value); setCurrentPage(1)}} className="px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm cursor-pointer">
                            <option value="all">Все роли</option>
                            <option value="buyer">Покупатели ({stats?.by_role.buyer || 0})</option>
                            <option value="master">Мастера ({stats?.by_role.master || 0})</option>
                            <option value="admin">Администраторы ({stats?.by_role.admin || 0})</option>
                        </select>
                        <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1)}}  className="px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm cursor-pointer">
                            <option value="all">Все статусы</option>
                            <option value="active">Активные</option>
                            <option value="banned">Заблокированные</option>
                        </select>
                    </div>
                </div>

                <div className="bg-main rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-200">
                            <thead className="bg-linear-to-r from-gray-50 to-gray-100 border-b border-gray-100">
                                <tr>
                                    <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Пользователь</th>
                                    <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm hidden sm:table-cell">Контакты</th>
                                    <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Роль</th>
                                    <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm hidden md:table-cell">Статусы</th>
                                    <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {users.map((user, index) => (
                                        <motion.tr key={user.id} variants={fadeInUp} initial="initial" animate="animate"  exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.05 }} className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-300">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md flex-shrink-0">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt={user.name || ''} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-sm">{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-text text-sm">{user.name || 'Без имени'}</div>
                                                        <div className="text-xs text-firm-gray flex items-center gap-1 mt-0.5">
                                                            <ClockIcon className="w-3 h-3" />
                                                            {new Date(user.created_at).toLocaleDateString('ru-RU')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden sm:table-cell">
                                                <div className="text-sm">
                                                    <div className="font-medium text-text">{user.email}</div>
                                                    <div className="text-firm-gray text-xs mt-1">{user.phone || '—'}</div>
                                                    <div className="text-firm-gray text-xs">{user.city || '—'}</div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <RoleBadge role={user.role} />
                                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}  onClick={() => handleToggleRole(user.id, user.role)} className="p-1 rounded-lg bg-gray-100 hover:bg-firm-orange/20 transition-colors" title="Изменить роль"><EditIcon className="w-3.5 h-3.5" color="#737682" /></motion.button>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <StatusBadge type="verified" value={user.is_verified} />
                                                    <StatusBadge type="partner" value={user.is_partner} />
                                                    <StatusBadge type="banned" value={user.is_banned} />
                                                    {!user.is_verified && !user.is_partner && !user.is_banned && (<span className="text-firm-gray text-xs">—</span>)}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {user.role === 'master' && !user.is_verified && (<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleVerifyMaster(user.id, user.is_verified)} disabled={pendingAction?.userId === user.id} className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-firm-green text-white rounded-lg hover:shadow-md transition disabled:opacity-50"><CheckCircleIcon className="w-3.5 h-3.5" color="#f9f9f9" />{pendingAction?.userId === user.id && pendingAction?.action === 'verify' ? '...' : 'Верифицировать'} </motion.button> )}
                                                    {user.role === 'master' && (<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleTogglePartner(user.id, user.is_partner)} disabled={pendingAction?.userId === user.id} className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition ${user.is_partner ? 'bg-firm-pink/10 text-firm-pink border border-firm-pink/20 hover:bg-firm-pink/20' : 'bg-firm-pink text-white hover:shadow-md'} disabled:opacity-50`} ><StarIcon className="w-3.5 h-3.5" color={user.is_partner ? "#D97C8E" : "#f9f9f9"} />{user.is_partner ? 'Снять партнера' : 'Сделать партнером'}</motion.button>)}
                                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => openBanModal(user)} className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition ${user.is_banned ? 'bg-green-50 text-firm-green border border-green-200 hover:bg-green-100' : 'bg-firm-red text-white hover:shadow-md'}`}>
                                                        {user.is_banned ? (
                                                            <>
                                                                <CheckCircleIcon className="w-3.5 h-3.5" color="#22C55E" />
                                                                Разблокировать
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CloseIcon className="w-3.5 h-3.5" color="#f9f9f9" />
                                                                Заблокировать
                                                            </>
                                                        )}
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>

                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                        <div className="text-sm text-firm-gray">
                            Показано {(currentPage - 1) * usersPerPage + 1} - {Math.min(currentPage * usersPerPage, totalUsers)} из {totalUsers}
                        </div>
                        <div className="flex gap-1 flex-wrap justify-center">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm">Назад</motion.button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)).map((page, index, array) => (
                                    <div key={page} className="flex items-center">
                                        {index > 0 && page - array[index - 1] > 1 && (<span className="px-2 text-firm-gray">...</span>)}
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setCurrentPage(page)} className={`px-3 py-1 border rounded-lg transition text-sm ${currentPage === page ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white border-transparent shadow-md' : 'border-gray-200 hover:bg-gray-50'}`}>{page}</motion.button>
                                    </div>
                            ))}
                            
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm">Вперед</motion.button>
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showBanModal && selectedUser && (
                    <div className="fixed inset-0 bg-main-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowBanModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-montserrat font-semibold text-xl text-text">Блокировка пользователя</h2>
                                <button onClick={() => setShowBanModal(false)} className="p-1 rounded-lg hover:bg-gray-100 transition"><CloseIcon className="w-5 h-5" color="#737682" /></button>
                            </div>
                            <p className="text-firm-gray text-sm mb-4">Вы собираетесь заблокировать пользователя <strong className="text-text">{selectedUser.name || selectedUser.email}</strong>.</p>
                            <textarea  value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Укажите причину блокировки..." className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-red focus:outline-none focus:ring-2 focus:ring-firm-red/20 transition-all text-sm resize-none" rows={3} />
                            <div className="flex gap-3 mt-4">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowBanModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm">Отмена</motion.button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={confirmBan} disabled={!banReason.trim()} className="flex-1 px-4 py-2 bg-gradient-to-r from-firm-red to-red-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 text-sm">Заблокировать</motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}