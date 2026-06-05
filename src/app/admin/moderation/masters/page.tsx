'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ui/ConfirmModal"
import PromptModal from "@/components/ui/PromptModal"

import { UserIcon } from "@/components/icons/UserIcon"
import { MailIcon } from "@/components/icons/MailIcon"
import { PhoneIcon } from "@/components/icons/PhoneIcon"
import { LocateIcon } from "@/components/icons/LocateIcon"
import { CalendarIcon } from "@/components/icons/CalendarIcon"
import { ProductsIcon } from "@/components/icons/ProductsIcon"
import { StarIcon } from "@/components/icons/StarIcon"
import { CheckCircleIcon } from "@/components/icons/CheckCircleIcon"
import { CloseIcon } from "@/components/icons/CloseIcon"

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

const StatusBadge = ({ type }: { type: 'verified' | 'partner' }) => {
    if (type === 'verified') {return (<span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-firm-green rounded-full text-xs font-medium border border-green-200"><CheckCircleIcon className="w-3 h-3" color="#94D06C" />Верифицирован</span>)}
    return (<span className="inline-flex items-center gap-1 px-2 py-1 bg-firm-pink/10 text-firm-pink rounded-full text-xs font-medium border border-firm-pink/20"><StarIcon className="w-3 h-3" color="#D97C8E" />Партнер</span>)
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
    const [isMobile, setIsMobile] = useState(false)
    
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; type?: 'danger' | 'warning' | 'info';}>({isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning'})
    const [promptModal, setPromptModal] = useState<{isOpen: boolean; title: string; message: string; onConfirm: (value: string) => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}})

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
        loadMasters()
    }, [session, status, router])

    const loadMasters = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/masters')
            if (!response.ok) throw new Error('Failed to load masters')

            const data = await response.json()
            
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
            const response = await fetch(`/api/admin/masters`, {method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({masterId: selectedMaster.id, action: 'reject', reason: rejectReason})})

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
                    const response = await fetch(`/api/admin/masters`, {method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ masterId, action: 'remove_verification', reason })})

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

    const displayName = (master: Master) => {
        return master.name || master.full_name || master.email?.split('@')[0] || 'Мастер'
    }

    const fadeInUp = {initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }}

    if (loading && pendingMasters.length === 0 && verifiedMasters.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 font-montserrat text-firm-gray text-sm sm:text-base">Загрузка заявок мастеров...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="min-h-screen bg-linear-to-br from-gray-50 via-main to-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}  className="mb-6 sm:mb-8">
                        <h1 className="font-montserrat font-bold text-2xl sm:text-3xl lg:text-4xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Модерация мастеров</h1>
                    </motion.div>
                    <motion.div
                        variants={fadeInUp}
                        initial="initial"
                        animate="animate"
                        className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 mb-8"
                    >
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-linear-to-r from-gray-50 to-gray-100">
                            <h2 className="font-montserrat font-semibold text-lg sm:text-xl text-text"> верификации ({pendingMasters.length})</h2>
                        </div>

                        {pendingMasters.length === 0 ? (
                            <div className="p-12 text-center text-firm-gray">
                                <CheckCircleIcon className="w-12 h-12 mx-auto text-firm-gray opacity-50 mb-3" />
                                <p>Нет заявок на верификацию</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                <AnimatePresence>
                                    {pendingMasters.map((master, index) => (
                                        <motion.div key={master.id} variants={fadeInUp} initial="initial" animate="animate" exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.05 }}  className="p-4 sm:p-6 hover:bg-gray-50 transition-all duration-300">
                                            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-md flex-shrink-0">
                                                            {master.avatar_url ? (<img src={master.avatar_url} alt={displayName(master)} className="w-full h-full object-cover" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} />) : null}
                                                            {!master.avatar_url && (<span>{displayName(master).charAt(0).toUpperCase()}</span>)}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-montserrat font-semibold text-base sm:text-lg text-text">displayName(master)</h3>
                                                            <div className="flex flex-wrap gap-3 mt-1 text-xs sm:text-sm text-firm-gray">
                                                                <span className="inline-flex items-center gap-1 truncate"><MailIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#737682" />{master.email}</span>
                                                                <span className="inline-flex items-center gap-1"><PhoneIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#737682" />{master.phone || '—'}</span>
                                                                <span className="inline-flex items-center gap-1"><LocateIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#737682" />{master.city || '—'}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-firm-gray">
                                                                <span className="inline-flex items-center gap-1"><CalendarIcon className="w-3 h-3" color="#737682" />{new Date(master.created_at).toLocaleDateString('ru-RU')}</span>
                                                                <span className="inline-flex items-center gap-1"><ProductsIcon className="w-3 h-3" color="#737682" />Товаров: {master.products_count || 0}</span>
                                                                <span className="inline-flex items-center gap-1"><StarIcon className="w-3 h-3" color="#737682" />Рейтинг: {master.rating || 'Нет'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {master.description && (
                                                        <p className="text-firm-gray text-sm mt-4 line-clamp-2 pl-16 sm:pl-18">{master.description}</p>)}
                                                </div>
                                                <div className="flex gap-3 shrink-0 self-end lg:self-center">
                                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleApprove(master.id)} disabled={actionLoading === master.id}><CheckCircleIcon className="w-4 h-4" color="#f9f9f9" />{actionLoading === master.id ? '...' : 'Одобрить'}</motion.button>
                                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => openRejectModal(master)} disabled={actionLoading === master.id} className="inline-flex items-center gap-1 px-4 py-2 bg-firm-red text-main rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 text-sm font-medium"><CloseIcon className="w-4 h-4" color="#f9f9f9" />Отклонить</motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>

                    <motion.div variants={fadeInUp} initial="initial" animate="animate" className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-linear-to-r from-gray-50 to-gray-100">
                            <h2 className="font-montserrat font-semibold text-lg sm:text-xl text-text">Верифицированные мастера ({verifiedMasters.length})</h2>
                        </div>

                        {verifiedMasters.length === 0 ? (
                            <div className="p-12 text-center text-firm-gray">
                                <UserIcon className="w-12 h-12 mx-auto text-firm-gray opacity-50 mb-3" />
                                <p>Нет верифицированных мастеров</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-175">
                                    <thead className="bg-linear-to-r from-gray-50 to-gray-100 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Мастер</th>
                                            <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm hidden md:table-cell">Статистика</th>
                                            <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm hidden sm:table-cell">Статус</th>
                                            <th className="text-left p-4 font-montserrat font-semibold text-firm-gray text-xs sm:text-sm">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence>
                                            {verifiedMasters.map((master, index) => (
                                                <motion.tr key={master.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.05 }} className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-300">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold overflow-hidden shadow-md flex-shrink-0">
                                                                {master.avatar_url ? (<img src={master.avatar_url} alt={displayName(master)} className="w-full h-full object-cover" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} />) : null}
                                                                {!master.avatar_url && (<span className="text-sm">{displayName(master).charAt(0).toUpperCase()}</span>)}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-text text-sm">{displayName(master)}</div>
                                                                <div className="text-xs text-firm-gray line-clamp-1">{master.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 hidden md:table-cell">
                                                        <div className="text-sm text-firm-gray">
                                                            <div className="flex items-center gap-1">
                                                                <ProductsIcon className="w-3 h-3" color="#737682" />
                                                                Товаров: {master.products_count || 0}
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <StarIcon className="w-3 h-3" color="#737682" />
                                                                Рейтинг: {master.rating || 'Нет'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 hidden sm:table-cell">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <StatusBadge type="verified" />
                                                            {master.is_partner && <StatusBadge type="partner" />}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            <Link href={`/admin/users/${master.user_id}`} className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-linear-to-r from-firm-orange to-firm-pink text-white rounded-lg hover:shadow-md transition-all duration-300"><UserIcon className="w-3.5 h-3.5" color="#f9f9f9" />Профиль</Link>
                                                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleRemoveVerification(master.id)} disabled={actionLoading === master.id}  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-linear-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:shadow-md transition-all duration-300 disabled:opacity-50"><CloseIcon className="w-3.5 h-3.5" color="#f9f9f9" />{actionLoading === master.id ? '...' : 'Отозвать'}</motion.button>
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
                </div>
            </div>

            <AnimatePresence>
                {showRejectModal && selectedMaster && (
                    <div className="fixed inset-0 bg-main-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)} >
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-main rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-montserrat font-semibold text-xl text-firm-red">Отклонение заявки</h2>
                                <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-lg hover:bg-gray-100 transition"><CloseIcon className="w-5 h-5" color="#737682" /></button>
                            </div>
                            <p className="text-firm-gray text-sm mb-4">Вы собираетесь отклонить заявку мастера <strong className="text-text">{displayName(selectedMaster)}</strong>.</p>
                            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Укажите причину отказа..." className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-firm-red focus:outline-none focus:ring-2 focus:ring-firm-red/20 transition-all text-sm resize-none" rows={3} />
                            <div className="flex gap-3 mt-4">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition text-sm"> Отмена</motion.button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={confirmReject} disabled={!rejectReason.trim()} className="flex-1 px-4 py-2 bg-firm-red text-main rounded-xl hover:shadow-lg transition disabled:opacity-50 text-sm">Отклонить</motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
            <PromptModal isOpen={promptModal.isOpen} title={promptModal.title} message={promptModal.message} onConfirm={promptModal.onConfirm} onCancel={() => setPromptModal(prev => ({ ...prev, isOpen: false }))} />
        </>
    )
}