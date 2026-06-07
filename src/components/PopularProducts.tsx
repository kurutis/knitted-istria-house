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
    images?: Array<{ id: string; url: string; sort_order: number }>
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
        
            const productsData = Array.isArray(data.products) ? data.products : []
            setProducts(productsData)
        } catch (error) {
            console.error('Error fetching products:', error)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }

    const handleTabChange = (tab: 'popular' | 'new') => {
        if (tab === activeTab) return
        setActiveTab(tab)
    }

    if (products.length === 0 && !loading) return null

    const gridCols = {2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4'}

    return (
        <motion.div className="py-16 bg-main overflow-hidden" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }}>
            <div className="text-center mb-8 lg:mb-10">
                <motion.h2 className="font-['Montserrat_Alternates'] font-semibold text-2xl lg:text-3xl text-text px-4" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
                    <AnimatePresence mode="wait">
                        <motion.span key={activeTab} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }} >
                            <span className="font-['Montserrat_Alternates'] font-semibold text-2xl lg:text-3xl text-text px-4">{activeTab === 'popular' ? 'Популярные изделия' : 'Новинки'}</span>
                        </motion.span>
                    </AnimatePresence>
                </motion.h2>
                <motion.p className="text-text mt-2 lg:mt-3 text-xs lg:text-sm px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                    <AnimatePresence mode="wait">
                        <motion.span key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>{activeTab === 'popular' ? 'Самые просматриваемые и любимые вещи наших покупателей' : 'Свежие поступления от мастеров' }</motion.span>
                    </AnimatePresence>
                </motion.p>
                <motion.div className="w-20 h-1 bg-linear-to-r from-firm-orange to-firm-pink mx-auto mt-3 rounded-full" initial={{ width: 0 }} animate={{ width: 80 }} transition={{ duration: 0.6, delay: 0.3 }} />
            </div>
            <div className="flex justify-center gap-2 lg:gap-4 mb-6 lg:mb-8 px-4">
                <motion.button onClick={() => handleTabChange('popular')} className={`relative px-4 lg:px-6 py-1.5 lg:py-2 rounded-full font-['Montserrat_Alternates'] text-sm lg:text-base transition-colors duration-300 ${activeTab === 'popular'  ? 'bg-firm-orange text-main shadow-md' : 'bg-main text-firm-gary hover:bg-gray-100' }`} whileHover={{ scale: 1.05 }}  whileTap={{ scale: 0.95 }} transition={{ type: "tween", duration: 0.15, ease: "easeOut" }}  style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased'}} >Популярные</motion.button>         
                <motion.button onClick={() => handleTabChange('new')} className={`relative px-4 lg:px-6 py-1.5 lg:py-2 rounded-full font-['Montserrat_Alternates'] text-sm lg:text-base transition-colors duration-300 ${ activeTab === 'new' ? 'bg-firm-pink text-main shadow-md' : 'bg-main text-gray-600 hover:bg-gray-100'}`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{ type: "tween", duration: 0.15, ease: "easeOut"}}  style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased'}}>Новинки</motion.button>
            </div>
            <div className="min-h-100">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="loader" className="flex justify-center items-center h-100" initial={{ opacity: 0 }} animate={{ opacity: 1 }}  exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            <motion.div className="w-8 h-8 border-2 border-gray-200 border-t-firm-orange rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                        </motion.div>
                    ) : (
                        <motion.div key={activeTab} className={`grid ${gridCols[columns as keyof typeof gridCols]} gap-1 lg:gap-2 px-2 lg:px-0`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                            {products.map((product, index) => (
                                <motion.div key={product.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }} whileHover={{ y: -5 }}>
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="text-center mt-8 lg:mt-10 px-4">
                <div className="flex justify-center min-h-13">
                    <Link href="/catalog" className="inline-block">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={{type: "tween", duration: 0.15, ease: "easeOut"}} className="font-['Montserrat_Alternates'] font-[450] border-2 border-firm-orange p-2 px-6 rounded-xl transition-all duration-300 hover:border-4 hover:bg-firm-orange hover:text-main text-sm lg:text-base whitespace-nowrap" style={{transform: 'translateZ(0)', backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}>Смотреть весь каталог</motion.button>
                    </Link>
                </div>
            </div>
        </motion.div>
    )
}