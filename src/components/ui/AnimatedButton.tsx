'use client'

interface AnimatedButtonProps {
    icon: React.ReactNode
    count: number
    isActive: boolean
    onClick: () => void
    activeColor?: string
}

export function AnimatedButton({ icon, count, isActive, onClick, activeColor = 'text-firm-pink' }: AnimatedButtonProps) {
    return (
        <button
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`flex items-center gap-2 transition-all duration-300 cursor-pointer ${
                isActive ? activeColor : 'text-firm-gray'
            } hover:${activeColor}`}
            type="button"
        >
            {icon}
            <span className="text-firm-gray text-sm">{count}</span>
        </button>
    )
}