interface ImageIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const ImageIcon = ({ className = "", color = "#D97C8E", size = 24 }: ImageIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="2" y="3" width="20" height="18" rx="2" ry="2" stroke={color} strokeWidth="2" fill="none"/>
        <circle cx="8.5" cy="8.5" r="2.5" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M21 15L16 10L5 21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);