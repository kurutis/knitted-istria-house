interface LockIconProps {
  className?: string;
  color?: string;
  size?: number;
}

export const LockIcon = ({ className = "", color = "#D4D4D4", size = 64 }: LockIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 16V16.01M7 11H17V18H7V11Z" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);