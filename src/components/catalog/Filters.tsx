'use client'

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import PriceRange from "./PriceRange"
import allIcon from '../../../public/products.svg'

interface FiltersProps {
    filters: any
    availableFilters: any
    onFilterChange: (filters: any) => void
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

export default function Filters({ filters, availableFilters, onFilterChange, onClearFilters }: FiltersProps) {
   const maxPrice = availableFilters.priceRange?.max > 100000 ? 100000 : (availableFilters.priceRange?.max || 10000)

    const [priceRange, setPriceRange] = useState({
        min: filters.minPrice || availableFilters.priceRange?.min || 0,
        max: filters.maxPrice || maxPrice
    })
    const [categories, setCategories] = useState<Category[]>([])
    const [loadingCategories, setLoadingCategories] = useState(true)
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
    const [iconErrors, setIconErrors] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true)
            const response = await fetch('/api/catalog/categories')
            const data = await response.json()
            setCategories(data.categories || [])
            
            if (filters.category && filters.category !== 'all') {
                expandCategoryPath(filters.category, data.categories || [])
            }
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
        const icons: Record<string, string> = {
            'Свитера': '🧶', 'Свитер': '🧶',
            'Шапки': '🧢', 'Шапка': '🧢',
            'Шарфы': '🧣', 'Шарф': '🧣',
            'Варежки': '🧤', 'Варежка': '🧤',
            'Носки': '🧦', 'Носок': '🧦',
            'Пледы': '🛋️', 'Плед': '🛋️',
            'Игрушки': '🧸', 'Игрушка': '🧸',
            'Для дома': '🏠',
            'other': '📦'
        }
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
            
            return (
                <div key={cat.id}>
                    <motion.button
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onFilterChange({ category: cat.name })}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            filters.category === cat.name
                                ? 'bg-firm-orange text-white'
                                : 'hover:bg-[#f1f1f1]'
                        }`}
                        style={{ paddingLeft: `${12 + level * 20}px` }}
                    >
                        {hasSubcategories && (
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategory(cat.id);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 cursor-pointer"
                            >
                                <motion.span
                                    animate={{ rotate: isExpanded ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    ▶
                                </motion.span>
                            </span>
                        )}
                        {!hasSubcategories && <span className="w-5" />}
                        
                        {/* Иконка категории */}
                        {cat.icon_url && !hasIconError ? (
                            <img 
                                src={cat.icon_url} 
                                alt={cat.name}
                                className="w-5 h-5 object-contain"
                                onError={() => handleIconError(cat.name)}
                            />
                        ) : (
                            <span className="text-lg">{getCategoryIcon(cat.name)}</span>
                        )}
                        
                        <span className="flex-1 text-sm">{cat.name}</span>
                        {cat.products_count !== undefined && cat.products_count > 0 && (
                            <span className="text-xs opacity-75">{cat.products_count}</span>
                        )}
                    </motion.button>
                    
                    <AnimatePresence>
                        {hasSubcategories && isExpanded && (
                            <motion.div 
                                className="ml-2 overflow-hidden"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderCategories(cat.subcategories!, level + 1)}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )
        })
    }

    return (
        <motion.div 
            className="bg-white rounded-lg shadow-md p-4 md:p-6 sticky top-5"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-lg md:text-xl">Фильтры</h3>
                {hasActiveFilters() && (
                    <motion.button 
                        onClick={onClearFilters} 
                        className="text-sm text-firm-orange hover:underline"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Сбросить все
                    </motion.button>
                )}
            </div>

            {/* Категории */}
            <motion.div 
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3 text-base">Категории</h4>
                {loadingCategories ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-10 bg-[#f1f1f1] animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                        <motion.button
                            whileHover={{ x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onFilterChange({ category: 'all' })}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                filters.category === 'all'
                                    ? 'bg-firm-orange text-white'
                                    : 'hover:bg-[#f1f1f1]'
                            }`}
                        >
                            <span className="w-5" />
                            <span className="w-5 h-5 relative">
                                <Image 
                                    src={allIcon} 
                                    alt="Все категории"
                                    width={20}
                                    height={20}
                                    className="object-contain"
                                />
                            </span>
                            <span className="flex-1 text-sm">Все категории</span>
                        </motion.button>
                        {renderCategories(categories)}
                    </div>
                )}
            </motion.div>

            {/* Цена */}
            <motion.div 
                className="mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3 text-base">Цена</h4>
                <PriceRange
                    min={availableFilters.priceRange?.min || 0}
                    max={availableFilters.priceRange?.max || 10000}
                    currentMin={priceRange.min}
                    currentMax={priceRange.max}
                    onChange={handlePriceChange}
                />
            </motion.div>

            {/* Техники вязания */}
            {availableFilters.techniques?.length > 0 && (
                <motion.div 
                    className="mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <h4 className="font-['Montserrat_Alternates'] font-medium mb-3 text-base">Техника вязания</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {availableFilters.techniques.map((tech: any, idx: number) => (
                            <motion.label 
                                key={tech.technique} 
                                className="flex items-center justify-between cursor-pointer hover:bg-[#eaeaea] p-2 rounded-lg transition-colors"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <span className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={filters.technique === tech.technique}
                                        onChange={() => handleTechniqueChange(tech.technique)}
                                        className="w-4 h-4 accent-firm-orange"
                                    />
                                    <span className="text-sm">{tech.technique}</span>
                                </span>
                                <span className="text-sm text-gray-500">{tech.count}</span>
                            </motion.label>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Активные фильтры */}
            {hasActiveFilters() && (
                <motion.div 
                    className="mt-4 pt-4 border-t border-gray-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h4 className="font-['Montserrat_Alternates'] font-medium mb-2 text-sm">Активные фильтры:</h4>
                    <div className="flex flex-wrap gap-2">
                        {filters.category && filters.category !== 'all' && (
                            <motion.span 
                                className="px-2 py-1 bg-firm-orange/10 text-firm-orange rounded-full text-xs flex items-center gap-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                {filters.category}
                                <button onClick={() => onFilterChange({ category: 'all' })} className="hover:text-firm-pink">✕</button>
                            </motion.span>
                        )}
                        {filters.technique && (
                            <motion.span 
                                className="px-2 py-1 bg-firm-pink/10 text-firm-pink rounded-full text-xs flex items-center gap-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                {filters.technique}
                                <button onClick={() => onFilterChange({ technique: '' })} className="hover:text-firm-pink">✕</button>
                            </motion.span>
                        )}
                        {(filters.minPrice || filters.maxPrice) && (
                            <motion.span 
                                className="px-2 py-1 bg-firm-orange/10 text-firm-orange rounded-full text-xs flex items-center gap-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                            >
                                {filters.minPrice || 0} - {filters.maxPrice || '∞'} ₽
                                <button onClick={() => {
                                    setPriceRange({ min: availableFilters.priceRange?.min || 0, max: availableFilters.priceRange?.max || 10000 })
                                    onFilterChange({ minPrice: '', maxPrice: '' })
                                }}>✕</button>
                            </motion.span>
                        )}
                    </div>
                </motion.div>
            )}
        </motion.div>
    )
}
