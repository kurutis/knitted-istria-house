'use client'

import Link from "next/link"
import { motion } from "framer-motion"

interface Product {
    id: string
    title: string
    price: number
    main_image_url: string | null
    master_name?: string
    views: number
    created_at: string
    status: 'moderation' | 'active' | 'draft' | 'rejected' | 'blocked'
}

interface MasterProductsListProps {
    products: Product[]
    onDelete: (productId: string) => void
    masterName?: string
    loading?: boolean
}

const getStatusColor = (status: string) => {
    switch(status){
        case 'moderation': return 'bg-yellow-100 text-yellow-700'
        case 'active': return 'bg-green-100 text-green-700'
        case 'draft': return 'bg-gray-100 text-gray-700'
        case 'rejected': return 'bg-red-100 text-red-700'
        case 'blocked': return 'bg-red-100 text-red-700'
        default: return 'bg-gray-100 text-gray-700'
    }
}

const getStatusText = (status: string) => {
    switch(status){
        case 'moderation': return 'На модерации'
        case 'active': return 'Активен'
        case 'draft': return 'Черновик'
        case 'rejected': return 'Отклонен'
        case 'blocked': return 'Заблокирован'
        default: return status
    }
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

export default function MasterProductsList({ 
    products, 
    onDelete, 
    masterName,
    loading = false 
}: MasterProductsListProps) {
    
    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-firm-orange border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (products.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="text-gray-500 mb-4">У вас пока нет товаров</p>
                <Link 
                    href="/master/products/new" 
                    className="inline-block px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300"
                >
                    Добавить первый товар →
                </Link>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
            {products.map((product, index) => (
                <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group"
                >
                    {/* Изображение */}
                    <Link href={`/catalog/${product.id}`} className="block relative aspect-square bg-[#f5f5f5]">
                        {product.main_image_url ? (
                            <img
                                src={product.main_image_url}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-400 text-sm">Нет фото</span>
                            </div>
                        )}
                        
                        {/* Бейдж статуса */}
                        <div className="absolute top-3 left-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                                {getStatusText(product.status)}
                            </span>
                        </div>
                    </Link>

                    {/* Информация о товаре */}
                    <div className="p-4">
                        <Link href={`/catalog/${product.id}`}>
                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-base mb-0.5 line-clamp-1 hover:text-firm-orange transition">
                                {product.title}
                            </h3>
                        </Link>
                        <p className="text-xs text-gray-400 mb-2 line-clamp-1">
                            {product.master_name || masterName}
                        </p>
                        <div className="flex justify-between items-center">
                            <span className="font-['Montserrat_Alternates'] font-bold text-lg text-firm-orange">
                                {product.price.toLocaleString()} ₽
                            </span>
                            
                            <div className="flex gap-2">
                                <Link
                                    href={`/master/products/${product.id}/edit`}
                                    className="px-3 py-1.5 text-sm bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-lg hover:shadow-md transition-all duration-300"
                                >
                                    ✏️ Ред.
                                </Link>
                                <button
                                    onClick={() => onDelete(product.id)}
                                    className="px-3 py-1.5 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-md transition-all duration-300"
                                >
                                    🗑️ Удалить
                                </button>
                            </div>
                        </div>
                        
                        {/* Дополнительная информация */}
                        <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                            <span>👁️ {product.views || 0} просмотров</span>
                            <span>📅 {formatDate(product.created_at)}</span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    )
}