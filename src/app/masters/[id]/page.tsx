'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import ProductCard from '@/components/catalog/ProductCard'

interface Master {
    id: string
    name: string
    email: string
    phone: string
    city: string
    description: string
    avatar_url: string
    is_verified: boolean
    is_partner: boolean
    rating: number
    total_sales: number
    member_since: string
    pieces_created: number
    followers_count: number
    custom_orders_enabled: boolean
    is_following?: boolean
}

interface Product {
    id: string
    title: string
    price: number
    main_image_url: string
    created_at: string
    views: number
    master_name: string
    rating: number
    reviews_count: number
}

interface Review {
    id: string
    rating: number
    comment: string
    created_at: string
    author_name: string
    author_avatar: string
}

export default function MasterPage() {
    const { id } = useParams()
    const { data: session } = useSession()
    const [master, setMaster] = useState<Master | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [reviews, setReviews] = useState<Review[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products')
    const [showCustomModal, setShowCustomModal] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [customRequest, setCustomRequest] = useState({
        name: '',
        email: '',
        description: '',
        budget: ''
    })

    const isMaster = session?.user?.role === 'master'
    const currentMasterId = session?.user?.id

    useEffect(() => {
        if (id) {
            fetchMaster()
            fetchProducts()
            fetchReviews()
        }
    }, [id])

    useEffect(() => {
        if (id && session) {
            checkFollowStatus()
        }
    }, [id, session])

    const fetchMaster = async () => {
        try {
            const response = await fetch(`/api/masters/${id}`)
            const data = await response.json()
            setMaster(data)
        } catch (error) {
            console.error('Error fetching master:', error)
            toast.error('Ошибка загрузки профиля мастера')
        }
    }

    const fetchProducts = async () => {
        try {
            const response = await fetch(`/api/masters/${id}/products`)
            const data = await response.json()
            setProducts(data || [])
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    const fetchReviews = async () => {
        try {
            const response = await fetch(`/api/masters/${id}/reviews`)
            const data = await response.json()
            setReviews(data || [])
        } catch (error) {
            console.error('Error fetching reviews:', error)
        } finally {
            setLoading(false)
        }
    }

    const checkFollowStatus = async () => {
        try {
            const response = await fetch(`/api/masters/${id}/follow-status`)
            const data = await response.json()
            setIsFollowing(data.is_following)
            setMaster(prev => prev ? { ...prev, followers_count: data.followers_count } : prev)
        } catch (error) {
            console.error('Error checking follow status:', error)
        }
    }

    const handleFollow = async () => {
        if (!session) {
            window.location.href = `/auth/signin?callbackUrl=/masters/${id}`
            return
        }

        setFollowLoading(true)
        try {
            const method = isFollowing ? 'DELETE' : 'POST'
            const response = await fetch('/api/masters/follow', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterId: id })
            })

            if (response.ok) {
                const data = await response.json()
                setIsFollowing(data.is_following)
                setMaster(prev => prev ? { ...prev, followers_count: data.followers_count } : prev)
                toast.success(isFollowing ? 'Вы отписались от мастера' : 'Вы подписались на мастера')
            }
        } catch (error) {
            console.error('Error toggling follow:', error)
            toast.error('Ошибка при подписке')
        } finally {
            setFollowLoading(false)
        }
    }

    const handleCustomRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session) {
            window.location.href = `/auth/signin?callbackUrl=/masters/${id}`
            return
        }

        try {
            const response = await fetch('/api/custom-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterId: id, ...customRequest })
            })

            if (response.ok) {
                toast.success('Запрос отправлен! Мастер свяжется с вами в течение 48 часов.')
                setShowCustomModal(false)
                setCustomRequest({ name: '', email: '', description: '', budget: '' })
            } else {
                const error = await response.json()
                toast.error(error.error || 'Ошибка при отправке запроса')
            }
        } catch (error) {
            console.error('Error sending request:', error)
            toast.error('Ошибка при отправке запроса')
        }
    }

    if (loading || !master) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-firm-orange border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 font-['Montserrat_Alternates'] text-gray-600">Загрузка...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Профиль мастера */}
            <div className="flex flex-col md:flex-row gap-8 mb-12">
                {/* Аватар */}
                <div className="flex-shrink-0">
                    <div className="w-48 h-48 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden">
                        {master.avatar_url ? (
                            <img src={master.avatar_url} alt={master.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-6xl font-['Montserrat_Alternates'] font-bold text-white">
                                {master.name?.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Информация */}
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h1 className="font-['Montserrat_Alternates'] font-bold text-3xl">{master.name}</h1>
                        {master.is_verified && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
                                ✓ Верифицирован
                            </span>
                        )}
                        {master.is_partner && (
                            <span className="px-2 py-1 bg-firm-orange bg-opacity-10 text-firm-orange rounded-full text-xs flex items-center gap-1">
                                ⭐ Партнер фабрики
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            <span className="font-semibold">{master.rating}</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-600">{master.total_sales} продаж</span>
                        {master.city && (
                            <>
                                <span className="text-gray-300">|</span>
                                <span className="text-gray-600">📍 {master.city}</span>
                            </>
                        )}
                    </div>

                    <p className="text-gray-700 mb-6 leading-relaxed">
                        {master.description || 'Мастер пока не добавил описание.'}
                    </p>

                    <div className="flex gap-4">
                        {session && currentMasterId !== master.id && (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`px-6 py-2 rounded-lg transition ${
                                    isFollowing
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        : 'bg-firm-orange text-white hover:bg-opacity-90'
                                }`}
                            >
                                {followLoading ? '...' : (isFollowing ? 'Отписаться' : 'Подписаться')}
                            </button>
                        )}
                        {master.custom_orders_enabled && (
                            <button
                                onClick={() => setShowCustomModal(true)}
                                className="px-6 py-2 border-2 border-firm-pink text-firm-pink rounded-lg hover:bg-firm-pink hover:text-white transition"
                            >
                                Обсудить заказ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-4 gap-4 py-8 border-t border-b border-gray-200 mb-12">
                <div className="text-center">
                    <p className="text-2xl font-bold text-firm-orange">
                        {master.pieces_created || master.total_sales || products.length}
                    </p>
                    <p className="text-sm text-gray-500">Работ</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-firm-pink">
                        {master.followers_count || 0}
                    </p>
                    <p className="text-sm text-gray-500">Подписчиков</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-firm-orange">
                        {master.rating}
                    </p>
                    <p className="text-sm text-gray-500">Рейтинг</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-firm-pink">
                        {reviews.length}
                    </p>
                    <p className="text-sm text-gray-500">Отзывов</p>
                </div>
            </div>

            {/* Вкладки */}
            <div className="flex gap-6 mb-6">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`pb-3 px-1 font-['Montserrat_Alternates'] transition-colors ${
                        activeTab === 'products'
                            ? 'border-b-2 border-firm-orange text-firm-orange'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Работы мастера ({products.length})
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-3 px-1 font-['Montserrat_Alternates'] transition-colors ${
                        activeTab === 'reviews'
                            ? 'border-b-2 border-firm-pink text-firm-pink'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Отзывы ({reviews.length})
                </button>
            </div>

            {/* Работы мастера */}
            {activeTab === 'products' && (
                <>
                    {products.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">У мастера пока нет работ</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}
                    {products.length > 8 && (
                        <div className="text-center mt-8">
                            <Link href={`/catalog?master=${master.id}`} className="text-firm-orange hover:underline">
                                Все работы мастера →
                            </Link>
                        </div>
                    )}
                </>
            )}

            {/* Отзывы */}
            {activeTab === 'reviews' && (
                <>
                    {reviews.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">Пока нет отзывов</p>
                            {session && session.user?.role !== 'master' && (
                                <Link href={`/catalog?master=${master.id}`} className="mt-4 inline-block text-firm-orange hover:underline">
                                    Оставить отзыв после покупки
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-firm-orange to-firm-pink flex items-center justify-center text-white font-bold">
                                            {review.author_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold">{review.author_name}</span>
                                                <div className="flex items-center gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="text-gray-700">{review.comment}</p>
                                            <p className="text-xs text-gray-400 mt-2">
                                                {new Date(review.created_at).toLocaleDateString('ru-RU')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Модальное окно заказа */}
            {showCustomModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCustomModal(false)}>
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl">Индивидуальный заказ</h3>
                                <button onClick={() => setShowCustomModal(false)} className="text-gray-500 hover:text-gray-700">
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleCustomRequest} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Ваше имя *</label>
                                    <input
                                        type="text"
                                        required
                                        value={customRequest.name}
                                        onChange={(e) => setCustomRequest(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={customRequest.email}
                                        onChange={(e) => setCustomRequest(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Описание желаемого изделия *</label>
                                    <textarea
                                        rows={4}
                                        required
                                        value={customRequest.description}
                                        onChange={(e) => setCustomRequest(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-orange"
                                        placeholder="Опишите цвет, размер, технику..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-700 mb-1">Примерный бюджет (₽)</label>
                                    <input
                                        type="number"
                                        value={customRequest.budget}
                                        onChange={(e) => setCustomRequest(prev => ({ ...prev, budget: e.target.value }))}
                                        className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition"
                                >
                                    Отправить запрос
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}