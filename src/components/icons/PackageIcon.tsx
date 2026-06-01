interface PackageIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const PackageIcon = ({ color = "#242424", className = "", size = 24 }: PackageIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M20 7L12 12L4 7M12 22V12M3 5L12 2L21 5L12 8L3 5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);