interface ChatIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const ChatIcon = ({ className = "", color = "#242424", size = 36 }: ChatIconProps) => (
    <svg width={size} height={size} viewBox="0 0 37 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 9.62622 19.897)" fill={color}/>
        <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 16.9839 19.897)" fill={color}/>
        <circle cx="2.32349" cy="2.32349" r="2.32349" transform="matrix(1 0 0 -1 24.729 19.897)" fill={color}/>
        <path d="M19.6262 32.0648C28.4628 32.0648 35.6262 25.1667 35.6262 16.6574C35.6262 8.14813 28.4628 1.25 19.6262 1.25C10.7897 1.25 3.62622 8.14813 3.62622 16.6574C3.62622 20.4012 5.01285 23.8331 7.31853 26.5029C6.91254 29.643 5.86044 31.0025 3.62622 33.25C6.96012 32.6917 8.71604 32.0376 11.6262 30.0036C13.9796 31.3145 16.7119 32.0648 19.6262 32.0648Z" stroke={color} strokeWidth="2.5"/>
    </svg>
);