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
const FavoriteIcon = ({ className, isFavorite }: { className?: string; isFavorite?: boolean }) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M23.2002 1.25C27.3399 1.25011 30.7498 4.79098 30.75 9.59082C30.75 12.501 29.5561 15.2315 27.25 18.3066C24.9278 21.4031 21.584 24.7143 17.4414 28.8086L17.4395 28.8105L16 30.2383L14.5605 28.8105L14.5586 28.8086C10.416 24.7143 7.07223 21.4031 4.75 18.3066C2.44386 15.2315 1.25 12.501 1.25 9.59082C1.25022 4.79098 4.6601 1.25011 8.7998 1.25C11.164 1.25 13.487 2.4569 15.0176 4.40039L16 5.64746L16.9824 4.40039C18.513 2.4569 20.836 1.25 23.2002 1.25Z" stroke={isFavorite ? "#D97C8E" : "#737682"} strokeWidth="2.5" fill={isFavorite ? "#D97C8E" : "none"} />
    </svg>
)

const CartIcon = ({ className }: { className?: string }) => (
    <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M1.29934 15.7362C1.23854 15.4413 1.23387 15.1335 1.28568 14.8361C1.3375 14.5386 1.44444 14.2595 1.59838 14.0198C1.75232 13.7801 1.9492 13.5863 2.17407 13.4529C2.39893 13.3196 2.64585 13.2503 2.89607 13.2502H31.6043C31.8544 13.2503 32.1011 13.3196 32.3258 13.4529C32.5505 13.5861 32.7473 13.7798 32.9012 14.0192C33.0551 14.2586 33.1621 14.5375 33.2141 14.8347C33.266 15.1318 33.2616 15.4395 33.2011 15.7342L30.22 30.2202C30.0419 31.0856 29.6309 31.8538 29.0523 32.4028C28.4737 32.9518 27.7606 33.2501 27.0265 33.2502H7.47392C6.73977 33.2501 6.02672 32.9518 5.4481 32.4028C4.86948 31.8538 4.45849 31.0856 4.28046 30.2202L1.29934 15.7362Z" stroke="#D97C8E" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
        <path d="M12.3116 21.2502V25.2502M22.1883 21.2502V25.2502M7.37329 13.2502L13.9578 1.25024M27.1267 13.2502L20.5422 1.25024" stroke="#D97C8E" strokeWidth="2.5" strokeLinecap="round" />
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
            <div className="bg-main rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="relative aspect-square bg-main">
                    {product.main_image_url && !imageError ? (
                        <Image src={product.main_image_url} alt={product.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" onError={() => setImageError(true)} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-firm-gray text-sm">Нет фото</span>
                        </div>
                    )}
                    <button onClick={handleAddToFavorite}  disabled={loading} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 disabled:opacity-50 bg-main/80 backdrop-blur-sm"><FavoriteIcon className={`w-8 h-8 transition-all duration-300 ${isHovered && !isFavorite ? 'scale-110 rotate-12' : '' } ${isFavorite ? 'scale-110' : ''}`} isFavorite={isFavorite} /></button>
                </div>

                <div className="p-3">
                    <h3 className="font-['Montserrat_Alternates'] font-medium text-base mb-0.5 line-clamp-1">{product.title}</h3>
                    <p className="text-xs text-firm-gray mb-2">{product.master_name}</p>
                    <div className="flex justify-between items-center">
                        <span className="font-['Montserrat_Alternates'] font-bold text-lg text-firm-orange">{product.price.toLocaleString()} ₽</span>
                        
                        {isInCart ? (
                            <div className="flex items-center gap-2 bg-main rounded-lg p-1">
                                <button onClick={(e) => {e.preventDefault(); updateQuantity(quantity - 1)}} disabled={loading} className="w-7 h-7 rounded-full bg-firm-orange text-main flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50">-</button>
                                <span className="w-5 text-center text-sm font-medium">{quantity}</span>
                                <button onClick={(e) => {e.preventDefault(); updateQuantity(quantity + 1)}} disabled={loading}className="w-7 h-7 rounded-full bg-firm-orange text-main flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"> +</button>
                            </div>
                        ) : (
                            <button onClick={addToCart} disabled={loading} onMouseEnter={() => setIsCartHovered(true)}  onMouseLeave={() => setIsCartHovered(false)} className="relative flex items-center justify-center disabled:opacity-50 bg-main/80 backdrop-blur-sm rounded-full p-1"><CartIcon className={`w-7 h-7 transition-all duration-300 ${isCartHovered ? 'scale-110 rotate-12' : ''}`} /> {loading && (<div className="absolute inset-0 rounded-full animate-ping opacity-75"></div>)}</button>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    )
}