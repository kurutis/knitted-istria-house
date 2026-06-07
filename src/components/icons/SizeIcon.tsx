interface SizeIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const SizeIcon = ({ className = "", color = "#D97C8E", size = 35 }: SizeIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 6H21M6 3V21M8 21H16M8 3H16M18 6V18M6 6V18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M21 3L16 8M21 3L18 3M21 3V6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 21L8 16M3 21L6 21M3 21V18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);