interface TagIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const TagIcon = ({ color = "#242424", className = "", size = 24 }: TagIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 8h16v8H4V8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="8.5" cy="12" r="1.5" fill={color} stroke={color} strokeWidth="1"/>
    </svg>
);