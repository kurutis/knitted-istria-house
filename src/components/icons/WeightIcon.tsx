interface WeightIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const WeightIcon = ({ className = "", color = "#D97C8E", size = 24 }: WeightIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2Z" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M12 9V13M12 17V18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 8H20L18 20H6L4 8Z" stroke={color} strokeWidth="2" fill="none"/>
        <circle cx="12" cy="15" r="1" fill={color}/>
    </svg>
);