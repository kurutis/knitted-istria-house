'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

interface FavoriteProduct {
    id: string
    title: string
    price: number
    main_image_url: string
    master_name: string
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
            setFavorites(data || [])
        } catch (error) {
            console.error('Ошибка загрузки избранного:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveFromFavorites = async (productId: string) => {
        setRemovingId(productId)
        try {
            const response = await fetch(`/api/user/favorites?productId=${productId}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                setFavorites(prev => prev.filter(item => item.id !== productId))
            } else {
                alert('Ошибка при удалении из избранного')
            }
        } catch (error) {
            console.error('Error removing from favorites:', error)
            alert('Ошибка при удалении из избранного')
        } finally {
            setRemovingId(null)
        }
    }

    const handleAddToCart = async (productId: string) => {
        if (!session) {
            router.push('/auth/signin?callbackUrl=/favorites')
            return
        }

        try {
            const response = await fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity: 1 })
            })

            if (response.ok) {
                alert('Товар добавлен в корзину')
            } else {
                alert('Ошибка при добавлении в корзину')
            }
        } catch (error) {
            console.error('Error adding to cart:', error)
            alert('Ошибка при добавлении в корзину')
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

    return (
        <div className="mt-5 flex items-start justify-center">
            <div className="flex flex-col gap-5 w-[90%] max-w-7xl">
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">Избранное</h1>
                    <p className="text-gray-600 mt-1">
                        {favorites.length} {favorites.length === 1 ? 'товар' : favorites.length > 1 && favorites.length < 5 ? 'товара' : 'товаров'}
                    </p>
                </div>

                {favorites.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <div className="text-6xl mb-4">❤️</div>
                        <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">В избранном пока нет товаров</p>
                        <Link 
                            href="/catalog" 
                            className="inline-block px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all duration-300"
                        >
                            Перейти в каталог
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-6">
                        {favorites.map((product) => (
                            <div key={product.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 group relative">
                                {/* Ссылка на товар */}
                                <Link href={`/catalog/${product.id}`}>
                                    <div className="relative aspect-square bg-[#f5f5f5]">
                                        {product.main_image_url ? (
                                            <Image 
                                                src={product.main_image_url} 
                                                alt={product.title} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                width={200}
                                                height={200} 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-gray-400 text-sm">Нет фото</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-['Montserrat_Alternates'] font-medium text-base mb-0.5 line-clamp-1">
                                            {product.title}
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-2">
                                            {product.master_name}
                                        </p>
                                        <p className="font-['Montserrat_Alternates'] font-bold text-lg text-firm-orange">
                                            {product.price.toLocaleString()} ₽
                                        </p>
                                    </div>
                                </Link>
                                
                                {/* Кнопка удаления */}
                                <button
                                    onClick={() => handleRemoveFromFavorites(product.id)}
                                    disabled={removingId === product.id}
                                    className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors z-10"
                                >
                                    {removingId === product.id ? (
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    )}
                                </button>

                                {/* Кнопка добавления в корзину */}
                                <button
                                    onClick={() => handleAddToCart(product.id)}
                                    className="absolute bottom-2 right-2 w-8 h-8 bg-firm-orange rounded-full shadow-md flex items-center justify-center hover:bg-opacity-90 transition-colors z-10"
                                >
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}