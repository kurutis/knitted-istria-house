'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import ProductCard from '@/components/catalog/ProductCard'

// Импорт иконок из библиотеки
import { LocateIcon } from '@/components/icons/LocateIcon'
import { StarIcon } from '@/components/icons/StarIcon'
import { LikeIcon } from '@/components/icons/LikeIcon'
import { CartIcon } from '@/components/icons/CartIcon'
import { Productslcon } from '@/components/icons/Productslcon'
import { CloseIcon } from '@/components/icons/CloseIcon'
import { SendIcon } from '@/components/icons/SendIcon'
import { CheckCircleIcon } from '@/components/icons/CheckCircleIcon'

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
const StarRating = ({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = { sm: "text-xs", md: "text-sm", lg: "text-base" }
    return (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (<span key={i} className={i < Math.floor(rating) ? "text-yellow-400" : "text-gray-300"}></span>))}
            <span className={`ml-1 font-semibold ${sizeClasses[size]} text-text`}>{rating.toFixed(1)}</span>
        </div>
    )
}

const FollowButton = ({ isFollowing, onClick, loading }: { isFollowing: boolean; onClick: () => void; loading: boolean }) => (<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick} disabled={loading} className={`px-5 sm:px-6 py-2 rounded-xl transition-all duration-300 flex items-center gap-2 ${isFollowing  ? 'bg-gray-100 text-firm-pink hover:bg-gray-200 border border-gray-200' : 'bg-linear-to-r from-firm-orange to-firm-pink text-main hover:shadow-lg'}`} ><LikeIcon color={isFollowing ? "#D97C8E" : "#f9f9f9"} className="w-4 h-4" /><span className={`text-sm ${isFollowing ? 'text-firm-pink' : 'text-main'}`}>{loading ? '...' : (isFollowing ? 'Отписаться' : 'Подписаться')}</span> </motion.button>)

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
    const [isMobile, setIsMobile] = useState(false)
    const [customRequest, setCustomRequest] = useState({ name: '', email: '', description: '', budget: ''})

    const isMaster = session?.user?.role === 'master'
    const currentMasterId = session?.user?.id

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        if (id) {
            fetchMaster()
            fetchProducts()
            fetchReviews()
        }
    }, [id])

    useEffect(() => {if (id && session) {checkFollowStatus()}}, [id, session])

    const fetchMaster = async () => {
        try {
            const response = await fetch(`/api/masters/${id}`)
            const data = await response.json()
            
            let masterData
            if (data.success && data.data) {
                masterData = data.data
            } else if (data.data) {
                masterData = data.data
            } else {
                masterData = data
            }
            
            const formattedMaster: Master = {id: masterData.id, name: masterData.name || masterData.full_name || 'Мастер', email: masterData.email || '', phone: masterData.phone || '', city: masterData.city || '', description: masterData.description || '', avatar_url: masterData.avatar_url || masterData.avatar || '', is_verified: masterData.is_verified || false, is_partner: masterData.is_partner || false, rating: masterData.rating || 0, total_sales: masterData.total_sales || 0, member_since: masterData.member_since || masterData.created_at, pieces_created: masterData.pieces_created || masterData.products_count || 0, followers_count: masterData.followers_count || 0, custom_orders_enabled: masterData.custom_orders_enabled || false, is_following: masterData.is_following || false }
            
            setMaster(formattedMaster)
            setIsFollowing(formattedMaster.is_following || false)
        } catch (error) {
            console.error('Error fetching master:', error)
            toast.error('Ошибка загрузки профиля мастера')
        }
    }

    const fetchProducts = async () => {
        try {
            const response = await fetch(`/api/masters/${id}/products`)
            const data = await response.json()
            
            let productsList: Product[] = []
            if (data.success && data.products) {
                productsList = data.products
            } else if (data.products) {
                productsList = data.products
            } else if (Array.isArray(data)) {
                productsList = data
            }
            
            setProducts(productsList)
        } catch (error) {
            console.error('Error fetching products:', error)
        }
    }

    const fetchReviews = async () => {
        try {
            const response = await fetch(`/api/masters/${id}/reviews`)
            const data = await response.json()
            
            let reviewsList: Review[] = []
            if (data.success && data.reviews) {
                reviewsList = data.reviews
            } else if (data.reviews) {
                reviewsList = data.reviews
            } else if (Array.isArray(data)) {
                reviewsList = data
            }
            
            setReviews(reviewsList)
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
            
            if (data.success) {
                setIsFollowing(data.is_following || false)
                setMaster(prev => prev ? { ...prev, followers_count: data.followers_count || 0 } : prev)
            }
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
            const response = await fetch('/api/masters/follow', {method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ masterId: id })})

            if (response.ok) {
                const data = await response.json()
                setIsFollowing(data.is_following)
                setMaster(prev => prev ? { ...prev, followers_count: data.followers_count } : prev)
                toast.success(isFollowing ? 'Вы отписались от мастера' : 'Вы подписались на мастера')
                
                setTimeout(() => {checkFollowStatus()}, 1000)
            } else {
                const error = await response.json()
                toast.error(error.error || 'Ошибка при подписке')
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
            const response = await fetch('/api/custom-requests', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ masterId: id, ...customRequest })})

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

    const fadeInUp = {initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }}

    const staggerContainer = {animate: { transition: { staggerChildren: 0.1 } }}

    if (loading || !master) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto" />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray">Загрузка профиля...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="text-xs sm:text-sm text-firm-gray mb-6">
                    <Link href="/" className="hover:text-firm-orange transition-colors">Главная</Link>
                    <span className="mx-2">/</span>
                    <Link href="/catalog" className="hover:text-firm-orange transition-colors">Мастера</Link>
                    <span className="mx-2">/</span>
                    <span className="text-text truncate">{master.name}</span>
                </div>

                <div className="flex flex-col md:flex-row gap-6 sm:gap-8 mb-10 sm:mb-12">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="shrink-0 self-center md:self-start">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center overflow-hidden shadow-lg ring-4 ring-white">
                            {master.avatar_url ? (
                                <img src={master.avatar_url} alt={master.name} className="w-full h-full object-cover" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} />
                            ) : (
                                <span className="text-4xl sm:text-5xl md:text-6xl font-['Montserrat_Alternates'] font-bold text-main">{master.name?.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                    </motion.div>

                    {/* Информация */}
                    <motion.div 
                        variants={staggerContainer}
                        initial="initial"
                        animate="animate"
                        className="flex-1 text-center md:text-left"
                    >
                        <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                            <h1 className="font-['Montserrat_Alternates'] font-bold text-2xl sm:text-3xl text-text"> {master.name}</h1>
                            {master.is_verified && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-firm-green rounded-full text-xs"><CheckCircleIcon className="w-3 h-3" color="#94D06C" />Верифицирован</span>)}
                            {master.is_partner && (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-firm-orange/10 text-firm-orange rounded-full text-xs"><StarIcon className="w-3 h-3" color="#F4A67F" />Партнер фабрики</span>)}
                        </motion.div>

                        <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                            <StarRating rating={master.rating} size="md" />
                            <span className="text-gray-300">|</span>
                            <div className="flex items-center gap-1 text-firm-gray text-sm">
                                <CartIcon className="w-4 h-4" color="#737682" />
                                <span>{master.total_sales} продаж</span>
                            </div>
                            {master.city && (
                                <>
                                    <span className="text-gray-300">|</span>
                                    <div className="flex items-center gap-1 text-firm-gray text-sm">
                                        <LocateIcon className="w-4 h-4" color="#737682" />
                                        <span>{master.city}</span>
                                    </div>
                                </>
                            )}
                        </motion.div>

                        <motion.p variants={fadeInUp} className="text-firm-gray text-sm sm:text-base mb-6 leading-relaxed">{master.description || 'Мастер пока не добавил описание.'}</motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-wrap justify-center md:justify-start gap-3">
                            {session && currentMasterId !== master.id && (<FollowButton isFollowing={isFollowing} onClick={handleFollow} loading={followLoading} />)}
                            {master.custom_orders_enabled && (<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCustomModal(true)} className="px-5 sm:px-6 py-2 border-2 border-firm-pink text-firm-pink rounded-xl hover:bg-firm-pink hover:text-main transition-all duration-300 flex items-center gap-2"><Productslcon className="w-4 h-4" color="currentColor" /><span className="text-sm">Обсудить заказ</span></motion.button> )}
                        </motion.div>
                    </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-6 sm:py-8 border-t border-b border-gray-100 mb-8 sm:mb-12" >
                    {[{ label: "Работ", value: master.pieces_created || master.total_sales || products.length, color: "#F4A67F", icon: <Productslcon className="w-5 h-5" color="#F4A67F" /> }, { label: "Подписчиков", value: master.followers_count || 0, color: "#D97C8E", icon: <LikeIcon className="w-5 h-5" color="#D97C8E" /> }, { label: "Рейтинг", value: master.rating, color: "#F4A67F", icon: <StarIcon className="w-5 h-5" color="#F4A67F" /> }, { label: "Отзывов", value: reviews.length, color: "#D97C8E", icon: <CartIcon className="w-5 h-5" color="#D97C8E" /> }].map((stat, idx) => (
                        <motion.div key={stat.label} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 + idx * 0.1 }} className="text-center p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-300">
                            <div className="flex justify-center mb-2">{stat.icon}</div>
                            <p className="text-2xl sm:text-3xl font-bold" style={{ color: stat.color }}>{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p><p className="text-xs sm:text-sm text-firm-gray mt-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="flex gap-4 sm:gap-6 mb-6 border-b border-gray-100">
                    <button onClick={() => setActiveTab('products')} className={`pb-3 px-1 font-['Montserrat_Alternates'] text-sm sm:text-base transition-all duration-300 relative ${activeTab === 'products' ? 'text-firm-orange' : 'text-firm-gray hover:text-text'}`}>Работы мастера ({products.length}){activeTab === 'products' && (<motion.div layoutId="tabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-firm-orange to-firm-pink rounded-full" />)}</button>
                    <button onClick={() => setActiveTab('reviews')} className={`pb-3 px-1 font-['Montserrat_Alternates'] text-sm sm:text-base transition-all duration-300 relative ${activeTab === 'reviews' ? 'text-firm-pink' : 'text-firm-gray hover:text-text'}`}>Отзывы ({reviews.length}){activeTab === 'reviews' && (<motion.div layoutId="tabIndicator"  className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-firm-pink to-firm-orange rounded-full" />)}</button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'products' && (
                        <motion.div key="products" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                            {products.length === 0 ? (
                                <div className="text-center py-12 sm:py-16 bg-gray-50 rounded-xl">
                                    <Productslcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p className="text-firm-gray">У мастера пока нет работ</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                                        {products.slice(0, 8).map((product, idx) => (
                                            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                                                <ProductCard product={product} />
                                            </motion.div>
                                        ))}
                                    </div>
                                    {products.length > 8 && (
                                        <div className="text-center mt-8">
                                            <Link href={`/catalog?master=${master.id}`} className="inline-flex items-center gap-2 text-firm-orange hover:text-firm-pink text-sm font-medium transition-colors duration-300"><span>Все работы мастера</span><span>→</span></Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'reviews' && (
                        <motion.div key="reviews" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                            {reviews.length === 0 ? (
                                <div className="text-center py-12 sm:py-16 bg-gray-50 rounded-xl">
                                    <StarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p className="text-firm-gray">Пока нет отзывов</p>
                                    {session && session.user?.role !== 'master' && ( <Link href={`/catalog?master=${master.id}`} className="mt-4 inline-block text-firm-orange hover:underline text-sm">Оставить отзыв после покупки</Link>)}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reviews.map((review, idx) => (
                                        <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-main rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-linear-to-r from-firm-orange to-firm-pink flex items-center justify-center text-main font-bold text-sm sm:text-base shrink-0">
                                                    {review.author_avatar ? (<img src={review.author_avatar} alt={review.author_name} className="w-full h-full object-cover rounded-full" />) : (review.author_name?.charAt(0).toUpperCase())}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className="font-semibold text-sm sm:text-base text-text">{review.author_name}</span>
                                                        <div className="flex items-center gap-0.5">
                                                            {[...Array(5)].map((_, i) => (<span key={i} className={i < review.rating ? 'text-yellow-400 text-xs sm:text-sm' : 'text-gray-300 text-xs sm:text-sm'}>★</span>))}
                                                        </div>
                                                    </div>
                                                    <p className="text-firm-gray text-sm sm:text-base leading-relaxed">{review.comment}</p>
                                                    <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showCustomModal && (
                    <div className="fixed inset-0 bg-main-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCustomModal(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}  exit={{ opacity: 0, scale: 0.95 }}  className="bg-main rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-5 sm:p-6">
                                <div className="flex justify-between items-center mb-5">
                                    <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl text-text">Индивидуальный заказ</h3>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setShowCustomModal(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><CloseIcon className="w-5 h-5" color="#737682" /> </motion.button>
                                </div>
                                <form onSubmit={handleCustomRequest} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-text mb-1.5 font-medium">Ваше имя *</label>
                                        <input type="text" required value={customRequest.name} onChange={(e) => setCustomRequest(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm" placeholder="Введите ваше имя" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-text mb-1.5 font-medium">Email *</label>
                                        <input type="email" required value={customRequest.email} onChange={(e) => setCustomRequest(prev => ({ ...prev, email: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" placeholder="example@mail.ru" />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-text mb-1.5 font-medium">Описание желаемого изделия *</label>
                                        <textarea rows={4} required value={customRequest.description} onChange={(e) => setCustomRequest(prev => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-forms border border-gray-200 focus:border-firm-orange focus:outline-none focus:ring-2 focus:ring-firm-orange/20 transition-all text-sm resize-none" placeholder="Опишите цвет, размер, технику, предпочтения..." />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-text mb-1.5 font-medium">Примерный бюджет (₽)</label>
                                        <input type="number" value={customRequest.budget} onChange={(e) => setCustomRequest(prev => ({ ...prev, budget: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl bg-forms border border-gray-200 focus:border-firm-pink focus:outline-none focus:ring-2 focus:ring-firm-pink/20 transition-all text-sm" placeholder="Например, 5000"  />
                                    </div>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full py-2.5 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 font-medium"><SendIcon className="w-4 h-4" color="#f9f9f9" /><span className='text-main'>Отправить запрос</span></motion.button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}