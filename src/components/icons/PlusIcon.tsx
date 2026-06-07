interface PlusIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const PlusIcon = ({ className = "", color = "white", size = 20 }: PlusIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);