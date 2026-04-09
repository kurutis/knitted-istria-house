'use client'

import { useSession } from "next-auth/react"
import Link from "next/link"
import React, { useState } from "react"
import Image from 'next/image'

interface ProductCardProps {
    product: any
}

export default function ProductCard ({product}: ProductCardProps){
    const {data: session} = useSession()
    const [isFavorite, setIsFavorite] = useState(false)
    const [isInCart, setIsInCart] = useState(false)

    const handleAddToFavorite = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!session){
            window.location.href = '/auth/signin?callbackUrl=/catalog'
            return
        }

        try{
            const response = await fetch('/api/user/favorites', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({productId: product.id})})

            if(response.ok){
                setIsFavorite(!isFavorite)
            }
        }catch(error){
            console.error('Error toggling favorite:', error)
        }
    }

    const handleAddCart = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!session){
            window.location.href = '/auth/signin?callbackUrl=/catalog'
            return
        }

        try{
            const response = await fetch('/api/cart/add', {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({productId: product.id, quantity: 1})})
            if(response.ok){
                setIsInCart(true)
            }
        }catch(error){
            console.error('Error adding to cart:', error)
        }
    }

    return (
        <Link href={`/catalog/${product.id}`} className="group">
            <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative aspect-square bg-[#eaeaea]">
                    {product.main_image_url ? (<Image src={product.main_image_url} alt={product.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" /> ) : (<div className="w-full h-full flex items-center justify-center"> <span className="text-gray-400">Нет фото</span>  </div>)}
                    {product.rating && (<div className="absolute top-2 left-2 bg-white bg-opacity-90 px-2 py-1 rounded-full text-sm flex items-center gap-1"><span>⭐</span><span>{product.rating}</span> </div>)}
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleAddToFavorite} className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-firm-pink hover:text-white transition-colors">
                            <svg className={`w-5 h-5 ${isFavorite ? 'currentColor' : 'none'}`} fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </button>
                        <button onClick={handleAddCart} className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-firm-orange hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg mb-1 line-clamp-2">{product.title}</h3>
                <p className="text-sm text-gray-500 mb-2">от {product.master_name}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                    {product.category && (<span className="text-xs px-2 py-1 bg-[#eaeaea] rounded-full">{product.category}</span>)}
                    {product.technique && (<span className="text-xs px-2 py-1 bg-[#EAEAEA] rounded-full">{product.technique}</span>)}
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-['Montserrat_Alternates'] font-bold text-xl text-firm-orange">{product.price.toLocalString()} ₽</span>
                    {product.reviews_count > 0 && (<span>{product.reviews_count} отзывов</span>)}
                </div>
            </div>
        </Link>
    )
}