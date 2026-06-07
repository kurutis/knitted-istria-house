interface CookieIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const CookieIcon = ({ className = "", color = "#F4A67F", size = 35 }: CookieIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 35 35" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M17.5 32.0833C25.556 32.0833 32.0833 25.556 32.0833 17.5C32.0833 9.444 25.556 2.91666 17.5 2.91666C9.444 2.91666 2.91666 9.444 2.91666 17.5C2.91666 25.556 9.444 32.0833 17.5 32.0833Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="11.6667" cy="14.5833" r="1.75" fill={color}/>
        <circle cx="21" cy="11.6667" r="1.75" fill={color}/>
        <circle cx="24.5" cy="20.4167" r="1.75" fill={color}/>
        <circle cx="17.5" cy="24.5" r="1.75" fill={color}/>
        <circle cx="11.6667" cy="22.1667" r="1.16667" fill={color}/>
    </svg>
);