interface ChatIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const ChatIcon = ({ className = "", color = "#9CA3AF", size = 48 }: ChatIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 13.2 20.5 14.2 19.7 15.1C18.9 15.9 17.8 16.5 16.5 16.8C16.1 16.9 15.7 16.9 15.2 17L13.5 17.5C13 17.6 12.6 17.2 12.7 16.7C12.7 16.6 12.8 16.5 12.8 16.5M3 12C3 13.2 3.5 14.2 4.3 15.1C5.1 15.9 6.2 16.5 7.5 16.8M7.5 16.8L5 19M7.5 16.8L9 14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);