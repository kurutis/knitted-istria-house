interface InfoIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const InfoIcon = ({ className = "", color = "#D97C8E", size = 24 }: InfoIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <line x1="12" y1="12" x2="12" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="8" r="1" fill={color}/>
    </svg>
);