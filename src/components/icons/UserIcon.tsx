interface UserIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const UserIcon = ({ className = "", color = "#737682", size = 14 }: UserIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)