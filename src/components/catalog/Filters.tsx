'use client'

import React, { useEffect, useState } from "react"
import PriceRange from "./PriceRange"

interface FiltersProps{
    filters: any
    availableFilters: any
    onFilterChange: (filters: any) => void
    onClearFilters: () => void
}

export default function Filters({filters, availableFilters, onFilterChange, onClearFilters} : FiltersProps){
    const [priceRange, setPriceRange] = useState({min: filters.minPrice || availableFilters.priceRange?.min || 0, max: filters.maxPrice || availableFilters.priceRange?.max || 10000})
    const [categories, setCategories] = useState([])
    const [loadingCategories, setLoadingCategories] = useState(true)

    useEffect(() => {fetchCategories()}, [])
    
    const fetchCategories = async () => {
        try{
            setLoadingCategories(true)
            const response = await fetch('/api/catalog/categories')
            const data = await response.json()
            setCategories(data.categories || [])
        }catch(error){
            console.error('Error fetching categories:', error)
        }finally{
            setLoadingCategories(false)
        }
    }

    const handlePriceChange = (min: number, max: number) => {
        setPriceRange({min, max})
        onFilterChange({minPrice: min, maxPrice: max})
    }

    const handleTechniqueChange = (technique: string) => {
        const newTechnique = filters.technique === technique ? '' : technique
        onFilterChange({technique: newTechnique})
    }

    const handleAvailabilityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFilterChange({inStock: e.target.checked ? 'true' : ''})
    }

    const hasActiveFilters = () => {
        return filters.category !== 'all' || filters.technique || filters.minPrice || filters.maxPrice || filters.inStock}

    const getCategoryIcon = (categoryName: string) => {
        const icons = { 'Свитера': '🧶', 'Свитер': '🧶', 'Шапки': '🧢', 'Шапка': '🧢', 'Шарфы': '🧣', 'Шарф': '🧣', 'Варежки': '🧤', 'Варежки': '🧤', 'Носки': '🧦', 'Носки': '🧦', 'Пледы': '🛋️', 'Плед': '🛋️', 'Игрушки': '🧸', 'Игрушка': '🧸',  'other': '📦' }
        return icons[categoryName] || '📦'
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-5">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-['Montserrat_Alternates'] font-semibold text-xl">Фильтры</h3>
                {hasActiveFilters() && (
                    <button onClick={onClearFilters} className="text-sm text-firm-orange hover:underline">Сбросить все</button>)}
            </div>

            <div className="mb-8">
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3">Категории</h4>
                {loadingCategories ? ( 
                    <div className="space-y-2">{[1, 2, 3, 4].map(i => (<div key={i} className="h-10 bg-[#eaeaea] animate-pulse rounded-lg" />))}</div>
                ) : (
                    <div className="space-y-2">
                        {categories.map((cat: any) => (
                            <button key={cat.name} onClick={() => onFilterChange({ category: cat.name })} className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${filters.category === cat.name ? 'bg-firm-orange text-white' : 'hover:bg-[#eaeaea]'}`}>
                                <span className="text-lg">{getCategoryIcon(cat.name)}</span>
                                <span className="flex-1">{cat.name === 'all' ? 'Все категории' : cat.name}</span>
                                {cat.count !== undefined && (<span className="text-sm opacity-75">{cat.count}</span>)} 
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-8">
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3">Цена</h4>
                <PriceRange min={availableFilters.priceRange?.min || 0} max={availableFilters.priceRange?.max || 10000} currentMin={priceRange.min} currentMax={priceRange.max} onChange={handlePriceChange} />
            </div>

            {availableFilters.techniques?.length > 0 && (
                <div className="mb-8">
                    <h4 className="font-['Montserrat_Alternates'] font-medium mb-3">Техника вязания</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {availableFilters.techniques.map((tech: any) => (
                            <label key={tech.technique} className="flex items-center justify-between cursor-pointer hover:bg-[#eaeaea] p-2 rounded-lg transition-colors">
                                <span className="flex items-center gap-2">
                                    <input type="checkbox" checked={filters.technique === tech.technique} onChange={() => handleTechniqueChange(tech.technique)} className="w-4 h-4 accent-firm-orange" />
                                    <span className="text-sm">{tech.technique}</span> 
                                </span>
                                <span className="text-sm text-gray-500">{tech.count}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="mb-8">
                <h4 className="font-['Montserrat_Alternates'] font-medium mb-3">Наличие</h4>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#eaeaea] p-2 rounded-lg transition-colors">
                    <input type="checkbox" checked={filters.inStock === 'true'} onChange={handleAvailabilityChange} className="w-4 h-4 accent-firm-orange" />
                    <span className="text-sm">Товары в наличии</span>
                </label>
            </div>

            {hasActiveFilters() && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-['Montserrat_Alternates'] font-medium mb-2 text-sm">Активные фильтры:</h4>
                    <div className="flex flex-wrap gap-2">
                        {filters.category && filters.category !== 'all' && (<span className="px-2 py-1 bg-firm-orange bg-opacity-10 text-white rounded-full text-xs flex items-center gap-1">{filters.category} <button onClick={() => onFilterChange({ category: 'all' })} className="hover:text-firm-pink">✕</button></span>)}
                        {filters.technique && ( <span className="px-2 py-1 bg-firm-pink bg-opacity-10 text-white rounded-full text-xs flex items-center gap-1">{filters.technique}<button onClick={() => onFilterChange({ technique: '' })} className="hover:text-firm-orange">✕</button></span>)}
                        {(filters.minPrice || filters.maxPrice) && (<span className="px-2 py-1 bg-firm-orange bg-opacity-10 text-white rounded-full text-xs flex items-center gap-1">{filters.minPrice || 0} - {filters.maxPrice || '∞'} ₽<button  onClick={() => {setPriceRange({ min: availableFilters.priceRange?.min || 0, max: availableFilters.priceRange?.max || 10000 }); onFilterChange({ minPrice: '', maxPrice: '' })}} className="hover:text-firm-pink"> ✕ </button></span>)}
                        {filters.inStock && (<span className="px-2 py-1 bg-firm-pink bg-opacity-10 text-white rounded-full text-xs flex items-center gap-1">В наличии<button onClick={() => onFilterChange({ inStock: '' })} className="hover:text-firm-orange">✕</button></span>)}
                    </div>
                </div>
            )}
        </div>
    )
}