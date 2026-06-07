interface AlertIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const AlertIcon = ({ className = "", color = "#D77C7C", size = 24 }: AlertIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1" fill={color}/>
    </svg>
);