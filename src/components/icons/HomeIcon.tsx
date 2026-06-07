interface HomeIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const HomeIcon = ({ className = "", color = "#D97C8E", size = 35 }: HomeIconProps) => (
    <svg width={size} height={size} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4.92158 15.1305V32.4682C4.92158 32.9009 5.21216 33.25 5.57236 33.25H29.0487C29.4089 33.25 29.6995 32.9009 29.6995 32.4682V15.1305M1.25 15.8578L16.914 1.4109C17.1471 1.19637 17.474 1.19637 17.7071 1.4109L33.25 15.8541M23.6639 6.94894V3.13814C23.6639 2.70543 23.9545 2.35635 24.3147 2.35635H26.9844C27.3446 2.35635 27.6352 2.70543 27.6352 3.13814V10.6397" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);