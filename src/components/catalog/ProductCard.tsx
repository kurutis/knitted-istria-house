'use client'

import { useSession } from "next-auth/react"
import Link from "next/link"
import React, { useState, useEffect } from "react"
import Image from 'next/image'

interface ProductCardProps {
    product: {
        id: string;
        title: string;
        price: number;
        main_image_url: string | null;
        master_name?: string;
    }
}

// SVG иконка избранного (сердечко)
const FavoriteIcon = ({ className, isFavorite }: { className?: string; isFavorite?: boolean }) => (
    <svg 
        width="43" 
        height="39" 
        viewBox="0 0 43 39" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M30.8125 2C36.2553 2 40.5 6.2282 40.5 11.6875C40.5 15.0356 39.0075 18.2397 35.9707 21.9551C32.9119 25.6973 28.4985 29.7095 22.9873 34.707L22.9854 34.71L21.25 36.2891L19.5146 34.71L19.5127 34.707L17.4971 32.8779C12.9186 28.711 9.20571 25.2295 6.5293 21.9551C3.49247 18.2397 2 15.0356 2 11.6875C2 6.2282 6.24469 2 11.6875 2C14.7804 2 17.7821 3.45026 19.7324 5.72266L21.25 7.49121L22.7676 5.72266C24.7179 3.45026 27.7196 2 30.8125 2Z" 
            stroke={isFavorite ? "#BC354F" : "#D4D4D4"}
            strokeWidth="4"
            fill={isFavorite ? "#BC354F" : "none"}
        />
    </svg>
)

// SVG иконка корзины
const CartIcon = ({ className }: { className?: string }) => (
    <svg 
        width="38" 
        height="32" 
        viewBox="0 0 38 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path 
            d="M2.05121 14.3737C1.9881 14.1218 1.98326 13.8588 2.03703 13.6048C2.09081 13.3508 2.20179 13.1123 2.36155 12.9076C2.52131 12.7029 2.72563 12.5373 2.95899 12.4234C3.19235 12.3095 3.44861 12.2503 3.70829 12.2502H33.5016C33.7611 12.2503 34.0172 12.3095 34.2504 12.4233C34.4836 12.5371 34.6878 12.7026 34.8475 12.9071C35.0072 13.1116 35.1183 13.3498 35.1722 13.6036C35.2261 13.8574 35.2215 14.1202 35.1587 14.372L32.0649 26.7455C31.8802 27.4846 31.4536 28.1408 30.8531 28.6097C30.2527 29.0787 29.5126 29.3335 28.7507 29.3336H8.45916C7.69726 29.3335 6.95726 29.0787 6.35677 28.6097C5.75628 28.1408 5.32976 27.4846 5.145 26.7455L2.05121 14.3737Z" 
            stroke="#BC354F" 
            strokeWidth="4" 
            strokeLinejoin="round"
            fill="none"
        />
        <path 
            d="M13.48 19.0836V22.5002M23.73 19.0836V22.5002M8.35498 12.2502L15.1883 2.00024M28.855 12.2502L22.0216 2.00024" 
            stroke="#BC354F" 
            strokeWidth="4" 
            strokeLinecap="round"
        />
    </svg>
)

