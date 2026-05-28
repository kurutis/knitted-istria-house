interface ClockIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const ClockIcon = ({ className = "", color = "#737682", size = 16 }: ClockIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <path d="M12 6V12L16 14M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)