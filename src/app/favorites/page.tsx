'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import ProductCard from "@/components/catalog/ProductCard"

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
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {favorites.map((product) => (
                            <ProductCard 
                                key={product.id}
                                product={product}
                                showRemoveFromFavorites={true}
                                onRemoveFromFavorites={handleRemoveFromFavorites}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
