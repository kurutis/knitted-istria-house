interface CameraIconProps {
    color?: string;
    className?: string;
    size?: number;
}

export const CameraIcon = ({ color = "#242424", className = "", size = 24 }: CameraIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 9C3 8.20435 3.31607 7.44129 3.87868 6.87868C4.44129 6.31607 5.20435 6 6 6H8L10 3H14L16 6H18C18.7956 6 19.5587 6.31607 20.1213 6.87868C20.6839 7.44129 21 8.20435 21 9V18C21 18.7956 20.6839 19.5587 20.1213 20.1213C19.5587 20.6839 18.7956 21 18 21H6C5.20435 21 4.44129 20.6839 3.87868 20.1213C3.31607 19.5587 3 18.7956 3 18V9Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);