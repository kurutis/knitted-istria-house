'use client'

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import PriceRange from "./PriceRange"
import allIcon from '../../../public/products.svg'

interface FiltersProps {
    filters: {
        category: string;
        technique: string;
        minPrice: string | number;
        maxPrice: string | number;
        search?: string;
        sort?: string;
        page?: number;
    }
    availableFilters: {
        techniques?: Array<{ technique: string; count: number }>;
        priceRange?: { min: number; max: number };
        sortOptions?: string[];
    }
    onFilterChange: (filters: {
        category?: string;
        technique?: string;
        minPrice?: string | number;
        maxPrice?: string | number;
        search?: string;
        sort?: string;
        page?: number;
    }) => void
    onClearFilters: () => void
}

interface Category {
    id: number
    name: string
    description: string
    parent_category_id: number | null
    icon_url: string | null
    products_count: number
    subcategories?: Category[]
}

const MAX_DISPLAY_PRICE = 50000

export default function Filters({ filters, availableFilters, onFilterChange, onClearFilters }: FiltersProps) {
    const originalMaxPrice = availableFilters.priceRange?.max || 10000
    const displayMaxPrice = Math.min(originalMaxPrice, MAX_DISPLAY_PRICE)

    const [priceRange, setPriceRange] = useState({min: Number(filters.minPrice) || availableFilters.priceRange?.min || 0, max: Number(filters.maxPrice) || displayMaxPrice})
    const [categories, setCategories] = useState<Category[]>([])
    const [loadingCategories, setLoadingCategories] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
    const [iconErrors, setIconErrors] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchCategories()
    }, [])

    useEffect(() => {
        setPriceRange({min: Number(filters.minPrice) || availableFilters.priceRange?.min || 0, max: Number(filters.maxPrice) || displayMaxPrice})}, [filters.minPrice, filters.maxPrice, availableFilters.priceRange?.min, displayMaxPrice])

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true)
            const response = await fetch('/api/catalog/categories')
            const data = await response.json()
            setCategories(data.categories || [])
            
            if (filters.category && filters.category !== 'all') {expandCategoryPath(filters.category, data.categories || [])}
        } catch (error) {
            console.error('Error fetching categories:', error)
        } finally {
            setLoadingCategories(false)
        }
    }

    const expandCategoryPath = (categoryName: string, cats: Category[]) => {
        for (const cat of cats) {
            if (cat.name === categoryName) {
                setExpandedCategories(prev => new Set([...prev, cat.id]))
                return true
            }
            if (cat.subcategories && cat.subcategories.length > 0) {
                if (expandCategoryPath(categoryName, cat.subcategories)) {
                    setExpandedCategories(prev => new Set([...prev, cat.id]))
                    return true
                }
            }
        }
        return false
    }

    const handlePriceChange = (min: number, max: number) => {
        setPriceRange({ min, max })
        onFilterChange({ minPrice: min, maxPrice: max })
    }

    const handleTechniqueChange = (technique: string) => {
        const newTechnique = filters.technique === technique ? '' : technique
        onFilterChange({ technique: newTechnique })
    }

    const hasActiveFilters = () => {
        return filters.category !== 'all' ||
            filters.technique ||
            filters.minPrice ||
            filters.maxPrice
    }

    const getCategoryIcon = (categoryName: string) => {
        const icons: Record<string, string> = {'Свитера': '🧶', 'Свитер': '🧶', 'Шапки': '🧢', 'Шапка': '🧢', 'Шарфы': '🧣', 'Шарф': '🧣', 'Варежки': '🧤', 'Варежка': '🧤', 'Носки': '🧦', 'Носок': '🧦', 'Пледы': '🛋️', 'Плед': '🛋️', 'Игрушки': '🧸', 'Игрушка': '🧸', 'Для дома': '🏠', 'other': '📦'}
        return icons[categoryName] || '📦'
    }

    const toggleCategory = (categoryId: number) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev)
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId)
            } else {
                newSet.add(categoryId)
            }
            return newSet
        })
    }

    const handleIconError = (categoryName: string) => {
        setIconErrors(prev => new Set(prev).add(categoryName))
    }

    const renderCategories = (categoriesList: Category[], level: number = 0) => {
        return categoriesList.map((cat) => {
            const hasSubcategories = cat.subcategories && cat.subcategories.length > 0
            const isExpanded = expandedCategories.has(cat.id)
            const hasIconError = iconErrors.has(cat.name)
            const isActive = filters.category === cat.name
            
            return (
                <div key={cat.id}>
                    <motion.button whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }} onClick={() => onFilterChange({ category: cat.name })} className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center gap-2 ${isActive ? 'bg-linear-to-r from-firm-orange to-firm-pink shadow-md' : 'hover:bg-main border-2 border-transparent hover:border-firm-orange/20'}`}  style={{ paddingLeft: `${12 + level * 20}px` }}>
                        {hasSubcategories && (<span onClick={(e) => {e.stopPropagation(); toggleCategory(cat.id)}} className="w-5 h-5 flex items-center justify-center rounded hover:bg-main-black/10 cursor-pointer"><motion.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="text-xs text-firm-pink">▶</motion.span></span>)}
                        {!hasSubcategories && <span className="w-5" />}
                        
                        {cat.icon_url && !hasIconError ? (
                            <img src={cat.icon_url} alt={cat.name} className={`w-5 h-5 object-contain ${isActive ? 'brightness-0 invert' : ''}`} onError={() => handleIconError(cat.name)} />
                        ) : (
                            <span className={`text-lg ${isActive ? 'brightness-0 invert' : ''}`}>{getCategoryIcon(cat.name)}</span>
                        )}
                        
                        <span className={`flex-1 text-sm ${isActive ? 'text-main font-medium' : 'text-text'}`}>{cat.name}</span>
                        {cat.products_count !== undefined && cat.products_count > 0 && (
                            <span className={`text-xs ${isActive ? 'text-main opacity-90' : 'text-firm-gray opacity-75'}`}>{cat.products_count}</span>
                        )}
                    </motion.button>
                    
                    <AnimatePresence>
                        {hasSubcategories && isExpanded && (<motion.div className="ml-2 overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>{renderCategories(cat.subcategories!, level + 1)}</motion.div>)}
                    </AnimatePresence>
                </div>
            )
        })
    }

    return (
        <motion.div className="bg-main rounded-2xl shadow-lg p-4 md:p-6 sticky top-5 border border-gray-100" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg md:text-xl bg-linear-to-r from-firm-orange to-firm-pink bg-clip-text text-transparent">Фильтры</h3>
                {hasActiveFilters() && (<motion.button onClick={onClearFilters} className="text-sm text-firm-orange hover:underline" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Сбросить все</motion.button>)}
            </div>

            <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3 text-base text-text">Категории</h4>
                {loadingCategories ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => (<div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl" />))}
                    </div>
                ) : (
                    <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                        <motion.button whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }} onClick={() => onFilterChange({ category: 'all' })} className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center gap-2 ${filters.category === 'all'  ? 'bg-linear-to-r from-firm-orange to-firm-pink shadow-md' : 'hover:bg-main border-2 border-transparent hover:border-firm-orange/20' }`}>
                            <span className="w-5" />
                            <span className="w-5 h-5 relative">
                                <Image src={allIcon} alt="Все категории" width={20} height={20} className={`object-contain ${filters.category === 'all' ? 'brightness-0 invert' : ''}`} />
                            </span>
                            <span className={`flex-1 text-sm ${filters.category === 'all' ? 'text-main font-medium' : 'text-text'}`}>Все категории</span>
                        </motion.button>
                        {renderCategories(categories)}
                    </div>
                )}
            </motion.div>

            <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} >
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3 text-base text-text">Цена</h4>
                <PriceRange min={availableFilters.priceRange?.min || 0} max={displayMaxPrice} currentMin={Number(priceRange.min)} currentMax={Number(priceRange.max)} onChange={handlePriceChange} />
            </motion.div>

            {availableFilters.techniques && availableFilters.techniques.length > 0 && (
                <motion.div className="mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <h4 className="font-['Montserrat_Alternates'] font-medium mb-3 text-base text-text">Техника вязания</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {availableFilters.techniques.map((tech: { technique: string; count: number }, idx: number) => (
                            <motion.label key={tech.technique} className={`flex items-center justify-between cursor-pointer p-2 rounded-xl transition-all ${filters.technique === tech.technique ? 'bg-linear-to-r from-firm-orange/10 to-firm-pink/10 border border-firm-orange/30' : 'hover:bg-main border-2 border-transparent'}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}  transition={{ delay: idx * 0.03 }} >
                                <span className="flex items-center gap-2">
                                    <div className="relative flex items-center">
                                        <input type="checkbox" checked={filters.technique === tech.technique} onChange={() => handleTechniqueChange(tech.technique)} className="w-5 h-5 appearance-none border-2 border-firm-orange rounded-md bg-main checked:bg-firm-orange checked:border-firm-orange transition-all duration-200 cursor-pointer" />
                                        {filters.technique === tech.technique && (
                                            <svg className="absolute w-4 h-4 text-main left-0.5 top-0.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-sm text-text">{tech.technique}</span>
                                </span>
                                <span className="text-xs text-firm-gray">{tech.count}</span>
                            </motion.label>
                        ))}
                    </div>
                </motion.div>
            )}
            
            {hasActiveFilters() && (
                <motion.div className="mt-4 pt-4 border-t border-gray-200" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <h4 className="font-['Montserrat_Alternates'] font-medium mb-2 text-sm text-text">Активные фильтры:</h4>
                    <div className="flex flex-wrap gap-2">
                        {filters.category && filters.category !== 'all' && (<motion.span className="px-2 py-1 bg-linear-to-r from-firm-orange/10 to-firm-pink/10 text-firm-orange rounded-full text-xs flex items-center gap-1" initial={{ scale: 0 }} animate={{ scale: 1 }} >{filters.category} <button onClick={() => onFilterChange({ category: 'all' })} className="hover:text-firm-pink">✕</button></motion.span>)}
                        {filters.technique && (<motion.span className="px-2 py-1 bg-linear-to-r from-firm-pink/10 to-firm-orange/10 text-firm-pink rounded-full text-xs flex items-center gap-1" initial={{ scale: 0 }} animate={{ scale: 1 }}>{filters.technique}<button onClick={() => onFilterChange({ technique: '' })} className="hover:text-firm-pink">✕</button></motion.span>)}
                        {(filters.minPrice || filters.maxPrice) && (<motion.span className="px-2 py-1 bg-linear-to-r from-firm-orange/10 to-firm-pink/10 text-firm-orange rounded-full text-xs flex items-center gap-1" initial={{ scale: 0 }} animate={{ scale: 1 }} >{Number(filters.minPrice) || 0} - {Number(filters.maxPrice) || displayMaxPrice} ₽<button onClick={() => {setPriceRange({ min: availableFilters.priceRange?.min || 0, max: displayMaxPrice}); onFilterChange({ minPrice: '', maxPrice: '' })}}>✕</button></motion.span>)}
                    </div>
                </motion.div>
            )}
        </motion.div>
    )
}