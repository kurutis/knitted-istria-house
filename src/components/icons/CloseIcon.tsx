interface CloseIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const CloseIcon = ({ className = "", color = "white", size = 14 }: CloseIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);