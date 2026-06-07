// components/icons/CreditCardIcon.tsx
interface CreditCardIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const CreditCardIcon = ({ className = "", color = "#D97C8E", size = 35 }: CreditCardIconProps) => (
    <svg width={size} height={size} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M2.91666 10.2083C2.91666 8.66286 3.53125 7.18074 4.62503 6.08696C5.71881 4.99318 7.20093 4.375 8.74635 4.375H26.2537C27.7991 4.375 29.2812 4.99318 30.375 6.08696C31.4688 7.18074 32.0833 8.66286 32.0833 10.2083V24.7917C32.0833 26.3371 31.4688 27.8192 30.375 28.913C29.2812 30.0068 27.7991 30.625 26.2537 30.625H8.74635C7.20093 30.625 5.71881 30.0068 4.62503 28.913C3.53125 27.8192 2.91666 26.3371 2.91666 24.7917V10.2083Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.91666 14.5833H32.0833" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M9.91666 22.1667H16.0417" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M20.125 22.1667H25.0833" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
);