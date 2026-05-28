interface SupportIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const SupportIcon = ({ className = "", color = "white", size = 24 }: SupportIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M18 18.72C19.0879 17.9362 19.9318 16.8602 20.4343 15.6079C20.9368 14.3555 21.0759 12.9803 20.8365 11.6499C20.597 10.3195 19.9892 9.08779 19.0902 8.09898C18.1913 7.11016 17.0406 6.40643 15.7589 6.0626C14.4772 5.71877 13.1206 5.74967 11.8546 6.15241C10.5887 6.55516 9.46809 7.31243 8.61459 8.34079C7.76109 9.36915 7.2108 10.6259 7.02864 11.9606C6.84647 13.2953 7.03967 14.6533 7.58594 15.88L7 21L12.2 19.2C12.86 19.45 13.5658 19.5765 14.2776 19.5736C15.5035 19.5699 16.6986 19.2547 17.75 18.66L18 18.72Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 11H12.01M15 11H15.01M9 11H9.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
);