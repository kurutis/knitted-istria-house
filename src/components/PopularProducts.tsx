'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
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
    const [columns, setColumns] = useState(4)

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth
            if (width < 640) setColumns(2)
            else if (width < 1024) setColumns(3)
            else setColumns(4)
        }
        
        updateColumns()
        window.addEventListener('resize', updateColumns)
        return () => window.removeEventListener('resize', updateColumns)
    }, [])

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
                    <motion.div 
                        className="w-8 h-8 border-2 border-gray-200 border-t-firm-orange rounded-full inline-block"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                </div>
            </div>
        )
    }

    if (products.length === 0) return null

    const gridCols = {
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4'
    }

    return (
        <motion.div 
            className="py-16 bg-[#F9F9F9] overflow-hidden"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
        >
            <div className="text-center mb-8 lg:mb-10">
                <motion.h2 
                    className="font-['Montserrat_Alternates'] font-semibold text-2xl lg:text-3xl text-gray-800 px-4"
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {activeTab === 'popular' ? 'Популярные изделия' : 'Новинки'}
                </motion.h2>
                
                <motion.p 
                    className="text-gray-500 mt-2 lg:mt-3 text-xs lg:text-sm px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    {activeTab === 'popular' 
                        ? 'Самые просматриваемые и любимые вещи наших покупателей' 
                        : 'Свежие поступления от мастеров'
                    }
                </motion.p>
                <motion.div 
                    className="w-20 h-1 bg-gradient-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: 80 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                />
            </div>

            {/* Вкладки */}
            <div className="flex justify-center gap-2 lg:gap-4 mb-6 lg:mb-8 px-4">
                <motion.button
                    onClick={() => setActiveTab('popular')}
                    className={`px-4 lg:px-6 py-1.5 lg:py-2 rounded-full font-['Montserrat_Alternates'] text-sm lg:text-base transition-all duration-300 ${
                        activeTab === 'popular'
                            ? 'bg-firm-orange text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Популярные
                </motion.button>
                <motion.button
                    onClick={() => setActiveTab('new')}
                    className={`px-4 lg:px-6 py-1.5 lg:py-2 rounded-full font-['Montserrat_Alternates'] text-sm lg:text-base transition-all duration-300 ${
                        activeTab === 'new'
                            ? 'bg-firm-pink text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Новинки
                </motion.button>
            </div>

            {/* Сетка товаров */}
            <AnimatePresence mode="wait">
                <motion.div 
                    key={activeTab}
                    className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-1 lg:gap-2 px-2 lg:px-0`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.4 }}
                >
                    {products.map((product, index) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                            whileHover={{ y: -5 }}
                        >
                            <ProductCard product={product} />
                        </motion.div>
                    ))}
                </motion.div>
            </AnimatePresence>

            <div className="text-center mt-8 lg:mt-10 px-4">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Link href="/catalog">
                        <button className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 w-full sm:w-auto sm:px-6 rounded-xl transition-all duration-300 hover:border-4 hover:bg-firm-orange hover:text-white text-sm lg:text-base">
                            Смотреть весь каталог
                        </button>
                    </Link>
                </motion.div>
            </div>
        </motion.div>
    )
}