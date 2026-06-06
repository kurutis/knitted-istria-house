interface AwardIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const AwardIcon = ({ className = "", color = "#F4A67F", size = 35 }: AwardIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 35 35" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M17.5 21.875C23.0969 21.875 27.5625 17.4094 27.5625 11.8125C27.5625 6.21563 23.0969 1.75 17.5 1.75C11.9031 1.75 7.4375 6.21563 7.4375 11.8125C7.4375 17.4094 11.9031 21.875 17.5 21.875Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11.375 19.9062L10.0625 31.5L17.5 26.6875L24.9375 31.5L23.625 19.9062" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17.5 15.75C19.5711 15.75 21.25 14.0711 21.25 12C21.25 9.92893 19.5711 8.25 17.5 8.25C15.4289 8.25 13.75 9.92893 13.75 12C13.75 14.0711 15.4289 15.75 17.5 15.75Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);