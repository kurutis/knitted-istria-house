interface FileTextIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const FileTextIcon = ({ className = "", color = "#D97C8E", size = 35 }: FileTextIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 35 35" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M20.4167 2.91666H8.75C7.683 2.91666 6.65961 3.34033 5.89607 4.10387C5.13253 4.86741 4.70834 5.8908 4.70834 6.95783V28.0417C4.70834 29.1087 5.13253 30.1321 5.89607 30.8956C6.65961 31.6592 7.683 32.0828 8.75 32.0828H26.25C27.317 32.0828 28.3404 31.6592 29.1039 30.8956C29.8675 30.1321 30.2917 29.1087 30.2917 28.0417V10.2083L20.4167 2.91666Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20.4167 2.91666V10.2083H30.2917" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11.6667 16.0417H23.3333" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M11.6667 21.2917H19.5417" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M11.6667 26.5417H16.0417" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
);