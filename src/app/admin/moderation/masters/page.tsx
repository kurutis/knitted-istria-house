'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ui/ConfirmModal"
import PromptModal from "@/components/ui/PromptModal"

interface Master {
    id: string
    user_id: string
    name: string
    email: string
    phone: string | null
    city: string | null
    description: string | null
    is_verified: boolean
    is_partner: boolean
    created_at: string
    products_count: number
    rating: number
    full_name: string
    avatar_url: string | null
}

export default function AdminModerationMastersPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [pendingMasters, setPendingMasters] = useState<Master[]>([])
    const [verifiedMasters, setVerifiedMasters] = useState<Master[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [selectedMaster, setSelectedMaster] = useState<Master | null>(null)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    
    // Состояния для модальных окон
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'warning'
    })
    
    const [promptModal, setPromptModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: (value: string) => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    })

    useEffect(() => {
        if (status === 'loading') return

        if (!session || session.user?.role !== 'admin') {
            router.push('/auth/signin')
            return
        }

        loadMasters()
    }, [session, status, router])

    const loadMasters = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/masters')
            if (!response.ok) throw new Error('Failed to load masters')

            const data = await response.json()
            console.log('Loaded masters:', data)
            
            const pending = (data || []).filter((m: Master) => !m.is_verified)
            const verified = (data || []).filter((m: Master) => m.is_verified)
            
            setPendingMasters(pending)
            setVerifiedMasters(verified)
        } catch (error) {
            console.error('Ошибка загрузки мастеров:', error)
            toast.error('Ошибка загрузки мастеров')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (masterId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Подтверждение верификации',
            message: 'Вы уверены, что хотите подтвердить верификацию этого мастера?',
            type: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                setActionLoading(masterId)
                try {
                    const response = await fetch(`/api/admin/masters`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ masterId, action: 'approve' })
                    })

                    if (!response.ok) throw new Error('Failed to approve')
                    await loadMasters()
                    toast.success('Мастер успешно верифицирован!')
                } catch (error) {
                    console.error('Ошибка при одобрении:', error)
                    toast.error('Ошибка при одобрении заявки')
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    const openRejectModal = (master: Master) => {
        setSelectedMaster(master)
        setShowRejectModal(true)
    }

    const confirmReject = async () => {
        if (!selectedMaster || !rejectReason.trim()) return

        setActionLoading(selectedMaster.id)
        try {
            const response = await fetch(`/api/admin/masters`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    masterId: selectedMaster.id, 
                    action: 'reject', 
                    reason: rejectReason 
                })
            })

            if (!response.ok) throw new Error('Failed to reject')
            await loadMasters()
            setShowRejectModal(false)
            setRejectReason('')
            setSelectedMaster(null)
            toast.success('Заявка отклонена')
        } catch (error) {
            console.error('Ошибка при отклонении:', error)
            toast.error('Ошибка при отклонении заявки')
        } finally {
            setActionLoading(null)
        }
    }

    const handleRemoveVerification = async (masterId: string) => {
        setPromptModal({
            isOpen: true,
            title: 'Снятие верификации',
            message: 'Укажите причину отзыва верификации мастера:',
            onConfirm: async (reason) => {
                setPromptModal(prev => ({ ...prev, isOpen: false }))
                setActionLoading(masterId)
                try {
                    const response = await fetch(`/api/admin/masters`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ masterId, action: 'remove_verification', reason })
                    })

                    const result = await response.json()
                    
                    if (!response.ok) {
                        throw new Error(result.error || 'Failed to remove verification')
                    }
                    
                    toast.success(result.message || 'Верификация успешно снята')
                    await loadMasters()
                } catch (error) {
                    console.error('Ошибка при отзыве верификации:', error)
                    toast.error(error instanceof Error ? error.message : 'Ошибка при отзыве верификации')
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    if (loading && pendingMasters.length === 0 && verifiedMasters.length === 0) {
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
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка заявок мастеров...</p>
                </div>
            </motion.div>
        )
    }

    const displayName = (master: Master) => {
        return master.name || master.full_name || master.email?.split('@')[0] || 'Мастер'
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8 p-4 sm:p-6"
            >
                {/* Заголовок */}
                <motion.h1
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent"
                >
                    Модерация мастеров
                </motion.h1>

                {/* Ожидают верификации */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800">
                            Ожидают верификации ({pendingMasters.length})
                        </h2>
                    </div>

                    {pendingMasters.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                ✨ Нет заявок на верификацию
                            </motion.p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            <AnimatePresence>
                                {pendingMasters.map((master, index) => (
                                    <motion.div
                                        key={master.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-6 hover:bg-gradient-to-r hover:from-gray-50 to-transparent transition-all duration-300 group"
                                    >
                                        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4">
                                                    <motion.div
                                                        whileHover={{ scale: 1.1 }}
                                                        className="w-16 h-16 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-md flex-shrink-0"
                                                    >
                                                        {master.avatar_url ? (
                                                            <img 
                                                                src={master.avatar_url} 
                                                                alt={displayName(master)} 
                                                                className="w-full h-full object-cover" 
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none'
                                                                }}
                                                            />
                                                        ) : null}
                                                        {!master.avatar_url && (
                                                            <span>{displayName(master).charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </motion.div>
                                                    <div className="flex-1">
                                                        <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg text-gray-800">
                                                            {displayName(master)}
                                                        </h3>
                                                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                                                            <span className="flex items-center gap-1">📧 {master.email}</span>
                                                            <span className="flex items-center gap-1">📞 {master.phone || 'Телефон не указан'}</span>
                                                            <span className="flex items-center gap-1">📍 {master.city || 'Город не указан'}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                                                            <span>📅 Регистрация: {new Date(master.created_at).toLocaleDateString('ru-RU')}</span>
                                                            <span>📦 Товаров: {master.products_count || 0}</span>
                                                            <span>⭐ Рейтинг: {master.rating || 'Нет оценок'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {master.description && (
                                                    <motion.p
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.1 }}
                                                        className="text-gray-600 mt-4 line-clamp-3 pl-20"
                                                    >
                                                        {master.description}
                                                    </motion.p>
                                                )}
                                            </div>
                                            <div className="flex gap-3 flex-shrink-0 self-end lg:self-center">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleApprove(master.id)}
                                                    disabled={actionLoading === master.id}
                                                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium"
                                                >
                                                    {actionLoading === master.id ? '⏳' : '✓ Одобрить'}
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => openRejectModal(master)}
                                                    disabled={actionLoading === master.id}
                                                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-medium"
                                                >
                                                    ✗ Отклонить
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>

                {/* Верифицированные мастера */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl text-gray-800">
                            Верифицированные мастера ({verifiedMasters.length})
                        </h2>
                    </div>

                    {verifiedMasters.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <p>Нет верифицированных мастеров</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Мастер</th>
                                        <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700 hidden md:table-cell">Статистика</th>
                                        <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700 hidden sm:table-cell">Статус</th>
                                        <th className="text-left p-4 font-['Montserrat_Alternates'] font-semibold text-gray-700">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {verifiedMasters.map((master, index) => (
                                            <motion.tr
                                                key={master.id}
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
                                                            {master.avatar_url ? (
                                                                <img 
                                                                    src={master.avatar_url} 
                                                                    alt={displayName(master)} 
                                                                    className="w-full h-full object-cover" 
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none'
                                                                    }}
                                                                />
                                                            ) : null}
                                                            {!master.avatar_url && (
                                                                <span>{displayName(master).charAt(0).toUpperCase()}</span>
                                                            )}
                                                        </motion.div>
                                                        <div>
                                                            <div className="font-semibold text-gray-800">{displayName(master)}</div>
                                                            <div className="text-sm text-gray-500">{master.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 hidden md:table-cell">
                                                    <div className="text-sm">
                                                        <div className="text-gray-600">📦 Товаров: {master.products_count || 0}</div>
                                                        <div className="text-gray-600">⭐ Рейтинг: {master.rating || 'Нет'}</div>
                                                    </div>
                                                </td>
                                                <td className="p-4 hidden sm:table-cell">
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Верифицирован</span>
                                                        {master.is_partner && (
                                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Партнер</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <Link
                                                            href={`/admin/users/${master.user_id}`}
                                                            className="px-3 py-1 text-sm bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg hover:shadow-lg transition-all duration-300"
                                                        >
                                                            Профиль
                                                        </Link>
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleRemoveVerification(master.id)}
                                                            disabled={actionLoading === master.id}
                                                            className="px-3 py-1 text-sm bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                        >
                                                            {actionLoading === master.id ? '⏳' : 'Отозвать'}
                                                        </motion.button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>

                {/* Модальное окно отклонения */}
                <AnimatePresence>
                    {showRejectModal && selectedMaster && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowRejectModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 className="text-xl font-['Montserrat_Alternates'] font-semibold mb-4 text-red-600">
                                    Отклонение заявки
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    Вы собираетесь отклонить заявку мастера <strong>{displayName(selectedMaster)}</strong>.
                                </p>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Укажите причину отказа..."
                                    className="w-full p-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 mb-4"
                                    rows={3}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowRejectModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        onClick={confirmReject}
                                        disabled={!rejectReason.trim()}
                                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                    >
                                        Отклонить
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Кастомные модальные окна */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            <PromptModal
                isOpen={promptModal.isOpen}
                title={promptModal.title}
                message={promptModal.message}
                onConfirm={promptModal.onConfirm}
                onCancel={() => setPromptModal(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    )
}