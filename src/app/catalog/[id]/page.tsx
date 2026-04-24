'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'

interface Product {
    id: string
    title: string
    description: string
    price: number
    category: string
    technique: string
    size: string
    care_instructions: string
    color: string
    main_image_url: string
    images: Array<{ id: string; url: string; sort_order: number }>
    master_id: string
    master_name: string
    master_avatar: string
    master_city: string
    rating: number
    reviews_count: number
    reviews: Array<{
        id: string
        rating: number
        comment: string
        created_at: string
        author_name: string
        author_avatar: string
    }>
    yarns: Array<{
        id: string
        name: string
        article: string
        brand: string
        color: string
        composition: string
    }>
    views: number
    created_at: string
}

export default function ProductPage() {
    const { id } = useParams()
    const { data: session } = useSession()
    const [product, setProduct] = useState<Product | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [quantity, setQuantity] = useState(1)
    const [isInCart, setIsInCart] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const [selectedImage, setSelectedImage] = useState(0)
    const [activeTab, setActiveTab] = useState<'specs' | 'description' | 'care' | 'reviews'>('specs')
    const [updatingCart, setUpdatingCart] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [submittingReview, setSubmittingReview] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (id) {
            fetchProduct()
            if (session) {
                checkCartStatus()
                checkFavoriteStatus()
            }
        }
    }, [id, session])

    const fetchProduct = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/catalog/products/${id}`)
            if (!response.ok) throw new Error('Товар не найден')
            const data = await response.json()
            setProduct(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const checkCartStatus = async () => {
        try {
            const response = await fetch('/api/cart')
            const data = await response.json()
            const cartItem = data.items?.find((item: any) => item.product_id === id)
            if (cartItem) {
                setIsInCart(true)
                setQuantity(cartItem.quantity)
            }
        } catch (error) {
            console.error('Error checking cart status:', error)
        }
    }

    const checkFavoriteStatus = async () => {
        try {
            const response = await fetch('/api/user/favorites')
            const data = await response.json()
            const isFav = data.some((item: any) => item.id === id)
            setIsFavorite(!!isFav)
        } catch (error) {
            console.error('Error checking favorite status:', error)
        }
    }

    const handleAddToCart = async () => {
        if (!session) {
            window.location.href = `/auth/signin?callbackUrl=/catalog/${id}`
            return
        }

        setUpdatingCart(true)
        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: id, quantity })
            })
            if (response.ok) {
                setIsInCart(true)
            }
        } catch (error) {
            console.error('Error adding to cart:', error)
        } finally {
            setUpdatingCart(false)
        }
    }

    const handleRemoveFromCart = async () => {
        setUpdatingCart(true)
        try {
            const response = await fetch(`/api/cart?productId=${id}`, {
                method: 'DELETE'
            })
            if (response.ok) {
                setIsInCart(false)
                setQuantity(1)
            }
        } catch (error) {
            console.error('Error removing from cart:', error)
        } finally {
            setUpdatingCart(false)
        }
    }

    const handleUpdateQuantity = async (newQuantity: number) => {
        if (newQuantity < 1) return
        
        setQuantity(newQuantity)
        setUpdatingCart(true)
        try {
            await fetch(`/api/cart/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: newQuantity })
            })
        } catch (error) {
            console.error('Error updating quantity:', error)
        } finally {
            setUpdatingCart(false)
        }
    }

    const handleToggleFavorite = async () => {
        if (!session) {
            window.location.href = `/auth/signin?callbackUrl=/catalog/${id}`
            return
        }

        try {
            const method = isFavorite ? 'DELETE' : 'POST'
            const url = isFavorite
                ? `/api/user/favorites?productId=${id}`
                : '/api/user/favorites'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: isFavorite ? undefined : JSON.stringify({ productId: id })
            })

            if (response.ok) {
                setIsFavorite(!isFavorite)
            }
        } catch (error) {
            console.error('Error toggling favorite:', error)
        }
    }

    const handleSubmitReview = async () => {
        if (!session) return
        
        setSubmittingReview(true)
        try {
            const response = await fetch(`/api/catalog/products/${id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
            })
            
            if (response.ok) {
                await fetchProduct()
                setShowReviewModal(false)
                setReviewRating(5)
                setReviewComment('')
                setActiveTab('reviews')
            }
        } catch (error) {
            console.error('Error submitting review:', error)
        } finally {
            setSubmittingReview(false)
        }
    }

    if (loading) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <motion.div 
                        className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка...</p>
                </div>
            </div>
        )
    }

    if (error || !product) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh] px-4">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error || 'Товар не найден'}</p>
                    <Link href="/catalog" className="px-6 py-3 bg-firm-orange text-white rounded-lg inline-block">
                        Вернуться в каталог
                    </Link>
                </div>
            </div>
        )
    }

    const displayImages = product.images?.length > 0 ? product.images : [{ id: 'placeholder', url: product.main_image_url, sort_order: 0 }]

    return (
        <motion.div 
            className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Хлебные крошки */}
            <div className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap pb-2">
                <Link href="/" className="hover:text-firm-orange">Главная</Link>
                <span className="mx-2">/</span>
                <Link href="/catalog" className="hover:text-firm-orange">Каталог</Link>
                <span className="mx-2">/</span>
                <span className="text-gray-700">{product.title}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {/* Левая колонка - галерея */}
                <motion.div
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                        <img
                            src={displayImages[selectedImage]?.url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {displayImages.length > 1 && (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-4">
                            {displayImages.map((img, index) => (
                                <motion.button
                                    key={img.id}
                                    onClick={() => setSelectedImage(index)}
                                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                                        selectedImage === index ? 'border-firm-orange' : 'border-transparent'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <img
                                        src={img.url}
                                        alt={`${product.title} - фото ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </motion.button>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Правая колонка - информация */}
                <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <h1 className="font-['Montserrat_Alternates'] font-bold text-xl sm:text-2xl md:text-3xl mb-2">
                        {product.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
                        <Link href={`/masters/${product.master_id}`} className="flex items-center gap-2 hover:opacity-80">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-xs sm:text-sm font-bold overflow-hidden">
                                {product.master_avatar ? (
                                    <img src={product.master_avatar} alt={product.master_name} className="w-full h-full object-cover" />
                                ) : (
                                    product.master_name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <span className="text-xs sm:text-sm text-gray-600 hover:text-firm-orange">{product.master_name}</span>
                        </Link>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-400 text-sm sm:text-base">★</span>
                            <span className="font-semibold text-sm sm:text-base">{product.rating || 'Нет оценок'}</span>
                            <span className="text-gray-400 text-xs sm:text-sm">({product.reviews_count || 0} отзывов)</span>
                        </div>
                    </div>

                    <div className="text-2xl sm:text-3xl font-bold text-firm-orange mb-4 sm:mb-6">
                        {product.price.toLocaleString()} ₽
                    </div>

                    {/* Выбор количества */}
                    <div className="mb-4 sm:mb-6">
                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] text-sm sm:text-base">Количество</label>
                        <div className="flex items-center gap-3">
                            <motion.button
                                onClick={() => isInCart ? handleUpdateQuantity(quantity - 1) : setQuantity(quantity - 1)}
                                disabled={quantity <= 1 || updatingCart}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-firm-orange hover:text-white transition disabled:opacity-50 flex items-center justify-center"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                -
                            </motion.button>
                            <span className="w-10 sm:w-12 text-center text-base sm:text-lg font-medium">{quantity}</span>
                            <motion.button
                                onClick={() => isInCart ? handleUpdateQuantity(quantity + 1) : setQuantity(quantity + 1)}
                                disabled={updatingCart}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-firm-orange hover:text-white transition disabled:opacity-50 flex items-center justify-center"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                +
                            </motion.button>
                        </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
                        {isInCart ? (
                            <motion.button
                                onClick={handleRemoveFromCart}
                                disabled={updatingCart}
                                className="flex-1 py-3 rounded-xl font-['Montserrat_Alternates'] font-semibold transition-all bg-red-500 text-white hover:bg-red-600"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {updatingCart ? '...' : 'Удалить из корзины'}
                            </motion.button>
                        ) : (
                            <motion.button
                                onClick={handleAddToCart}
                                disabled={updatingCart}
                                className="flex-1 py-3 rounded-xl font-['Montserrat_Alternates'] font-semibold transition-all bg-firm-orange text-white hover:bg-opacity-90"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {updatingCart ? '...' : 'В корзину'}
                            </motion.button>
                        )}
                        <motion.button
                            onClick={handleToggleFavorite}
                            className={`w-12 h-12 rounded-xl border-2 transition-all flex items-center justify-center ${
                                isFavorite
                                    ? 'border-firm-pink bg-firm-pink text-white'
                                    : 'border-gray-300 hover:border-firm-pink hover:bg-firm-pink hover:text-white'
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </motion.button>
                    </div>

                    {/* Вкладки */}
                    <div className="border-t border-gray-200 pt-4">
                        <div className="overflow-x-auto pb-2">
                            <div className="flex gap-2 sm:gap-4 min-w-max">
                                {[
                                    { id: 'specs', label: 'Характеристики', color: 'firm-orange' },
                                    { id: 'description', label: 'Описание', color: 'firm-pink' },
                                    product.care_instructions && { id: 'care', label: 'Уход', color: 'firm-orange' },
                                    { id: 'reviews', label: `Отзывы (${product.reviews_count || 0})`, color: 'firm-pink' }
                                ].filter(Boolean).map((tab: any) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`pb-2 sm:pb-3 px-1 sm:px-2 font-['Montserrat_Alternates'] text-sm sm:text-base transition-colors whitespace-nowrap ${
                                            activeTab === tab.id
                                                ? `border-b-2 border-${tab.color} text-${tab.color}`
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="py-3 sm:py-4">
                            <AnimatePresence mode="wait">
                                {/* Характеристики */}
                                {activeTab === 'specs' && (
                                    <motion.div
                                        key="specs"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-2 sm:space-y-3"
                                    >
                                        {product.category && (
                                            <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
                                                <span className="w-full sm:w-32 text-gray-500 text-sm">Категория:</span>
                                                <span className="flex-1 font-medium text-sm sm:text-base mt-1 sm:mt-0">{product.category}</span>
                                            </div>
                                        )}
                                        {product.technique && (
                                            <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
                                                <span className="w-full sm:w-32 text-gray-500 text-sm">Техника вязания:</span>
                                                <span className="flex-1 font-medium text-sm sm:text-base mt-1 sm:mt-0">{product.technique}</span>
                                            </div>
                                        )}
                                        {product.size && (
                                            <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
                                                <span className="w-full sm:w-32 text-gray-500 text-sm">Размер:</span>
                                                <span className="flex-1 font-medium text-sm sm:text-base mt-1 sm:mt-0">{product.size}</span>
                                            </div>
                                        )}
                                        {product.color && (
                                            <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
                                                <span className="w-full sm:w-32 text-gray-500 text-sm">Цвет:</span>
                                                <span className="flex-1 font-medium text-sm sm:text-base mt-1 sm:mt-0">
                                                    <span className="inline-block w-4 h-4 rounded-full mr-2" style={{ backgroundColor: product.color.toLowerCase() }} />
                                                    {product.color}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex flex-col sm:flex-row py-2 border-b border-gray-100">
                                            <span className="w-full sm:w-32 text-gray-500 text-sm">Просмотры:</span>
                                            <span className="flex-1 font-medium text-sm sm:text-base mt-1 sm:mt-0">{product.views}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row py-2">
                                            <span className="w-full sm:w-32 text-gray-500 text-sm">Добавлен:</span>
                                            <span className="flex-1 font-medium text-sm sm:text-base mt-1 sm:mt-0">
                                                {new Date(product.created_at).toLocaleDateString('ru-RU')}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Описание */}
                                {activeTab === 'description' && (
                                    <motion.div
                                        key="description"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <p className="text-gray-700 whitespace-pre-line text-sm sm:text-base">{product.description}</p>
                                        
                                        {product.yarns && product.yarns.length > 0 && (
                                            <div className="mt-6">
                                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-base sm:text-lg mb-3">Использованная пряжа</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {product.yarns.map((yarn) => (
                                                        <div key={yarn.id} className="bg-gray-50 rounded-lg p-3">
                                                            <p className="font-medium text-sm sm:text-base">{yarn.name}</p>
                                                            <p className="text-xs sm:text-sm text-gray-500">{yarn.brand}</p>
                                                            <p className="text-xs sm:text-sm">{yarn.color}</p>
                                                            <p className="text-xs text-gray-400">Арт. {yarn.article}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Уход */}
                                {activeTab === 'care' && product.care_instructions && (
                                    <motion.div
                                        key="care"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <p className="text-gray-700 text-sm sm:text-base">{product.care_instructions}</p>
                                    </motion.div>
                                )}

                                {/* Отзывы */}
                                {activeTab === 'reviews' && (
                                    <motion.div
                                        key="reviews"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {session && session.user?.role !== 'master' && (
                                            <motion.button
                                                onClick={() => setShowReviewModal(true)}
                                                className="mb-4 px-4 py-2 bg-firm-orange text-white rounded-lg text-sm hover:bg-opacity-90 transition"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                Написать отзыв
                                            </motion.button>
                                        )}
                                        
                                        {product.reviews && product.reviews.length > 0 ? (
                                            <div className="space-y-4">
                                                {product.reviews.map((review, idx) => (
                                                    <motion.div 
                                                        key={review.id} 
                                                        className="border-b border-gray-200 pb-4"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                    >
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold text-sm">
                                                                {review.author_name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-sm sm:text-base">{review.author_name}</p>
                                                                <div className="flex items-center gap-1">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <span key={i} className={i < review.rating ? 'text-yellow-400 text-xs sm:text-sm' : 'text-gray-300 text-xs sm:text-sm'}>
                                                                            ★
                                                                        </span>
                                                                    ))}
                                                                    <span className="text-xs text-gray-400 ml-2">
                                                                        {new Date(review.created_at).toLocaleDateString('ru-RU')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-gray-700 text-sm sm:text-base">{review.comment}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                                                <p className="text-gray-500 text-sm">Пока нет отзывов</p>
                                                {session && session.user?.role !== 'master' && (
                                                    <button 
                                                        onClick={() => setShowReviewModal(true)}
                                                        className="mt-3 text-firm-orange hover:underline text-sm"
                                                    >
                                                        Будьте первым, кто оставит отзыв
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Модальное окно добавления отзыва */}
            <AnimatePresence>
                {showReviewModal && (
                    <motion.div 
                        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowReviewModal(false)}
                    >
                        <motion.div 
                            className="bg-white rounded-xl max-w-md w-full p-6"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl mb-4">Написать отзыв</h3>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] text-sm">Оценка</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setReviewRating(star)}
                                            className="text-2xl focus:outline-none"
                                        >
                                            <span className={star <= reviewRating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates'] text-sm">Комментарий</label>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 rounded-lg bg-[#f1f1f1] outline-firm-orange text-sm"
                                    placeholder="Поделитесь впечатлениями о товаре..."
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSubmitReview}
                                    disabled={submittingReview || !reviewComment.trim()}
                                    className="flex-1 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
                                >
                                    {submittingReview ? 'Отправка...' : 'Отправить'}
                                </button>
                                <button
                                    onClick={() => setShowReviewModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                                >
                                    Отмена
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}