interface ErrorCircleIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const ErrorCircleIcon = ({ className = "", color = "#EF4444", size = 48 }: ErrorCircleIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M12 8V12M12 16H12.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
);