export default function ProductCard({ product }: ProductCardProps) {
    const { data: session } = useSession()
    const [isFavorite, setIsFavorite] = useState(false)
    const [isInCart, setIsInCart] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isCartHovered, setIsCartHovered] = useState(false)

    useEffect(() => {
        if (session) {
            checkCartStatus()
            checkFavoriteStatus()
        }
    }, [session, product.id])

    const checkCartStatus = async () => {
        try {
            const response = await fetch('/api/cart')
            const data = await response.json()
            const cartItem = data.items?.find((item: { product_id: string; quantity: number }) => item.product_id === product.id)
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
            const isFav = data.some((item: { id: string }) => item.id === product.id)
            setIsFavorite(!!isFav)
        } catch (error) {
            console.error('Error checking favorite status:', error)
        }
    }

    const handleAddToFavorite = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!session) {
            window.location.href = '/auth/signin?callbackUrl=/catalog'
            return
        }

        setLoading(true)
        try {
            const method = isFavorite ? 'DELETE' : 'POST'
            const url = isFavorite
                ? `/api/user/favorites?productId=${product.id}`
                : '/api/user/favorites'

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: isFavorite ? undefined : JSON.stringify({ productId: product.id })
            })

            if (response.ok) {
                setIsFavorite(!isFavorite)
            }
        } catch (error) {
            console.error('Error toggling favorite:', error)
        } finally {
            setLoading(false)
        }
    }

    const updateQuantity = async (newQuantity: number) => {
        if (newQuantity < 1) {
            await removeFromCart()
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`/api/cart/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: newQuantity })
            })

            if (response.ok) {
                setQuantity(newQuantity)
                setIsInCart(true)
            }
        } catch (error) {
            console.error('Error updating quantity:', error)
        } finally {
            setLoading(false)
        }
    }

    const addToCart = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!session) {
            window.location.href = '/auth/signin?callbackUrl=/catalog'
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: product.id, quantity: 1 })
            })

            if (response.ok) {
                setIsInCart(true)
                setQuantity(1)
            }
        } catch (error) {
            console.error('Error adding to cart:', error)
        } finally {
            setLoading(false)
        }
    }

    const removeFromCart = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/cart?productId=${product.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setIsInCart(false)
                setQuantity(1)
            }
        } catch (error) {
            console.error('Error removing from cart:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Link href={`/catalog/${product.id}`} className="group">
            <div className="bg-white rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                {/* Изображение */}
                <div className="relative aspect-square bg-[#f5f5f5]">
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

                    {/* Кнопка избранного */}
                    <button
                        onClick={handleAddToFavorite}
                        disabled={loading}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className="absolute top-3 right-3 w-10 h-10 rounded-full shadow-md flex items-center justify-center transition-all duration-300 z-10 disabled:opacity-50"
                    >
                        <FavoriteIcon 
                            className={`w-8 h-8 transition-all duration-300 ${
                                isHovered && !isFavorite ? 'scale-110 rotate-12' : ''
                            } ${isFavorite ? 'scale-110' : ''}`}
                            isFavorite={isFavorite}
                        />
                    </button>
                </div>

                {/* Информация о товаре */}
                <div className="p-3">
                    <h3 className="font-['Montserrat_Alternates'] font-medium text-base mb-0.5 line-clamp-1">
                        {product.title}
                    </h3>
                    <p className="text-xs text-gray-400 mb-2">
                        {product.master_name}
                    </p>
                    <div className="flex justify-between items-center">
                        <span className="font-['Montserrat_Alternates'] font-bold text-lg text-firm-orange">
                            {product.price.toLocaleString()} ₽
                        </span>
                        
                        {/* Кнопка корзины с SVG иконкой */}
                        {isInCart ? (
                            <div className="flex items-center gap-2 bg-[#f5f5f5] rounded-lg p-1">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        updateQuantity(quantity - 1)
                                    }}
                                    disabled={loading}
                                    className="w-7 h-7 rounded-full bg-firm-orange text-white flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"
                                >
                                    -
                                </button>
                                <span className="w-5 text-center text-sm font-medium">{quantity}</span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        updateQuantity(quantity + 1)
                                    }}
                                    disabled={loading}
                                    className="w-7 h-7 rounded-full bg-firm-orange text-white flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"
                                >
                                    +
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={addToCart}
                                disabled={loading}
                                onMouseEnter={() => setIsCartHovered(true)}
                                onMouseLeave={() => setIsCartHovered(false)}
                                className="relative flex items-center justify-center disabled:opacity-50"
                            >
                                <CartIcon 
                                    className={`transition-all w-7 h-7 duration-300 ${
                                        isCartHovered ? 'scale-110 rotate-12' : ''
                                    }`}
                                />
                                {loading && (
                                    <div className="absolute inset-0 rounded-full animate-ping opacity-75"></div>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}