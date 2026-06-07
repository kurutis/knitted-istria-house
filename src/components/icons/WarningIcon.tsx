interface WarningIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const WarningIcon = ({ className = "", color = "#F4A67F", size = 24 }: WarningIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2L2 19H22L12 2Z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
        <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="17" r="1" fill={color}/>
    </svg>
);