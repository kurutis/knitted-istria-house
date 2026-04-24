'use client'

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface PriceRangeProps {
    min: number
    max: number
    currentMin: number
    currentMax: number
    onChange: (min: number, max: number) => void
}

export default function PriceRange({ min, max, currentMin, currentMax, onChange }: PriceRangeProps) {
    const displayMin = 0
    const displayMax = max
    
    const [localMin, setLocalMin] = useState(currentMin)
    const [localMax, setLocalMax] = useState(currentMax)

    useEffect(() => {
        setLocalMin(currentMin)
        setLocalMax(currentMax)
    }, [currentMin, currentMax])

    const handleMinChange = (value: number) => {
        const newMin = Math.min(Math.max(value, displayMin), localMax - 100)
        setLocalMin(newMin)
        onChange(newMin, localMax)
    }

    const handleMaxChange = (value: number) => {
        const newMax = Math.max(Math.min(value, displayMax), localMin + 100)
        setLocalMax(newMax)
        onChange(localMin, newMax)
    }

    const range = displayMax - displayMin
    const minPercent = ((localMin - displayMin) / range) * 100
    const maxPercent = ((localMax - displayMin) / range) * 100

    return (
        <div className="w-full">
            <div className="px-2">
                <div className="flex justify-between mb-2 text-sm font-medium">
                    <span className="text-firm-orange">{localMin.toLocaleString()} ₽</span>
                    <span className="text-firm-pink">{localMax.toLocaleString()} ₽</span>
                </div>

                <div className="relative h-2 bg-gray-200 rounded-full my-4">
                    <motion.div 
                        className="absolute h-full bg-gradient-to-r from-firm-orange to-firm-pink rounded-full"
                        style={{
                            left: `${minPercent}%`,
                            width: `${maxPercent - minPercent}%`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${maxPercent - minPercent}%` }}
                        transition={{ duration: 0.2 }}
                    />
                </div>

                <input
                    type="range"
                    min={displayMin}
                    max={displayMax}
                    step="100"
                    value={localMin}
                    onChange={(e) => handleMinChange(Number(e.target.value))}
                    className="w-full h-2 bg-transparent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 md:[&::-webkit-slider-thumb]:w-5 md:[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-firm-orange [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    style={{ marginTop: '-14px' }}
                />

                <input
                    type="range"
                    min={displayMin}
                    max={displayMax}
                    step="100"
                    value={localMax}
                    onChange={(e) => handleMaxChange(Number(e.target.value))}
                    className="w-full h-2 bg-transparent appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 md:[&::-webkit-slider-thumb]:w-5 md:[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-firm-pink [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    style={{ marginTop: '-14px' }}
                />
            </div>

            <div className="flex gap-2 mt-6 px-2">
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">От</label>
                    <input 
                        type="number" 
                        value={localMin} 
                        onChange={(e) => handleMinChange(Number(e.target.value))}
                        min={displayMin} 
                        max={localMax} 
                        step="100"
                        className="w-full p-2 rounded-lg bg-[#f1f1f1] outline-firm-orange text-sm" 
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">До</label>
                    <input 
                        type="number" 
                        value={localMax} 
                        onChange={(e) => handleMaxChange(Number(e.target.value))}
                        min={localMin} 
                        max={displayMax} 
                        step="100"
                        className="w-full p-2 rounded-lg bg-[#f1f1f1] outline-firm-pink text-sm" 
                    />
                </div>
            </div>

            <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                <span>{displayMin.toLocaleString()} ₽</span>
                <span>{displayMax.toLocaleString()} ₽</span>
            </div>

            <motion.button 
                onClick={() => onChange(localMin, localMax)} 
                className="w-full mt-3 py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                Применить
            </motion.button>
        </div>
    )
}