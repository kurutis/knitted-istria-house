'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"
import ConfirmModal from "@/components/ui/ConfirmModal"
import PromptModal from "@/components/ui/PromptModal"
import { UserIcon } from "@/components/icons/UserIcon"
import { MailIcon } from "@/components/icons/MailIcon"
import { CalendarIcon } from "@/components/icons/CalendarIcon"
import { TagIcon } from "@/components/icons/TagIcon"
import { ClassesIcon } from "@/components/icons/ClassesIcon"
import { PriceIcon } from "@/components/icons/PriceIcon"
import { SizeIcon } from "@/components/icons/SizeIcon"
import { DescriptionIcon } from "@/components/icons/DescriptionIcon"
import { ClockIcon } from "@/components/icons/ClockIcon"
import { CheckIcon } from "@/components/icons/CheckIcon"
import { EditIcon } from "@/components/icons/EditIcon"
import { CloseIcon } from "@/components/icons/CloseIcon"
import { ViewsIcon } from "@/components/icons/ViewsIcon"
import { RefreshIcon } from "@/components/icons/RefreshIcon"

interface ProductImage {
    id: string
    image_url: string
    sort_order: number
}

interface Product {
    id: string
    title: string
    description: string
    price: number
    status: string
    category: string
    technique: string
    size: string
    main_image_url: string
    created_at: string
    views: number
    master_id: string
    master_name: string
    master_email: string
    images: ProductImage[]
}

