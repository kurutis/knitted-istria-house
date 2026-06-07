interface ShieldCheckIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const ShieldCheckIcon = ({ className = "", color = "#94D06C", size = 35 }: ShieldCheckIconProps) => (
    <svg width={size} height={size} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M17.5 32.0833C17.5 32.0833 29.1667 27.7083 29.1667 17.5V5.83333L17.5 2.91666L5.83333 5.83333V17.5C5.83333 27.7083 17.5 32.0833 17.5 32.0833Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15.1667 17.5L18.0833 20.4167L24.5 12.8333" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.5 15.1667L14.5833 19.25" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);