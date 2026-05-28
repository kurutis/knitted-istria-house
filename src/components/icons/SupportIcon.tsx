interface SupportIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const SupportIcon = ({ className = "", color = "white", size = 24 }: SupportIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M3 21L5.5 19.5M21 3L18.5 4.5M18.5 4.5L15 9M18.5 4.5L21 3M18.5 4.5L21 7" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
        <path d="M12 8V12M12 16H12.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
);