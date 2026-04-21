'use client'

import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import Filters from "@/components/catalog/Filters"
import ProductCard from "@/components/catalog/ProductCard"
import Pagination from "@/components/ui/Pagination"

export default function CatalogPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState({page: 1, limit: 12, total: 0, totalPages: 1, hasMore: false})
    const [filters, setFilters] = useState({category: searchParams.get('category') || 'all', technique: searchParams.get('technique') || '', minPrice: searchParams.get('minPrice') || '', maxPrice: searchParams.get('maxPrice') || '', search: searchParams.get('search') || '', sort: searchParams.get('sort') || 'newest', page: parseInt(searchParams.get('page') || '1')})
    const [availableFilters, setAvailableFilters] = useState({techniques: [], priceRange: {min: 0, max: 10000}, sortOptions: []})

    useEffect(() => {fetchProducts()}, [filters])
    useEffect(() => {fetchFilters()}, [])

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

    const handleFilterChange = (newFilters: any) => {
        const updated = {...filters, ...newFilters, page: 1}
        setFilters(updated)

        const params = new URLSearchParams()
        Object.entries(updated).forEach(([key, value]) => {if (value && value !== 'all') params.append(key, String(value))})
        router.push(`/catalog?${params}`)
    }

    const handlePageChange = (newPage: number) => {
        setFilters({...filters, page: newPage})
        const params = new URLSearchParams()
        Object.entries({...filters, page: newPage}).forEach(([key, value]) => {
            if (value && value !== 'all') params.append(key, String(value))
        })
        router.push(`/catalog?${params}`)
    }

    const clearFilter = () => {
        setFilters({category: 'all', technique: '', minPrice: '', maxPrice: '', search: '', sort: 'newest', page: 1})
        router.push('/catalog')
    }
    
    const handleSearch = (searchTerm: string) => {
        handleFilterChange({ search: searchTerm, page: 1 })
    }

    return (
        <div className="mt-5 flex items-start justify-center">
            <div className="flex flex-col gap-5 w-[90%] max-w-7xl">
                <div>
                    <h1 className="font-['Montserrat_Alternates'] font-semibold text-3xl">Каталог изделий</h1>
                    <p className="text-gray-600 mt-1">{pagination.total} уникальных изделий ручной работы</p>
                </div>

                <div className="relative w-full md:w-96">
                    <input type="text" placeholder="Поиск по названию..." value={filters.search} onChange={(e) => handleSearch(e.target.value)} className="w-full p-3 pl-10 rounded-lg bg-[#f1f1f1] outline-firm-orange" />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="flex gap-6">
                    <div className="w-1/4">
                        <Filters filters={filters} availableFilters={availableFilters} onFilterChange={handleFilterChange} onClearFilters={clearFilter} />
                    </div>
                    
                    <div className="w-3/4">
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-sm text-gray-500">Показано {products.length} из {pagination.total}</p>
                            <select value={filters.sort} onChange={(e) => handleFilterChange({ sort: e.target.value })} className="p-2 rounded-lg bg-[#f1f1f1] outline-firm-pink font-['Montserrat_Alternates']">
                                <option value="newest">Сначала новые</option>
                                <option value="popular">Популярные</option>
                                <option value="price_asc">Сначала дешевле</option>
                                <option value="price_desc">Сначала дороже</option>
                                <option value="rating">По рейтингу</option>
                            </select>
                        </div>

                        {loading ? (
                            <LoadingSpinner />
                        ) : products.length === 0 ? (
                            <div className="text-center py-12 bg-[#f1f1f1] rounded-lg">
                                <p className="text-gray-500 mb-4 font-['Montserrat_Alternates']">Товары не найдены</p>
                                <button onClick={clearFilter} className="px-6 py-3 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-all">Сбросить фильтры</button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-6">
                                    {products.map((product: any) => (<ProductCard key={product.id} product={product} />))}
                                </div>
                                {pagination.totalPages > 1 && (
                                    <div className="mt-8">
                                        <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}