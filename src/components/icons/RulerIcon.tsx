interface RulerIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const RulerIcon = ({ className = "", color = "#D97C8E", size = 24 }: RulerIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M8 3V21M16 3V21M3 8H8M3 12H8M3 16H8M16 8H21M16 12H21M16 16H21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
);