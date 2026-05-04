'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ProductInfoProps {
    product: {
        id: string;
        title: string;
        price: number;
        old_price?: number;
        rating?: number;
        reviews?: { length: number };
        category?: string;
        technique?: string;
        size?: string;
        views?: number;
    }
    session: {
        user?: {
            id?: string;
            name?: string;
            email?: string;
            role?: string;
        };
    } | null
    onUpdate: () => void
}

export default function ProductInfo({ product, session, onUpdate }: ProductInfoProps) {
    const [quantity, setQuantity] = useState(1)
    const [isInCart, setIsInCart] = useState(false)
    const [isFavorite, setIsFavorite] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleAddToCart = async () => {
        if (!session) {
            window.location.href = `/auth/signin?callbackUrl=/catalog/${product.id}`
            return
        }

        setLoading(true)
        try {
            const response = await fetch('/api/cart/add', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({productId: product.id, quantity})})

            if (response.ok) {
                setIsInCart(true)
            }
        } catch (error) {
            console.error('Error adding to cart:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleFavorite = async () => {
        if (!session) {
            window.location.href = `/auth/signin?callbackUrl=/catalog/${product.id}`
            return
        }

        try {
            const response = await fetch('/api/user/favorites', {method: isFavorite ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify({productId: product.id})})

            if (response.ok) {setIsFavorite(!isFavorite)}
        } catch (error) {
            console.error('Error toggling favorite:', error)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-['Montserrat_Alternates'] font-bold text-3xl mb-2">{product.title}</h1>
                <div className="flex items-center gap-4">
                    <span className="font-['Montserrat_Alternates'] font-bold text-4xl text-firm-orange">{product.price.toLocaleString()} ₽</span>
                    {product.old_price && (<span className="text-gray-400 line-through">{product.old_price.toLocaleString()} ₽</span>)}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="font-semibold">{product.rating || 'Нет оценок'}</span>
                </div>
                <span className="text-gray-300">|</span>
                <Link href="#reviews" className="text-firm-orange hover:underline">{product.reviews?.length || 0} отзывов</Link>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-200">
                {product.category && (
                    <div>
                        <p className="text-gray-500 text-sm">Категория</p>
                        <p className="font-medium">{product.category}</p>
                    </div>
                )}
                {product.technique && (
                    <div>
                        <p className="text-gray-500 text-sm">Техника</p>
                        <p className="font-medium">{product.technique}</p>
                    </div>
                )}
                {product.size && (
                    <div>
                        <p className="text-gray-500 text-sm">Размер</p>
                        <p className="font-medium">{product.size}</p>
                    </div>
                )}
                <div>
                    <p className="text-gray-500 text-sm">Просмотры</p>
                    <p className="font-medium">{product.views || 0}</p>
                </div>
            </div>

            <div>
                <label className="block text-gray-700 mb-2 font-['Montserrat_Alternates']">Количество</label>
                <div className="flex items-center gap-2">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 bg-[#EAEAEA] rounded-lg hover:bg-firm-orange hover:text-white transition-colors">-</button>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="w-20 h-10 text-center bg-[#EAEAEA] rounded-lg outline-firm-orange"/>
                    <button onClick={() => setQuantity(quantity + 1)}className="w-10 h-10 bg-[#EAEAEA] rounded-lg hover:bg-firm-pink hover:text-white transition-colors">+</button>
                </div>
            </div>

            <div className="flex gap-4">
                <button onClick={handleAddToCart} disabled={loading || isInCart} className={`flex-1 py-3 rounded-lg font-['Montserrat_Alternates'] font-semibold transition-all duration-300 ${isInCart ? 'bg-green-500 text-white cursor-default':'bg-firm-orange text-white hover:scale-105 hover:bg-opacity-90'} disabled:opacity-50`}>{loading ? 'Добавление...' : isInCart ? 'В корзине ✓' : 'В корзину'}</button>
                <button onClick={handleToggleFavorite} className={`w-12 h-12 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${isFavorite ? 'border-firm-pink bg-firm-pink text-white':'border-firm-orange hover:border-firm-pink hover:bg-firm-pink hover:text-white'}`}><svg className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></button>
            </div>

            <button className="w-full py-3 border-2 border-firm-pink text-firm-pink rounded-lg font-['Montserrat_Alternates'] font-semibold hover:bg-firm-pink hover:text-white transition-all duration-300">Купить в один клик</button>
        </div>
    )
}