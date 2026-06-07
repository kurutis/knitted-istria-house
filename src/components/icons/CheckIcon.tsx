interface CheckIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const CheckIcon = ({ className = "", color = "white", size = 16 }: CheckIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)