'use client'

import { useState } from 'react'

interface AnimatedButtonProps {
    icon: React.ReactNode
    count: number
    isActive: boolean
    onClick: () => void
    activeColor?: string
}

export function AnimatedButton({ icon, count, isActive, onClick, activeColor = 'text-firm-pink' }: AnimatedButtonProps) {
    const [isAnimating, setIsAnimating] = useState(false)

    const handleClick = () => {
        setIsAnimating(true)
        onClick()
        setTimeout(() => setIsAnimating(false), 300)
    }

    return (
        <button
            onClick={handleClick}
            className={`flex items-center gap-2 transition-all duration-300 ${
                isActive ? activeColor : 'text-gray-500'
            } hover:${activeColor}`}
        >
            <div className={`transition-transform duration-300 ${isAnimating ? 'scale-125' : 'scale-100'}`}>
                {icon}
            </div>
            <span className={`text-gray-400 transition-all duration-300 ${isAnimating ? 'font-semibold' : ''}`}>
                {count}
            </span>
        </button>
    )
}