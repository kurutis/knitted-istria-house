'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface ProductImage {
    id: string
    url: string
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
            const response = await fetch('/api/admin/products', {method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, action: 'approve' })})
            
            if (!response.ok) throw new Error('Failed to approve')
            
            await loadProducts()
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
            const response = await fetch('/api/admin/products', {method: 'PUT',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, action: 'reject', reason })})
            
            if (!response.ok) throw new Error('Failed to reject')
            
            await loadProducts()
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
            const response = await fetch('/api/admin/products', {method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, action: 'draft' })})
            
            if (!response.ok) throw new Error('Failed to return to draft')
            
            await loadProducts()
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка товаров...</p>
                </div>
            </div>
        )
    }

    const pendingProducts = products.filter(p => p.status === 'moderation')
    const draftProducts = products.filter(p => p.status === 'draft')

    return (
        <div className="space-y-8">
            <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl">Модерация товаров</h1>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-[#EAEAEA]">
                    <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">На модерации ({pendingProducts.length})</h2>
                </div>

                {pendingProducts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>Нет товаров на модерации</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {pendingProducts.map((product) => (
                            <div key={product.id} className="p-6 hover:bg-[#FAFAFA] transition-colors">
                                <div className="flex gap-6">
                                    <div className="w-32 h-32 bg-[#EAEAEA] rounded-lg overflow-hidden hrink-0 cursor-pointer"onClick={() => openModal(product)}>
                                        {product.main_image_url ? (<Image src={product.main_image_url} alt={product.title} width={160} height={160} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-gray-400">Нет фото</div>)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg cursor-pointer hover:text-firm-orange"onClick={() => openModal(product)}>{product.title}</h3>
                                                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                                    <span>Мастер: {product.master_name}</span>
                                                    <span>{product.master_email}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-['Montserrat_Alternates'] font-bold text-xl text-firm-orange">{product.price.toLocaleString()} ₽</p>
                                                <p className="text-sm text-gray-500">{new Date(product.created_at).toLocaleDateString('ru-RU')}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {product.category && ( <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">{product.category}</span>)}
                                            {product.technique && ( <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{product.technique}</span>)}
                                            {product.size && (<span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Размер: {product.size}</span>)}
                                        </div>

                                        <p className="text-gray-600 mt-3 line-clamp-2">{product.description}</p>

                                        <div className="flex gap-3 mt-4">
                                            <button onClick={() => handleApprove(product.id)} disabled={actionLoading === product.id} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50">{actionLoading === product.id ? 'Обработка...' : ' Одобрить'}</button>
                                            <button onClick={() => handleReturnToDraft(product.id)} disabled={actionLoading === product.id} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition disabled:opacity-50">На доработку</button>
                                            <button onClick={() => handleReject(product.id)}disabled={actionLoading === product.id}className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50">Отклонить</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {draftProducts.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-[#EAEAEA]">
                        <h2 className="font-['Montserrat_Alternates'] font-semibold text-xl">На доработке ({draftProducts.length})</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {draftProducts.map((product) => (
                            <div key={product.id} className="p-6 hover:bg-[#FAFAFA] transition-colors">
                                <div className="flex gap-6">
                                    <div className="w-32 h-32 bg-[#EAEAEA] rounded-lg overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => openModal(product)}>
                                        {product.main_image_url ? (<Image src={product.main_image_url} alt={product.title} className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center text-gray-400">Нет фото</div>)}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg cursor-pointer hover:text-firm-orange" onClick={() => openModal(product)}>{product.title}</h3>
                                                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                                    <span>Мастер: {product.master_name}</span>
                                                </div>
                                            </div>
                                            <p className="font-['Montserrat_Alternates'] font-bold text-xl text-firm-orange">{product.price.toLocaleString()} ₽</p>
                                        </div>

                                        <div className="mt-3">
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">На доработке</span>
                                        </div>

                                        <div className="flex gap-3 mt-4">
                                            <button onClick={() => handleApprove(product.id)} disabled={actionLoading === product.id} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50">{actionLoading === product.id ? 'Обработка...' : '✅ Одобрить'}</button>
                                            <button onClick={() => handleReject(product.id)} disabled={actionLoading === product.id} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50">Отклонить</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showModal && selectedProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl">{selectedProduct.title}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {selectedProduct.main_image_url && (
                                    <div className="aspect-square bg-[#EAEAEA] rounded-lg overflow-hidden">
                                        <Image src={selectedProduct.main_image_url} alt={selectedProduct.title} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                {selectedProduct.images?.map((img) => (
                                    <div key={img.id} className="aspect-square bg-[#EAEAEA] rounded-lg overflow-hidden">
                                        <Image src={img.url} alt={selectedProduct.title} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-gray-500 text-sm">Мастер</p>
                                    <p>{selectedProduct.master_name}</p>
                                    <p className="text-sm text-gray-500">{selectedProduct.master_email}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm">Цена</p>
                                    <p className="font-bold text-firm-orange text-xl">{selectedProduct.price.toLocaleString()} ₽</p>
                                </div>
                                {selectedProduct.category && (
                                    <div>
                                        <p className="text-gray-500 text-sm">Категория</p>
                                        <p>{selectedProduct.category}</p>
                                    </div>
                                )}
                                {selectedProduct.technique && (
                                    <div>
                                        <p className="text-gray-500 text-sm">Техника вязания</p>
                                        <p>{selectedProduct.technique}</p>
                                    </div>
                                )}
                                {selectedProduct.size && (
                                    <div>
                                        <p className="text-gray-500 text-sm">Размер</p>
                                        <p>{selectedProduct.size}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-gray-500 text-sm">Описание</p>
                                    <p className="whitespace-pre-line">{selectedProduct.description}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm">Дата создания</p>
                                    <p>{new Date(selectedProduct.created_at).toLocaleDateString('ru-RU')}</p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t">
                                <button onClick={() => {handleApprove(selectedProduct.id); setShowModal(false) }} className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">Одобрить</button>
                                <button onClick={() => {handleReturnToDraft(selectedProduct.id); setShowModal(false)}}className="flex-1 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition">На доработку</button>
                                <button onClick={() => {handleReject(selectedProduct.id); setShowModal(false)}} className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Отклонить</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}