export default function AdminModerationProductsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [filter, setFilter] = useState<'all' | 'moderation' | 'draft' | 'active'>('all')
    
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

        loadProducts()
    }, [session, status, router])

    const loadProducts = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/products')
            
            if (!response.ok) {
                throw new Error(`Failed to load products: ${response.status}`)
            }
            
            const data = await response.json()
            
            const productsList = Array.isArray(data) ? data : []
            setProducts(productsList)
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error)
            toast.error('Ошибка загрузки товаров')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (productId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Одобрение товара',
            message: 'Вы уверены, что хотите одобрить этот товар? Он будет опубликован на сайте.',
            type: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                setActionLoading(productId)
                try {
                    const response = await fetch('/api/admin/products', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId, action: 'approve' })
                    })
                    
                    if (!response.ok) throw new Error('Failed to approve')
                    
                    await loadProducts()
                    if (showModal) setShowModal(false)
                    toast.success('Товар успешно одобрен!')
                } catch (error) {
                    console.error(error)
                    toast.error('Ошибка при одобрении товара')
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    const handleReject = async (productId: string) => {
        setPromptModal({
            isOpen: true,
            title: 'Отклонение товара',
            message: 'Укажите причину отклонения товара:',
            onConfirm: async (reason) => {
                setPromptModal(prev => ({ ...prev, isOpen: false }))
                setActionLoading(productId)
                try {
                    const response = await fetch('/api/admin/products', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId, action: 'reject', reason })
                    })
                    
                    if (!response.ok) throw new Error('Failed to reject')
                    
                    await loadProducts()
                    if (showModal) setShowModal(false)
                    toast.success('Товар отклонён')
                } catch (error) {
                    console.error(error)
                    toast.error('Ошибка при отклонении товара')
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    const handleReturnToDraft = async (productId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Отправка на доработку',
            message: 'Вы уверены, что хотите отправить товар на доработку мастеру?',
            type: 'warning',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }))
                setActionLoading(productId)
                try {
                    const response = await fetch('/api/admin/products', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId, action: 'draft' })
                    })
                    
                    if (!response.ok) throw new Error('Failed to return to draft')
                    
                    await loadProducts()
                    if (showModal) setShowModal(false)
                    toast.success('Товар отправлен на доработку')
                } catch (error) {
                    console.error(error)
                    toast.error('Ошибка при возврате товара на доработку')
                } finally {
                    setActionLoading(null)
                }
            }
        })
    }

    const openModal = (product: Product) => {
        setSelectedProduct(product)
        setShowModal(true)
    }

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'moderation':
                return <span className="px-2 py-1 bg-firm-orange/20 text-firm-orange rounded-full text-xs font-medium flex items-center gap-1">
                    <ClockIcon size={12} color="#F4A67F" />
                    На модерации
                </span>
            case 'draft':
                return <span className="px-2 py-1 bg-firm-gray/20 text-firm-gray rounded-full text-xs font-medium flex items-center gap-1">
                    <EditIcon size={12} color="#737682" />
                    На доработке
                </span>
            case 'active':
                return <span className="px-2 py-1 bg-firm-green/20 text-firm-green rounded-full text-xs font-medium flex items-center gap-1">
                    <CheckIcon size={12} color="#94D06C" />
                    Активен
                </span>
            case 'rejected':
                return <span className="px-2 py-1 bg-firm-red/20 text-firm-red rounded-full text-xs font-medium flex items-center gap-1">
                    <CloseIcon size={12} color="#D77C7C" />
                    Отклонен
                </span>
            default:
                return null
        }
    }

    const getStatusActions = (status: string) => {
        switch(status) {
            case 'moderation':
                return (
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button
                            onClick={() => handleApprove(selectedProduct!.id)}
                            className="flex-1 py-2 bg-firm-green text-white rounded-lg hover:opacity-80 transition flex items-center justify-center gap-2"
                        >
                            <CheckIcon size={18} color="#ffffff" />
                            Одобрить
                        </button>
                        <button
                            onClick={() => handleReturnToDraft(selectedProduct!.id)}
                            className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:opacity-80 transition flex items-center justify-center gap-2"
                        >
                            <EditIcon size={18} color="#ffffff" />
                            На доработку
                        </button>
                        <button
                            onClick={() => handleReject(selectedProduct!.id)}
                            className="flex-1 py-2 bg-firm-red text-white rounded-lg hover:opacity-80 transition flex items-center justify-center gap-2"
                        >
                            <CloseIcon size={18} color="#ffffff" />
                            Отклонить
                        </button>
                    </div>
                )
            case 'draft':
                return (
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button
                            onClick={() => handleApprove(selectedProduct!.id)}
                            className="flex-1 py-2 bg-firm-green text-white rounded-lg hover:opacity-80 transition flex items-center justify-center gap-2"
                        >
                            <CheckIcon size={18} color="#ffffff" />
                            Одобрить
                        </button>
                        <button
                            onClick={() => handleReject(selectedProduct!.id)}
                            className="flex-1 py-2 bg-firm-red text-white rounded-lg hover:opacity-80 transition flex items-center justify-center gap-2"
                        >
                            <CloseIcon size={18} color="#ffffff" />
                            Отклонить
                        </button>
                    </div>
                )
            case 'active':
                return (
                    <div className="flex flex-wrap gap-3 mt-4">
                        <button
                            onClick={() => handleReturnToDraft(selectedProduct!.id)}
                            className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:opacity-80 transition flex items-center justify-center gap-2"
                        >
                            <EditIcon size={18} color="#ffffff" />
                            Отправить на доработку
                        </button>
                    </div>
                )
            default:
                return null
        }
    }

    const filteredProducts = products.filter(p => {
        if (filter === 'all') return true
        return p.status === filter
    })

    const stats = {
        all: products.length,
        moderation: products.filter(p => p.status === 'moderation').length,
        draft: products.filter(p => p.status === 'draft').length,
        active: products.filter(p => p.status === 'active').length,
        rejected: products.filter(p => p.status === 'rejected').length
    }

    if (loading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center min-h-[60vh] bg-main"
            >
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                    />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray flex items-center justify-center gap-2">
                        <RefreshIcon size={18} color="#737682" className="animate-spin" />
                        Загрузка товаров...
                    </p>
                </div>
            </motion.div>
        )
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6 p-4 sm:p-6 bg-main min-h-screen"
            >
                {/* Заголовок */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                            Управление товарами
                        </h1>
                        <p className="text-firm-gray text-sm mt-1">Все товары платформы</p>
                    </div>
                </div>

                {/* Фильтры */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-wrap gap-3"
                >
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                            filter === 'all' 
                                ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                                : 'bg-forms text-firm-gray hover:bg-gray-200'
                        }`}
                    >
                        Все ({stats.all})
                    </button>
                    <button
                        onClick={() => setFilter('moderation')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                            filter === 'moderation' 
                                ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                                : 'bg-forms text-firm-gray hover:bg-gray-200'
                        }`}
                    >
                        <ClockIcon size={14} color={filter === 'moderation' ? '#ffffff' : '#737682'} />
                        На модерации ({stats.moderation})
                    </button>
                    <button
                        onClick={() => setFilter('draft')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                            filter === 'draft' 
                                ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                                : 'bg-forms text-firm-gray hover:bg-gray-200'
                        }`}
                    >
                        <EditIcon size={14} color={filter === 'draft' ? '#ffffff' : '#737682'} />
                        На доработке ({stats.draft})
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                            filter === 'active' 
                                ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                                : 'bg-forms text-firm-gray hover:bg-gray-200'
                        }`}
                    >
                        <CheckIcon size={14} color={filter === 'active' ? '#ffffff' : '#737682'} />
                        Опубликованные ({stats.active})
                    </button>
                </motion.div>

                {/* Список товаров */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <AnimatePresence>
                        {filteredProducts.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-white rounded-2xl shadow-xl p-12 text-center text-firm-gray"
                            >
                                <p className="text-lg">Нет товаров для отображения</p>
                            </motion.div>
                        ) : (
                            filteredProducts.map((product, index) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -2 }}
                                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Изображение */}
                                            <div 
                                                className="w-32 h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
                                                onClick={() => openModal(product)}
                                            >
                                                {product.main_image_url ? (
                                                    <img
                                                        src={product.main_image_url}
                                                        alt={product.title}
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <ViewsIcon size={32} color="#737682" />
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <h3 
                                                            className="font-['Montserrat_Alternates'] font-semibold text-xl cursor-pointer hover:text-firm-orange transition-colors text-text"
                                                            onClick={() => openModal(product)}
                                                        >
                                                            {product.title}
                                                        </h3>
                                                        <div className="flex flex-wrap gap-3 mt-2 text-firm-gray text-sm">
                                                            <span className="flex items-center gap-1">
                                                                <UserIcon size={14} color="#737682" />
                                                                {product.master_name}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <MailIcon size={14} color="#737682" />
                                                                {product.master_email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-['Montserrat_Alternates'] font-bold text-2xl text-firm-orange flex items-center justify-end gap-1">
                                                            <PriceIcon size={18} color="#F4A67F" />
                                                            {product.price.toLocaleString()} ₽
                                                        </p>
                                                        <p className="text-xs text-firm-gray mt-1 flex items-center justify-end gap-1">
                                                            <CalendarIcon size={12} color="#737682" />
                                                            {new Date(product.created_at).toLocaleDateString('ru-RU')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Теги */}
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {product.category && (
                                                        <span className="px-2 py-1 bg-firm-pink/20 text-firm-pink rounded-lg text-xs font-medium flex items-center gap-1">
                                                            <TagIcon size={12} color="#D97C8E" />
                                                            {product.category}
                                                        </span>
                                                    )}
                                                    {product.technique && (
                                                        <span className="px-2 py-1 bg-firm-pink/20 text-firm-pink rounded-lg text-xs font-medium flex items-center gap-1">
                                                            <ClassesIcon size={12} color="#D97C8E" />
                                                            {product.technique}
                                                        </span>
                                                    )}
                                                    {product.size && product.size !== 'Не применимо' && (
                                                        <span className="px-2 py-1 bg-firm-pink/20 text-firm-pink rounded-lg text-xs font-medium flex items-center gap-1">
                                                            <SizeIcon size={12} color="#D97C8E" />
                                                            {product.size}
                                                        </span>
                                                    )}
                                                    {getStatusBadge(product.status)}
                                                </div>

                                                {/* Описание */}
                                                <p className="text-firm-gray mt-3 line-clamp-2 text-sm flex items-start gap-1">
                                                    <DescriptionIcon size={14} color="#737682" className="mt-0.5 flex-shrink-0" />
                                                    {product.description}
                                                </p>

                                                {/* Кнопки действий для модерации */}
                                                {product.status === 'moderation' && (
                                                    <div className="flex flex-wrap gap-3 mt-4">
                                                        <button
                                                            onClick={() => handleApprove(product.id)}
                                                            disabled={actionLoading === product.id}
                                                            className="px-4 py-2 bg-firm-green text-white rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {actionLoading === product.id ? (
                                                                <RefreshIcon size={16} color="#ffffff" className="animate-spin" />
                                                            ) : (
                                                                <CheckIcon size={16} color="#ffffff" />
                                                            )}
                                                            Одобрить
                                                        </button>
                                                        <button
                                                            onClick={() => handleReturnToDraft(product.id)}
                                                            disabled={actionLoading === product.id}
                                                            className="px-4 py-2 bg-firm-orange text-white rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {actionLoading === product.id ? (
                                                                <RefreshIcon size={16} color="#ffffff" className="animate-spin" />
                                                            ) : (
                                                                <EditIcon size={16} color="#ffffff" />
                                                            )}
                                                            На доработку
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(product.id)}
                                                            disabled={actionLoading === product.id}
                                                            className="px-4 py-2 bg-firm-red text-white rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {actionLoading === product.id ? (
                                                                <RefreshIcon size={16} color="#ffffff" className="animate-spin" />
                                                            ) : (
                                                                <CloseIcon size={16} color="#ffffff" />
                                                            )}
                                                            Отклонить
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Кнопки для черновиков */}
                                                {product.status === 'draft' && (
                                                    <div className="flex flex-wrap gap-3 mt-4">
                                                        <button
                                                            onClick={() => handleApprove(product.id)}
                                                            disabled={actionLoading === product.id}
                                                            className="px-4 py-2 bg-firm-green text-white rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {actionLoading === product.id ? (
                                                                <RefreshIcon size={16} color="#ffffff" className="animate-spin" />
                                                            ) : (
                                                                <CheckIcon size={16} color="#ffffff" />
                                                            )}
                                                            Одобрить
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(product.id)}
                                                            disabled={actionLoading === product.id}
                                                            className="px-4 py-2 bg-firm-red text-white rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {actionLoading === product.id ? (
                                                                <RefreshIcon size={16} color="#ffffff" className="animate-spin" />
                                                            ) : (
                                                                <CloseIcon size={16} color="#ffffff" />
                                                            )}
                                                            Отклонить
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Кнопки для опубликованных товаров */}
                                                {product.status === 'active' && (
                                                    <div className="flex flex-wrap gap-3 mt-4">
                                                        <button
                                                            onClick={() => handleReturnToDraft(product.id)}
                                                            disabled={actionLoading === product.id}
                                                            className="px-4 py-2 bg-firm-orange text-white rounded-xl text-sm font-medium hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {actionLoading === product.id ? (
                                                                <RefreshIcon size={16} color="#ffffff" className="animate-spin" />
                                                            ) : (
                                                                <EditIcon size={16} color="#ffffff" />
                                                            )}
                                                            Отправить на доработку
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Модальное окно просмотра товара */}
                <AnimatePresence>
                    {showModal && selectedProduct && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-main-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                                        {selectedProduct.title}
                                    </h2>
                                    <button onClick={() => setShowModal(false)} className="text-firm-gray hover:text-text transition-colors">
                                        <CloseIcon size={24} color="#737682" />
                                    </button>
                                </div>

                                <div className="p-6">
                                    {/* Изображения */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                        {selectedProduct.main_image_url && (
                                            <div className="aspect-square bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-md">
                                                <img
                                                    src={selectedProduct.main_image_url}
                                                    alt={selectedProduct.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-forms rounded-xl p-4">
                                                <p className="text-firm-gray text-sm mb-1 flex items-center gap-1">
                                                    <UserIcon size={14} color="#737682" />
                                                    Мастер
                                                </p>
                                                <p className="font-medium text-text">{selectedProduct.master_name}</p>
                                                <p className="text-sm text-firm-gray flex items-center gap-1 mt-1">
                                                    <MailIcon size={12} color="#737682" />
                                                    {selectedProduct.master_email}
                                                </p>
                                            </div>
                                            <div className="bg-forms rounded-xl p-4">
                                                <p className="text-firm-gray text-sm mb-1 flex items-center gap-1">
                                                    <PriceIcon size={14} color="#737682" />
                                                    Цена
                                                </p>
                                                <p className="font-['Montserrat_Alternates'] font-bold text-2xl text-firm-orange">
                                                    {selectedProduct.price.toLocaleString()} ₽
                                                </p>
                                            </div>
                                        </div>

                                        {selectedProduct.category && (
                                            <div className="bg-forms rounded-xl p-4">
                                                <p className="text-firm-gray text-sm mb-1 flex items-center gap-1">
                                                    <TagIcon size={14} color="#737682" />
                                                    Категория
                                                </p>
                                                <p className="text-text">{selectedProduct.category}</p>
                                            </div>
                                        )}

                                        {selectedProduct.technique && (
                                            <div className="bg-forms rounded-xl p-4">
                                                <p className="text-firm-gray text-sm mb-1 flex items-center gap-1">
                                                    <ClassesIcon size={14} color="#737682" />
                                                    Техника вязания
                                                </p>
                                                <p className="text-text">{selectedProduct.technique}</p>
                                            </div>
                                        )}

                                        {selectedProduct.size && selectedProduct.size !== 'Не применимо' && (
                                            <div className="bg-forms rounded-xl p-4">
                                                <p className="text-firm-gray text-sm mb-1 flex items-center gap-1">
                                                    <SizeIcon size={14} color="#737682" />
                                                    Размер
                                                </p>
                                                <p className="text-text">{selectedProduct.size}</p>
                                            </div>
                                        )}

                                        {selectedProduct.description && (
                                            <div className="bg-forms rounded-xl p-4">
                                                <p className="text-firm-gray text-sm mb-1 flex items-center gap-1">
                                                    <DescriptionIcon size={14} color="#737682" />
                                                    Описание
                                                </p>
                                                <p className="whitespace-pre-line text-text">{selectedProduct.description}</p>
                                            </div>
                                        )}

                                        <div className="bg-forms rounded-xl p-4">
                                            <p className="text-firm-gray text-sm mb-1 flex items-center gap-1">
                                                <CalendarIcon size={14} color="#737682" />
                                                Дата создания
                                            </p>
                                            <p className="text-text">{new Date(selectedProduct.created_at).toLocaleDateString('ru-RU', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</p>
                                        </div>
                                    </div>

                                    {getStatusActions(selectedProduct.status)}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

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