interface PriceIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const PriceIcon = ({ color = "#242424", className = "", size = 24 }: PriceIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <path d="M12 6v12M8 10h8M8 14h8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
);