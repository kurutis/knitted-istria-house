'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import toast from "react-hot-toast"

import { CartIcon } from "@/components/icons/CartIcon"
import { LikeIcon } from "@/components/icons/LikeIcon"
import { CloseIcon } from "@/components/icons/CloseIcon"
import { Productslcon } from "@/components/icons/Productslcon"
import { UserIcon } from "@/components/icons/UserIcon"

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
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

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
            
            if (data && data.success && Array.isArray(data.favorites)) {
                setFavorites(data.favorites)
            } else if (Array.isArray(data)) {
                setFavorites(data)
            } else {
                setFavorites([])
            }
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error)
            toast.error('Ошибка загрузки избранного')
            setFavorites([])
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveFromFavorites = async (productId: string) => {
        if (!productId) return
        
        setRemovingId(productId)
        try {
            const response = await fetch(`/api/user/favorites?productId=${productId}`, {method: 'DELETE'})
            
            if (response.ok) {
                setFavorites(prev => prev.filter(item => item.id !== productId))
                toast.success('Товар удален из избранного')
            } else {
                const error = await response.json()
                toast.error(error.error || 'Ошибка при удалении из избранного')
            }
        } catch (error) {
            console.error('Error removing from favorites:', error)
            toast.error('Ошибка при удалении из избранного')
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

    const fadeInUp = {initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }}

    const staggerContainer = {animate: { transition: { staggerChildren: 0.05 } }}

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-firm-orange border-t-transparent rounded-full mx-auto"  />
                    <p className="mt-4 font-['Montserrat_Alternates'] text-firm-gray">Загрузка избранного...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-main">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}  className="mb-8 sm:mb-10">
                    <h1 className="font-['Montserrat_Alternates'] font-bold text-2xl sm:text-3xl lg:text-4xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Избранное</h1>
                    <p className="text-firm-gray mt-2 text-sm sm:text-base">{favorites.length} {favorites.length === 1 ? 'товар' : favorites.length > 1 && favorites.length < 5 ? 'товара' : 'товаров'}</p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {!favorites || favorites.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-main rounded-2xl shadow-xl p-8 sm:p-12 text-center border border-gray-100">
                            <div className="flex justify-center mb-4">
                                <LikeIcon color="#D1D5DB" className="w-16 h-16 sm:w-20 sm:h-20" />
                            </div>
                            <p className="text-firm-gray mb-3 font-['Montserrat_Alternates'] text-lg sm:text-xl">В избранном пока нет товаров</p>
                            <p className="text-firm-gray/70 mb-6 text-sm sm:text-base"> Добавляйте товары в избранное, чтобы не потерять понравившиеся</p>
                            <Link href="/catalog" className="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-firm-orange to-firm-pink text-main rounded-xl hover:shadow-lg transition-all duration-300 font-['Montserrat_Alternates'] text-sm sm:text-base"><CartIcon className="w-4 h-4 sm:w-5 sm:h-5" color="#f9f9f9" />Перейти в каталог</Link>
                        </motion.div>
                    ) : (
                        <motion.div key="products" variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                            {favorites.map((product, index) => (
                                <motion.div key={product.id || index} variants={fadeInUp} whileHover={{ y: -5 }} className="group">
                                    <div className="bg-main rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
                                        <Link href={`/catalog/${product.id}`} className="block relative aspect-square overflow-hidden bg-gray-100">
                                            {product.main_image_url ? (
                                                <img src={product.main_image_url} alt={product.title || 'Товар'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none'}} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                                    <Productslcon className="w-10 h-10 sm:w-12 sm:h-12" color="#D1D5DB" />
                                                </div>
                                            )}
                                            
                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => handleRemoveFromFavorites(product.id)} disabled={removingId === product.id} className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 bg-main rounded-full shadow-md flex items-center justify-center text-firm-red hover:bg-firm-red hover:text-main transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-50">
                                                {removingId === product.id ? (<div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-firm-red border-t-transparent rounded-full animate-spin" />) : (<CloseIcon className="w-3 h-3 sm:w-4 sm:h-4" color="#D77C7C" />)}
                                            </motion.button>
                                            
                                            {product.in_stock === false && (
                                                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-main-black/70 text-main text-xs rounded-lg">
                                                    Нет в наличии
                                                </div>
                                            )}
                                        </Link>
                                        
                                        <div className="p-3 sm:p-4">
                                            <Link href={`/catalog/${product.id}`}>
                                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-sm sm:text-base line-clamp-2 hover:text-firm-orange transition-colors text-text">{product.title || 'Без названия'}</h3>
                                            </Link>
                                            
                                            {product.master_name && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <UserIcon className="w-3 h-3" color="#737682" />
                                                    <p className="text-xs text-firm-gray line-clamp-1">{product.master_name}</p>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between mt-3">
                                                <span className="font-['Montserrat_Alternates'] font-bold text-firm-pink text-sm sm:text-base md:text-lg">{formatPrice(product.price)} ₽</span>
                                                
                                                <Link href={`/catalog/${product.id}`}><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-2.5 sm:px-3 py-1 text-xs bg-gray-100 text-firm-gray rounded-lg hover:bg-linear-to-r hover:from-firm-orange hover:to-firm-pink hover:text-main transition-all duration-300">Подробнее</motion.button></Link>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}