'use client'

import { useSession } from "next-auth/react"
import Link from "next/link"
import React, { useState, useEffect } from "react"
import Image from 'next/image'
import { FavoritesIcon } from "@/components/icons/FavoritesIcon"
import { CartIcon } from "@/components/icons/CartIcon"

interface ProductCardProps {
    product: {
        id: string;
        title: string;
        price: number;
        main_image_url: string | null;
        master_name?: string;
    }
}

export default function ProductCard({ product }: ProductCardProps) {
    const { data: session } = useSession()
    const [isFavorite, setIsFavorite] = useState(false)
    const [isInCart, setIsInCart] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [isCartHovered, setIsCartHovered] = useState(false)
    const [imageError, setImageError] = useState(false)

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
            
            let favoritesList: { id: string }[] = []
            if (data.favorites && Array.isArray(data.favorites)) {
                favoritesList = data.favorites
            } else if (Array.isArray(data)) {
                favoritesList = data
            }
            
            const isFav = favoritesList.some((item: { id: string }) => item.id === product.id)
            setIsFavorite(isFav)
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
            const url = isFavorite ? `/api/user/favorites?productId=${product.id}` : '/api/user/favorites'
            const response = await fetch(url, {method: method, headers: { 'Content-Type': 'application/json' }, body: isFavorite ? undefined : JSON.stringify({ productId: product.id })})

            if (response.ok) {setIsFavorite(!isFavorite)}
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
            const response = await fetch('/api/cart', {method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, quantity: newQuantity })})

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
        e.preventDefault();
        if (!session) {
            window.location.href = '/auth/signin?callbackUrl=/catalog';
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/cart', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: product.id, quantity: 1 })});
            
            if (response.ok) {
                setIsInCart(true);
                setQuantity(1);
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeFromCart = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/cart?productId=${product.id}`, {method: 'DELETE'})

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
            <div className="bg-main rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-100">
                <div className="relative aspect-square bg-main">
                    {product.main_image_url && !imageError ? (
                        <Image src={product.main_image_url} alt={product.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" onError={() => setImageError(true)} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-firm-gray text-sm">Нет фото</span>
                        </div>
                    )}
                    <button onClick={handleAddToFavorite} disabled={loading} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 disabled:opacity-50 bg-main backdrop-blur-sm"><FavoritesIcon size={20} className={`transition-all duration-300 ${isHovered && !isFavorite ? 'scale-110 rotate-12' : ''} ${isFavorite ? 'scale-110' : ''}`} color={isFavorite ? "#D97C8E" : "#737682"} /></button>
                </div>

                <div className="p-3">
                    <h3 className="font-['Montserrat_Alternates'] font-medium text-base mb-0.5 line-clamp-1">{product.title}</h3>
                    <p className="text-xs text-firm-gray mb-2">{product.master_name}</p>
                    <div className="flex justify-between items-center">
                        <span className="font-['Montserrat_Alternates'] font-bold text-lg text-firm-orange">{product.price.toLocaleString()} ₽</span>
                        
                        {isInCart ? (
                            <div className="flex items-center gap-2 bg-main rounded-lg p-1 border border-gray-200">
                                <button onClick={(e) => {e.preventDefault(); updateQuantity(quantity - 1)}} disabled={loading} className="w-7 h-7 rounded-full bg-firm-orange text-main flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50">-</button>
                                <span className="w-5 text-center text-sm font-medium">{quantity}</span>
                                <button onClick={(e) => {e.preventDefault(); updateQuantity(quantity + 1)}} disabled={loading} className="w-7 h-7 rounded-full bg-firm-orange text-main flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"> +</button>
                            </div>
                        ) : (
                            <button onClick={addToCart} disabled={loading} onMouseEnter={() => setIsCartHovered(true)} onMouseLeave={() => setIsCartHovered(false)} className="relative flex items-center justify-center disabled:opacity-50 bg-white/80 backdrop-blur-sm rounded-full p-2 hover:bg-firm-orange/10 transition-colors"><CartIcon size={20} color="#D97C8E" className={`transition-all duration-300 ${isCartHovered ? 'scale-110 rotate-12' : ''}`} />{loading && (<div className="absolute inset-0 rounded-full animate-ping opacity-75"></div>)}</button>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}