interface BriefcaseIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const BriefcaseIcon = ({ color = "#242424", className = "", size = 24 }: BriefcaseIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M16 21V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v16" stroke={color} strokeWidth="2" fill="none"/>
    </svg>
);