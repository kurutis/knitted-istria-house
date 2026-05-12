'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

interface FavoriteProduct {
    id: string
    title: string
    price: number
    main_image_url: string
    master_name: string
    master_id?: string
    description?: string
    in_stock?: boolean
    added_at?: string
}

export default function FavoritesPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [favorites, setFavorites] = useState<FavoriteProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [removingId, setRemovingId] = useState<string | null>(null)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin?callbackUrl=/favorites')
            return
        }
        
        if (session?.user) {
            fetchFavorites()
        }
    }, [session, status, router])

    const fetchFavorites = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/user/favorites')
            if (!response.ok) throw new Error('Failed to load favorites')
            
            const data = await response.json()
            
            console.log('Favorites API response:', data) // Для отладки
            
            // API возвращает { success, favorites, pagination, stats }
            if (data && data.success && Array.isArray(data.favorites)) {
                setFavorites(data.favorites)
            } else if (Array.isArray(data)) {
                // Если вдруг вернулся массив
                setFavorites(data)
            } else {
                setFavorites([])
            }
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error)
            setFavorites([])
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveFromFavorites = async (productId: string) => {
        if (!productId) return
        
        setRemovingId(productId)
        try {
            const response = await fetch(`/api/user/favorites?productId=${productId}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                setFavorites(prev => prev.filter(item => item.id !== productId))
            } else {
                const error = await response.json()
                alert(error.error || 'Ошибка при удалении из избранного')
            }
        } catch (error) {
            console.error('Error removing from favorites:', error)
            alert('Ошибка при удалении из избранного')
        } finally {
            setRemovingId(null)
        }
    }

    const formatPrice = (price: number | string | undefined) => {
        if (price === undefined || price === null) return '0'
        const numPrice = typeof price === 'string' ? parseFloat(price) : price
        if (isNaN(numPrice)) return '0'
        return new Intl.NumberFormat('ru-RU').format(numPrice)
    }

    if (loading) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-5 flex items-start justify-center px-4">
            <div className="flex flex-col gap-5 w-full max-w-7xl">
                {/* Header */}
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl bg-gradient-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">
                        Избранное
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm sm:text-base">
                        {favorites.length} {favorites.length === 1 ? 'товар' : favorites.length > 1 && favorites.length < 5 ? 'товара' : 'товаров'}
                    </p>
                </div>

                {!favorites || favorites.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-xl p-12 text-center"
                    >
                        <div className="text-6xl mb-4">❤️</div>
                        <p className="text-gray-500 mb-4 font-['Montserrat_Alternates'] text-lg">
                            В избранном пока нет товаров
                        </p>
                        <p className="text-gray-400 mb-6 text-sm">
                            Добавляйте товары в избранное, чтобы не потерять понравившиеся
                        </p>
                        <Link 
                            href="/catalog" 
                            className="inline-block px-6 py-3 bg-gradient-to-r from-firm-orange to-firm-pink text-white rounded-xl hover:shadow-lg transition-all duration-300 font-['Montserrat_Alternates']"
                        >
                            🛍️ Перейти в каталог
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                        {favorites.map((product, index) => (
                            <motion.div
                                key={product.id || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                whileHover={{ y: -5 }}
                                className="group"
                            >
                                <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
                                    {/* Image */}
                                    <Link href={`/catalog/${product.id}`} className="block relative aspect-square overflow-hidden bg-gray-100">
                                        {product.main_image_url ? (
                                            <img
                                                src={product.main_image_url}
                                                alt={product.title || 'Товар'}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none'
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                        
                                        {/* Remove button */}
                                        <button
                                            onClick={() => handleRemoveFromFavorites(product.id)}
                                            disabled={removingId === product.id}
                                            className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                        >
                                            {removingId === product.id ? (
                                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            )}
                                        </button>
                                    </Link>
                                    
                                    {/* Content */}
                                    <div className="p-3 sm:p-4">
                                        <Link href={`/catalog/${product.id}`}>
                                            <h3 className="font-['Montserrat_Alternates'] font-medium text-sm sm:text-base line-clamp-2 hover:text-firm-orange transition-colors">
                                                {product.title || 'Без названия'}
                                            </h3>
                                        </Link>
                                        
                                        {product.master_name && (
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                                                от {product.master_name}
                                            </p>
                                        )}
                                        
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="font-['Montserrat_Alternates'] font-bold text-firm-pink text-base sm:text-lg">
                                                {formatPrice(product.price)} ₽
                                            </span>
                                            
                                            <Link href={`/catalog/${product.id}`}>
                                                <button className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-firm-orange hover:text-white transition-all duration-300">
                                                    Подробнее
                                                </button>
                                            </Link>
                                        </div>
                                        
                                        {product.in_stock === false && (
                                            <span className="inline-block mt-2 text-xs text-red-500">
                                                Нет в наличии
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}