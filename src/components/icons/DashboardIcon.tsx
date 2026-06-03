interface DashboardIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const DashboardIcon = ({ color = "#242424", className = "", size = 24 }: DashboardIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="2"/>
        <rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="2"/>
        <rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="2"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="2"/>
    </svg>
);