'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

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
    const [filter, setFilter] = useState<'all' | 'moderation' | 'draft'>('all')

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
            if (!response.ok) throw new Error('Failed to load products')
            
            const data = await response.json()
            setProducts(data || [])
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (productId: string) => {
        if (!confirm("Одобрить товар для публикации?")) return
        
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
        } catch (error) {
            alert('Ошибка при одобрении товара')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (productId: string) => {
        const reason = prompt('Укажите причину отклонения:')
        if (reason === null) return
        
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
        } catch (error) {
            alert('Ошибка при отклонении товара')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReturnToDraft = async (productId: string) => {
        if (!confirm("Отправить товар на доработку мастеру?")) return
        
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
        } catch (error) {
            alert('Ошибка при возврате товара на доработку')
        } finally {
            setActionLoading(null)
        }
    }

    const openModal = (product: Product) => {
        setSelectedProduct(product)
        setShowModal(true)
    }

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'moderation':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">⏳ На модерации</span>
            case 'draft':
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">📝 На доработке</span>
            case 'active':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">✅ Активен</span>
            default:
                return null
        }
    }

    const filteredProducts = products.filter(p => {
        if (filter === 'all') return p.status === 'moderation' || p.status === 'draft'
        return p.status === filter
    })

    if (loading) {
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
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка товаров...</p>
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
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Модерация товаров
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Управление товарами на модерации и доработке</p>
                </div>
            </div>

            {/* Фильтры */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex gap-3"
            >
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        filter === 'all' 
                            ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    Все ({products.filter(p => p.status === 'moderation' || p.status === 'draft').length})
                </button>
                <button
                    onClick={() => setFilter('moderation')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        filter === 'moderation' 
                            ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    На модерации ({products.filter(p => p.status === 'moderation').length})
                </button>
                <button
                    onClick={() => setFilter('draft')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        filter === 'draft' 
                            ? 'bg-gradient-to-r from-firm-orange to-firm-pink text-white shadow-md' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    На доработке ({products.filter(p => p.status === 'draft').length})
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
                            className="bg-white rounded-2xl shadow-xl p-12 text-center text-gray-500"
                        >
                            <p className="text-lg">Нет товаров для отображения</p>
                            <p className="text-sm mt-2">Все товары обработаны</p>
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
                                            className="w-32 h-32 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow-md hover:shadow-lg transition-all duration-300"
                                            onClick={() => openModal(product)}
                                        >
                                            {product.main_image_url ? (
                                                <img
                                                    src={product.main_image_url}
                                                    alt={product.title}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                                                    🧶
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <h3 
                                                        className="font-['Montserrat_Alternates'] font-semibold text-xl cursor-pointer hover:text-firm-orange transition-colors"
                                                        onClick={() => openModal(product)}
                                                    >
                                                        {product.title}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">👤 {product.master_name}</span>
                                                        <span className="flex items-center gap-1">📧 {product.master_email}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-['Montserrat_Alternates'] font-bold text-2xl text-firm-orange">
                                                        {product.price.toLocaleString()} ₽
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        📅 {new Date(product.created_at).toLocaleDateString('ru-RU')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Теги */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {product.category && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                                                        📁 {product.category}
                                                    </span>
                                                )}
                                                {product.technique && (
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                                                        🪡 {product.technique}
                                                    </span>
                                                )}
                                                {product.size && product.size !== 'Не применимо' && (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                                                        📏 {product.size}
                                                    </span>
                                                )}
                                                {getStatusBadge(product.status)}
                                            </div>

                                            {/* Описание */}
                                            <p className="text-gray-600 mt-3 line-clamp-2 text-sm">
                                                {product.description}
                                            </p>

                                            {/* Кнопки действий */}
                                            <div className="flex flex-wrap gap-3 mt-4">
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleApprove(product.id)}
                                                    disabled={actionLoading === product.id}
                                                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                >
                                                    {actionLoading === product.id ? '⏳' : '✅ Одобрить'}
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleReturnToDraft(product.id)}
                                                    disabled={actionLoading === product.id}
                                                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                >
                                                    {actionLoading === product.id ? '⏳' : '📝 На доработку'}
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleReject(product.id)}
                                                    disabled={actionLoading === product.id}
                                                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                                                >
                                                    {actionLoading === product.id ? '⏳' : '❌ Отклонить'}
                                                </motion.button>
                                            </div>
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
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">✕</button>
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
                                    {selectedProduct.images?.slice(0, 3).map((img) => (
                                        <div key={img.id} className="aspect-square bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-md">
                                            <img
                                                src={img.image_url}
                                                alt={selectedProduct.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-gray-500 text-sm mb-1">👤 Мастер</p>
                                            <p className="font-medium">{selectedProduct.master_name}</p>
                                            <p className="text-sm text-gray-500">{selectedProduct.master_email}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-gray-500 text-sm mb-1">💰 Цена</p>
                                            <p className="font-['Montserrat_Alternates'] font-bold text-2xl text-firm-orange">
                                                {selectedProduct.price.toLocaleString()} ₽
                                            </p>
                                        </div>
                                    </div>

                                    {selectedProduct.category && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-gray-500 text-sm mb-1">📁 Категория</p>
                                            <p>{selectedProduct.category}</p>
                                        </div>
                                    )}

                                    {selectedProduct.technique && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-gray-500 text-sm mb-1">🪡 Техника вязания</p>
                                            <p>{selectedProduct.technique}</p>
                                        </div>
                                    )}

                                    {selectedProduct.size && selectedProduct.size !== 'Не применимо' && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-gray-500 text-sm mb-1">📏 Размер</p>
                                            <p>{selectedProduct.size}</p>
                                        </div>
                                    )}

                                    {selectedProduct.description && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-gray-500 text-sm mb-1">📝 Описание</p>
                                            <p className="whitespace-pre-line text-gray-700">{selectedProduct.description}</p>
                                        </div>
                                    )}

                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <p className="text-gray-500 text-sm mb-1">📅 Дата создания</p>
                                        <p>{new Date(selectedProduct.created_at).toLocaleDateString('ru-RU', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleApprove(selectedProduct.id)}
                                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                                    >
                                        ✅ Одобрить
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleReturnToDraft(selectedProduct.id)}
                                        className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                                    >
                                        📝 На доработку
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleReject(selectedProduct.id)}
                                        className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
                                    >
                                        ❌ Отклонить
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}