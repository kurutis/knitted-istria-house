interface ArrowLeftIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const ArrowLeftIcon = ({ className = "", color = "#D97C8E", size = 20 }: ArrowLeftIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M10 19L3 12M3 12L10 5M3 12H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)