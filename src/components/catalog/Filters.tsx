'use client'

import React, { useEffect, useState } from "react"
import PriceRange from "./PriceRange"

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

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true)
            const response = await fetch('/api/catalog/categories')
            const data = await response.json()
            setCategories(data.categories || [])
            
            // Автоматически разворачиваем категории, которые содержат выбранную подкатегорию
            if (filters.category && filters.category !== 'all') {
                expandCategoryPath(filters.category, data.categories || [])
            }
        } catch (error) {
            console.error('Error fetching categories:', error)
        } finally {
            setLoadingCategories(false)
        }
    }

    // Найти и развернуть путь к выбранной категории
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

    const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({ inStock: e.target.checked ? 'true' : '' })
    }

    const hasActiveFilters = () => {
        return filters.category !== 'all' ||
            filters.technique ||
            filters.minPrice ||
            filters.maxPrice ||
            filters.inStock
    }

    const getCategoryIcon = (categoryName: string) => {
        const icons: Record<string, string> = {
            'Одежда': '👕',
            'Свитера': '🧶', 'Свитер': '🧶',
            'Шапки': '🧢', 'Шапка': '🧢',
            'Шарфы': '🧣', 'Шарф': '🧣',
            'Варежки': '🧤',
            'Носки': '🧦',
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

    // Рекурсивная функция для рендеринга категорий с подкатегориями
    const renderCategories = (categoriesList: Category[], level: number = 0) => {
        return categoriesList.map((cat) => {
            const hasSubcategories = cat.subcategories && cat.subcategories.length > 0
            const isExpanded = expandedCategories.has(cat.id)
            
            return (
                <div key={cat.id}>
                    <button
                        onClick={() => onFilterChange({ category: cat.name })}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                            filters.category === cat.name
                                ? 'bg-firm-orange text-white'
                                : 'hover:bg-[#eaeaea]'
                        }`}
                        style={{ paddingLeft: `${12 + level * 20}px` }}
                    >
                        {/* Кнопка сворачивания/разворачивания */}
                        {hasSubcategories && (
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCategory(cat.id);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 cursor-pointer"
                            >
                                {isExpanded ? '▼' : '▶'}
                            </span>
                        )}
                        {!hasSubcategories && <span className="w-5" />}
                        
                        <span className="text-lg">{getCategoryIcon(cat.name)}</span>
                        <span className="flex-1">{cat.name}</span>
                        {cat.products_count !== undefined && cat.products_count > 0 && (
                            <span className="text-sm opacity-75">{cat.products_count}</span>
                        )}
                    </button>
                    
                    {/* Подкатегории */}
                    {hasSubcategories && isExpanded && (
                        <div className="ml-2">
                            {renderCategories(cat.subcategories!, level + 1)}
                        </div>
                    )}
                </div>
            )
        })
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-5">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl">Фильтры</h3>
                {hasActiveFilters() && (
                    <button onClick={onClearFilters} className="text-sm text-firm-orange hover:underline">
                        Сбросить все
                    </button>
                )}
            </div>

            {/* Категории с подкатегориями */}
            <div className="mb-8">
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3">Категории</h4>
                {loadingCategories ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-10 bg-[#f1f1f1] animate-pulse rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {/* Кнопка "Все категории" */}
                        <button
                            onClick={() => onFilterChange({ category: 'all' })}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                filters.category === 'all'
                                    ? 'bg-firm-orange text-white'
                                    : 'hover:bg-[#f1f1f1]'
                            }`}
                        >
                            <span className="w-5" />
                            <span className="text-lg">📋</span>
                            <span className="flex-1">Все категории</span>
                        </button>
                        {renderCategories(categories)}
                    </div>
                )}
            </div>

            {/* Цена */}
            <div className="mb-8">
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3">Цена</h4>
                <div className="w-full max-w-full">
                    <PriceRange
                        min={availableFilters.priceRange?.min || 0}
                        max={availableFilters.priceRange?.max || 10000}
                        currentMin={priceRange.min}
                        currentMax={priceRange.max}
                        onChange={handlePriceChange}
                    />
                </div>
            </div>

            {/* Техники вязания */}
            {availableFilters.techniques?.length > 0 && (
                <div className="mb-8">
                    <h4 className="font-['Montserrat_Alternates'] font-medium mb-3">Техника вязания</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {availableFilters.techniques.map((tech: any) => (
                            <label key={tech.technique} className="flex items-center justify-between cursor-pointer hover:bg-[#eaeaea] p-2 rounded-lg transition-colors">
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
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Наличие */}
            <div className="mb-8">
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3">Наличие</h4>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#eaeaea] p-2 rounded-lg transition-colors">
                    <input
                        type="checkbox"
                        checked={filters.inStock === 'true'}
                        onChange={handleAvailabilityChange}
                        className="w-4 h-4 accent-firm-orange"
                    />
                    <span className="text-sm">Товары в наличии</span>
                </label>
            </div>

            {/* Активные фильтры */}
            {hasActiveFilters() && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-['Montserrat_Alternates'] font-medium mb-2 text-sm">Активные фильтры:</h4>
                    <div className="flex flex-wrap gap-2">
                        {filters.category && filters.category !== 'all' && (
                            <span className="px-2 py-1 bg-firm-orange bg-opacity-10 text-white hover:cursor-pointer rounded-full text-xs flex items-center gap-1">
                                {filters.category}
                                <button onClick={() => onFilterChange({ category: 'all' })} className="hover:text-firm-pink">✕</button>
                            </span>
                        )}
                        {filters.technique && (
                            <span className="px-2 py-1 hover:cursor-pointer bg-firm-pink bg-opacity-10 text-white rounded-full text-xs flex items-center gap-1">
                                {filters.technique}
                                <button onClick={() => onFilterChange({ technique: '' })} className="hover:text-white">✕</button>
                            </span>
                        )}
                        {(filters.minPrice || filters.maxPrice) && (
                            <span className="px-2 py-1 hover:cursor-pointer bg-firm-orange bg-opacity-10 text-white rounded-full text-xs flex items-center gap-1">
                                {filters.minPrice || 0} - {filters.maxPrice || '∞'} ₽
                                <button onClick={() => {
                                    setPriceRange({ min: availableFilters.priceRange?.min || 0, max: availableFilters.priceRange?.max || 10000 })
                                    onFilterChange({ minPrice: '', maxPrice: '' })
                                }} className="hover:text-white">✕</button>
                            </span>
                        )}
                        {filters.inStock && (
                            <span className="px-2 py-1 hover:cursor-pointer bg-firm-pink bg-opacity-10 text-white rounded-full text-xs flex items-center gap-1">
                                В наличии
                                <button onClick={() => onFilterChange({ inStock: '' })} className="hover:text-white">✕</button>
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}