'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/catalog/ProductCard'

interface Product {
    id: string
    title: string
    price: number
    main_image_url: string
    master_name: string
    rating: number
    reviews_count: number
    views: number
    status: string
    category: string
    technique: string
    size: string
    created_at: string
    master_id: string
    images?: any[]
}

export default function PopularProducts() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'popular' | 'new'>('popular')

    useEffect(() => {
        fetchProducts()
    }, [activeTab])

    const fetchProducts = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/catalog/products?sort=${activeTab === 'popular' ? 'popular' : 'newest'}&limit=6`)
            const data = await response.json()
            setProducts(data.products || [])
        } catch (error) {
            console.error('Error fetching products:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="py-16">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-firm-orange rounded-full animate-spin inline-block"></div>
                </div>
            </div>
        )
    }

    if (products.length === 0) return null

    return (
        <div className="py-16 bg-[#F9F9F9]">
            <div className="text-center mb-12">
                <h2 className="font-['Montserrat_Alternates'] font-semibold text-3xl text-gray-800">
                    {activeTab === 'popular' ? 'Популярные изделия' : 'Новинки'}
                </h2>
                <div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full"></div>
                <p className="text-gray-500 mt-3 text-sm">
                    {activeTab === 'popular' 
                        ? 'Самые просматриваемые и любимые вещи наших покупателей' 
                        : 'Свежие поступления от мастеров'
                    }
                </p>
            </div>

            {/* Вкладки */}
            <div className="flex justify-center gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('popular')}
                    className={`px-6 py-2 rounded-full font-['Montserrat_Alternates'] transition-all duration-300 ${
                        activeTab === 'popular'
                            ? 'bg-firm-orange text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    Популярные
                </button>
                <button
                    onClick={() => setActiveTab('new')}
                    className={`px-6 py-2 rounded-full font-['Montserrat_Alternates'] transition-all duration-300 ${
                        activeTab === 'new'
                            ? 'bg-firm-pink text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    Новинки
                </button>
            </div>

            {/* Сетка товаров с ProductCard */}
            <div className="grid grid-cols-4 gap-2">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            <div className="text-center mt-12 h-15">
                <Link href="/catalog">
                    <button className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 w-62.5 rounded-xl transition-all duration-300 hover:scale-105 hover:border-4 hover:bg-firm-orange hover:text-white hover:cursor-pointer">
                        Смотреть весь каталог
                    </button>
                </Link>
            </div>
        </div>
    )
}