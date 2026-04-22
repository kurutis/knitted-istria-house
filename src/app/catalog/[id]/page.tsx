'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

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

    if (error || !product) {
        return (
            <div className="mt-5 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error || 'Товар не найден'}</p>
                    <Link href="/catalog" className="px-6 py-3 bg-firm-orange text-white rounded-lg">
                        Вернуться в каталог
                    </Link>
                </div>
            </div>
        )
    }

    const displayImages = product.images?.length > 0 ? product.images : [{ id: 'placeholder', url: product.main_image_url, sort_order: 0 }]

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Хлебные крошки */}
            <div className="text-sm text-gray-500 mb-6">
                <Link href="/" className="hover:text-firm-orange">Главная</Link>
                <span className="mx-2">/</span>
                <Link href="/catalog" className="hover:text-firm-orange">Каталог</Link>
                <span className="mx-2">/</span>
                <span className="text-gray-700">{product.title}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Левая колонка - галерея */}
                <div>
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                        {displayImages[selectedImage]?.url ? (
                            <img
                                src={displayImages[selectedImage].url}
                                alt={product.title}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                                🧶
                            </div>
                        )}
                    </div>
                    {displayImages.length > 1 && (
                        <div className="grid grid-cols-5 gap-2 mt-4">
                            {displayImages.map((img, index) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedImage(index)}
                                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                                        selectedImage === index ? 'border-firm-orange' : 'border-transparent'
                                    }`}
                                >
                                    <img
                                        src={img.url}
                                        alt={`${product.title} - фото ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Правая колонка - информация и вкладки */}
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-bold text-3xl mb-2">{product.title}</h1>
                    
                    <div className="flex items-center gap-4 mb-4">
                        <Link href={`/masters/${product.master_id}`} className="flex items-center gap-2 hover:opacity-80">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                                {product.master_avatar ? (
                                    <img src={product.master_avatar} alt={product.master_name} className="w-full h-full object-cover" />
                                ) : (
                                    product.master_name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <span className="text-gray-600 hover:text-firm-orange">{product.master_name}</span>
                        </Link>
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            <span className="font-semibold">{product.rating || 'Нет оценок'}</span>
                            <span className="text-gray-400">({product.reviews_count || 0} отзывов)</span>
                        </div>
                    </div>

                    <div className="text-3xl font-bold text-firm-orange mb-6">
                        {product.price.toLocaleString()} ₽
                    </div>

                    {/* Выбор количества и кнопки */}
                    <div className="mb-6">
                        <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates']">Количество</label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => isInCart ? handleUpdateQuantity(quantity - 1) : setQuantity(quantity - 1)}
                                disabled={quantity <= 1 || updatingCart}
                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-firm-orange hover:text-white transition disabled:opacity-50"
                            >
                                -
                            </button>
                            <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                            <button
                                onClick={() => isInCart ? handleUpdateQuantity(quantity + 1) : setQuantity(quantity + 1)}
                                disabled={updatingCart}
                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-firm-orange hover:text-white transition disabled:opacity-50"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex gap-4 mb-8">
                        {isInCart ? (
                            <button
                                onClick={handleRemoveFromCart}
                                disabled={updatingCart}
                                className="flex-1 py-3 rounded-xl font-['Montserrat_Alternates'] font-semibold transition-all bg-red-500 text-white hover:bg-red-600"
                            >
                                {updatingCart ? '...' : 'Удалить из корзины'}
                            </button>
                        ) : (
                            <button
                                onClick={handleAddToCart}
                                disabled={updatingCart}
                                className="flex-1 py-3 rounded-xl font-['Montserrat_Alternates'] font-semibold transition-all bg-firm-orange text-white hover:bg-opacity-90"
                            >
                                {updatingCart ? '...' : 'В корзину'}
                            </button>
                        )}
                        <button
                            onClick={handleToggleFavorite}
                            className={`w-12 h-12 rounded-xl border-2 transition-all flex items-center justify-center ${
                                isFavorite
                                    ? 'border-firm-pink bg-firm-pink text-white'
                                    : 'border-gray-300 hover:border-firm-pink hover:bg-firm-pink hover:text-white'
                            }`}
                        >
                            <svg className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Вкладки */}
                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex gap-4 border-b">
                            <button
                                onClick={() => setActiveTab('specs')}
                                className={`pb-3 px-1 font-['Montserrat_Alternates'] transition-colors ${
                                    activeTab === 'specs'
                                        ? 'border-b-2 border-firm-orange text-firm-orange'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Характеристики
                            </button>
                            <button
                                onClick={() => setActiveTab('description')}
                                className={`pb-3 px-1 font-['Montserrat_Alternates'] transition-colors ${
                                    activeTab === 'description'
                                        ? 'border-b-2 border-firm-pink text-firm-pink'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Описание
                            </button>
                            {product.care_instructions && (
                                <button
                                    onClick={() => setActiveTab('care')}
                                    className={`pb-3 px-1 font-['Montserrat_Alternates'] transition-colors ${
                                        activeTab === 'care'
                                            ? 'border-b-2 border-firm-orange text-firm-orange'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    Уход
                                </button>
                            )}
                            <button
                                onClick={() => setActiveTab('reviews')}
                                className={`pb-3 px-1 font-['Montserrat_Alternates'] transition-colors ${
                                    activeTab === 'reviews'
                                        ? 'border-b-2 border-firm-pink text-firm-pink'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Отзывы ({product.reviews_count || 0})
                            </button>
                        </div>

                        <div className="py-4">
                            {/* Характеристики */}
                            {activeTab === 'specs' && (
                                <div className="space-y-3">
                                    {product.category && (
                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-32 text-gray-500">Категория:</span>
                                            <span className="flex-1 font-medium">{product.category}</span>
                                        </div>
                                    )}
                                    {product.technique && (
                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-32 text-gray-500">Техника вязания:</span>
                                            <span className="flex-1 font-medium">{product.technique}</span>
                                        </div>
                                    )}
                                    {product.size && (
                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-32 text-gray-500">Размер:</span>
                                            <span className="flex-1 font-medium">{product.size}</span>
                                        </div>
                                    )}
                                    {product.color && (
                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-32 text-gray-500">Цвет:</span>
                                            <span className="flex-1 font-medium">{product.color}</span>
                                        </div>
                                    )}
                                    <div className="flex py-2 border-b border-gray-100">
                                        <span className="w-32 text-gray-500">Просмотры:</span>
                                        <span className="flex-1 font-medium">{product.views}</span>
                                    </div>
                                    <div className="flex py-2">
                                        <span className="w-32 text-gray-500">Добавлен:</span>
                                        <span className="flex-1 font-medium">
                                            {new Date(product.created_at).toLocaleDateString('ru-RU')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Описание */}
                            {activeTab === 'description' && (
                                <div>
                                    <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
                                    
                                    {product.yarns && product.yarns.length > 0 && (
                                        <div className="mt-6">
                                            <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-3">Использованная пряжа</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {product.yarns.map((yarn) => (
                                                    <div key={yarn.id} className="bg-gray-50 rounded-lg p-3">
                                                        <p className="font-medium">{yarn.name}</p>
                                                        <p className="text-sm text-gray-500">{yarn.brand}</p>
                                                        <p className="text-sm">{yarn.color}</p>
                                                        <p className="text-xs text-gray-400">Арт. {yarn.article}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Уход */}
                            {activeTab === 'care' && product.care_instructions && (
                                <p className="text-gray-700">{product.care_instructions}</p>
                            )}

                            {/* Отзывы */}
                            {activeTab === 'reviews' && (
                                <div>
                                    {product.reviews && product.reviews.length > 0 ? (
                                        <div className="space-y-4">
                                            {product.reviews.map((review) => (
                                                <div key={review.id} className="border-b border-gray-200 pb-4">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold">
                                                            {review.author_name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold">{review.author_name}</p>
                                                            <div className="flex items-center gap-1">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                                                                        ★
                                                                    </span>
                                                                ))}
                                                                <span className="text-xs text-gray-400 ml-2">
                                                                    {new Date(review.created_at).toLocaleDateString('ru-RU')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-700">{review.comment}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                                            <p className="text-gray-500">Пока нет отзывов</p>
                                            {session && session.user?.role !== 'master' && (
                                                <button className="mt-3 text-firm-orange hover:underline">
                                                    Оставить отзыв
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}