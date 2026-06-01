interface FilterIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const FilterIcon = ({ color = "#242424", className = "", size = 24 }: FilterIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 6H20M7 12H17M10 18H14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);