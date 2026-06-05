interface DescriptionIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const DescriptionIcon = ({ className = "", color = "#D97C8E", size = 35 }: DescriptionIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M4 6H20M4 10H20M4 14H14M4 18H10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M16 16L19 19M19 19L22 22M19 19L22 16M19 19L16 22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);