'use client'

import { useEffect, useState } from "react"

interface PriceRangeProps {
    min: number
    max: number
    currentMin: number
    currentMax: number
    onChange: (min: number, max: number) => void
}

export default function PriceRange({min, max, currentMin, currentMax, onChange}: PriceRangeProps) {
    const [localMin, setLocalMin] = useState(currentMin)
    const [localMax, setLocalMax] = useState(currentMax)

    useEffect(() => {
        setLocalMin(currentMin)
        setLocalMax(currentMax)
    }, [currentMin, currentMax])

    const handleMinChange = (value: number) => {
        const newMin = Math.min(value, localMax - 100)
        setLocalMin(newMin)
    }
    const handleMaxChange = (value: number) => {
        const newMax = Math.max(value, localMin + 100)
        setLocalMax(newMax)
    }
    const handleApply = () => {
        onChange(localMin, localMax)
    }

    return (
        <div>
            <div className="flex gap-2 mb-4">
                <div className="flex-1">
                    <label className="text-xs text-gray-500">От</label>
                    <input type="number" value={localMin} onChange={(e) => handleMinChange(Number(e.target.value))} min={min} max={localMax} className="w-full p-2 rounded-lg bg-[#eaeaea] outline-firm-orange text-sm" />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-gray-500">До</label>
                    <input type="number" value={localMax} onChange={(e) => handleMaxChange(Number(e.target.value))} min={localMin} max={max} className="w-full p-2 rounded-lg bg-[#EAEAEA] outline-firm-pink text-sm" />
                </div>
            </div>
            <div className="relative h-2 bg-[#EAEAEA] rounded-full mb-4">
                <div className="absolute h-2 bg-linear-to-r from-firm-orange to-firm-pink rounded-full" style={{left: `${((localMin - min) / (max - min)) * 100}%`,  width: `${((localMax - localMin) / (max - min)) * 100}%`}} />
            </div>
            <button onClick={handleApply} className="w-full py-2 bg-firm-orange text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm">Применить</button>
        </div>
    )
}