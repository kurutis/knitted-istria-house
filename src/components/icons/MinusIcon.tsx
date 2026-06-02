interface MinusIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const MinusIcon = ({ color = "#242424", className = "", size = 24 }: MinusIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);