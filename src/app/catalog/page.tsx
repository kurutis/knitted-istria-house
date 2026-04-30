'use client'

import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Filters from "@/components/catalog/Filters"
import ProductCard from "@/components/catalog/ProductCard"
import Pagination from "@/components/ui/Pagination"
import allIcon from '../../../public/products.svg'
import Image from "next/image"

interface Category {
    id: number
    name: string
    icon_url: string | null
    parent_category_id: number | null
}

// Компонент, который использует useSearchParams
function CatalogContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({page: 1, limit: 12, total: 0, totalPages: 1, hasMore: false})
    const [filters, setFilters] = useState({
        category: searchParams.get('category') || 'all', 
        technique: searchParams.get('technique') || '', 
        minPrice: searchParams.get('minPrice') || '', 
        maxPrice: searchParams.get('maxPrice') || '', 
        search: searchParams.get('search') || '', 
        sort: searchParams.get('sort') || 'newest', 
        page: parseInt(searchParams.get('page') || '1')
    })
    const [availableFilters, setAvailableFilters] = useState({techniques: [], priceRange: {min: 0, max: 10000}, sortOptions: []})
    const [categories, setCategories] = useState<Category[]>([])
    const [loadingCategories, setLoadingCategories] = useState(true)
    const [iconErrors, setIconErrors] = useState<Set<string>>(new Set())
    const [isMobile, setIsMobile] = useState(false)
    const [showMobileFilters, setShowMobileFilters] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        fetchProducts()
        fetchCategories()
    }, [filters])

    useEffect(() => {
        fetchFilters()
    }, [])

    const fetchProducts = async () => {
        setLoading(true)
        try{
            const params = new URLSearchParams()
            Object.entries(filters).forEach(([key, value]) => {if (value) params.append(key, String(value))})
            
            const response = await fetch(`/api/catalog/products?${params}`)
            const data = await response.json()
            
            setProducts(data.products)
            setPagination(data.pagination)
        }catch(error){
            console.error('Error fetching products:', error)
        }finally{
            setLoading(false)
        }
    }

    const fetchFilters = async () => {
        try{
            const response = await fetch(`/api/catalog/filters`)
            const data = await response.json()
            setAvailableFilters(data)
        }catch (error){
            console.error('Error fetching filters:', error)
        }
    }

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true)
            const response = await fetch('/api/catalog/categories')
            const data = await response.json()
            setCategories(data.categories || [])
        } catch (error) {
            console.error('Error fetching categories:', error)
        } finally {
            setLoadingCategories(false)
        }
    }

    const handleFilterChange = (newFilters: any) => {
        const updated = {...filters, ...newFilters, page: 1}
        setFilters(updated)

        const params = new URLSearchParams()
        Object.entries(updated).forEach(([key, value]) => {if (value && value !== 'all') params.append(key, String(value))})
        router.push(`/catalog?${params}`)
        if (isMobile) setShowMobileFilters(false)
    }

    const handlePageChange = (newPage: number) => {
        setFilters({...filters, page: newPage})
        const params = new URLSearchParams()
        Object.entries({...filters, page: newPage}).forEach(([key, value]) => {
            if (value && value !== 'all') params.append(key, String(value))
        })
        router.push(`/catalog?${params}`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const clearFilter = () => {
        setFilters({category: 'all', technique: '', minPrice: '', maxPrice: '', search: '', sort: 'newest', page: 1})
        router.push('/catalog')
        if (isMobile) setShowMobileFilters(false)
    }
    
    const handleSearch = (searchTerm: string) => {
        handleFilterChange({ search: searchTerm, page: 1 })
    }

    const getGridCols = () => {
        if (isMobile) return 'grid-cols-2'
        return 'grid-cols-3 lg:grid-cols-4'
    }

    const getCategoryIcon = (categoryName: string) => {
        const emojis: Record<string, string> = {
            'Свитера': '🧶', 'Шапки': '🧢', 'Шарфы': '🧣',
            'Варежки': '🧤', 'Носки': '🧦', 'Пледы': '🛋️', 'Игрушки': '🧸'
        }
        return emojis[categoryName] || allIcon
    }

    const handleIconError = (categoryName: string) => {
        setIconErrors(prev => new Set(prev).add(categoryName))
    }

    // Основные категории (без родителя)
    const rootCategories = categories.filter(cat => cat.parent_category_id === null)

    return (
        <div className="mt-5 flex items-start justify-center px-3 sm:px-4">
            <div className="flex flex-col gap-5 w-full max-w-7xl">
                {/* Header */}
                <div className="px-2">
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-2xl sm:text-3xl">Каталог изделий</h1>
                    <p className="text-gray-600 mt-1 text-sm">{pagination.total} уникальных изделий ручной работы</p>
                </div>

                {/* Category Icons Row */}
                {!loadingCategories && rootCategories.length > 0 && (
                    <div className="overflow-x-auto pb-2 px-2">
                        <div className="flex gap-4 min-w-max">
                            <button
                                onClick={() => handleFilterChange({ category: 'all' })}
                                className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                                    filters.category === 'all' ? 'bg-firm-orange bg-opacity-10' : 'hover:bg-gray-50'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Image src={allIcon} alt="all" className="w-6 h-6 object-contain" />
                                </div>
                                <span className={`text-xs font-medium ${filters.category === 'all' ? 'text-firm-orange' : 'text-gray-600'}`}>
                                    Все
                                </span>
                            </button>

                            {rootCategories.map((cat) => {
                                const hasError = iconErrors.has(cat.name)
                                
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleFilterChange({ category: cat.name })}
                                        className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                                            filters.category === cat.name ? 'bg-firm-orange bg-opacity-10' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                            {cat.icon_url && !hasError ? (
                                                <img 
                                                    src={cat.icon_url} 
                                                    alt={cat.name}
                                                    className="w-6 h-6 object-contain"
                                                    onError={() => handleIconError(cat.name)}
                                                />
                                            ) : (
                                                <span className="text-2xl">{getCategoryIcon(cat.name)}</span>
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium ${filters.category === cat.name ? 'text-firm-orange' : 'text-gray-600'}`}>
                                            {cat.name}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Search and Mobile Filters Button */}
                <div className="flex gap-3 items-center px-2">
                    <div className="relative flex-1 md:w-96 md:flex-none">
                        <input 
                            type="text" 
                            placeholder="Поиск по названию..." 
                            value={filters.search} 
                            onChange={(e) => handleSearch(e.target.value)} 
                            className="w-full p-3 pl-10 rounded-lg bg-[#f1f1f1] outline-firm-orange text-sm" 
                        />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    
                    {isMobile && (
                        <motion.button
                            onClick={() => setShowMobileFilters(true)}
                            className="px-4 py-3 bg-firm-orange text-white rounded-lg flex items-center gap-2 text-sm whitespace-nowrap"
                            whileTap={{ scale: 0.95 }}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Фильтры
                        </motion.button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Desktop Filters */}
                    {!isMobile && (
                        <div className="w-full md:w-1/4">
                            <Filters 
                                filters={filters} 
                                availableFilters={availableFilters} 
                                onFilterChange={handleFilterChange} 
                                onClearFilters={clearFilter} 
                            />
                        </div>
                    )}
                    
                    {/* Products Grid */}
                    <div className="w-full md:w-3/4">
                        {/* Sort and count */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 px-2">
                            <p className="text-sm text-gray-500">Показано {products.length} из {pagination.total}</p>
                            <select 
                                value={filters.sort} 
                                onChange={(e) => handleFilterChange({ sort: e.target.value })} 
                                className="p-2 rounded-lg bg-[#f1f1f1] outline-firm-pink font-['Montserrat_Alternates'] text-sm w-full sm:w-auto"
                            >
                                <option value="newest">Сначала новые</option>
                                <option value="popular">Популярные</option>
                                <option value="price_asc">Сначала дешевле</option>
                                <option value="price_desc">Сначала дороже</option>
                                <option value="rating">По рейтингу</option>
                            </select>
                        </div>

                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div 
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="py-12"
                                >
                                    <LoadingSpinner />
                                </motion.div>
                            ) : products.length === 0 ? (
                                <motion.div 
                                    key="empty"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-12 bg-[#f1f1f1] rounded-lg mx-2"
                                >
                                    <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">Товары не найдены</p>
                                    <button 
                                        onClick={clearFilter} 
                                        className="px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all"
                                    >
                                        Сбросить фильтры
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="products"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`grid ${getGridCols()} gap-2 sm:gap-4`}
                                >
                                    {products.map((product: any, index: number) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ y: -5 }}
                                        >
                                            <ProductCard product={product} />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {pagination.totalPages > 1 && !loading && products.length > 0 && (
                            <motion.div 
                                className="mt-8"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Pagination 
                                    currentPage={pagination.page} 
                                    totalPages={pagination.totalPages} 
                                    onPageChange={handlePageChange} 
                                />
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filters Modal */}
            <AnimatePresence>
                {isMobile && showMobileFilters && (
                    <motion.div 
                        className="fixed inset-0 z-50 bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMobileFilters(false)}
                    >
                        <motion.div 
                            className="fixed right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-xl overflow-y-auto"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg">Фильтры</h3>
                                <button 
                                    onClick={() => setShowMobileFilters(false)}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-4">
                                <Filters 
                                    filters={filters} 
                                    availableFilters={availableFilters} 
                                    onFilterChange={handleFilterChange} 
                                    onClearFilters={clearFilter} 
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// Основной компонент с Suspense
export default function CatalogPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]">Загрузка...</div>}>
            <CatalogContent />
        </Suspense>
    )
}