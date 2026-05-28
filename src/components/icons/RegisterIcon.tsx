interface RegisterIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const RegisterIcon = ({ className = "", color = "white", size = 16 }: RegisterIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
    >
        <path d="M12 4V20M4 12H20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)