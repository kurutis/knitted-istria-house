interface LaunchIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const LaunchIcon = ({ className = "", color = "white", size = 14 }: LaunchIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <path d="M18 10L21 7M21 7L18 4M21 7H15C12.8 7 11 8.8 11 11V20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M3 11L7 10L6 14L3 11Z" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)