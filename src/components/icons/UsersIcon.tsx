interface UsersIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const UsersIcon = ({ color = "#242424", className = "", size = 24 }: UsersIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 20v-2c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);