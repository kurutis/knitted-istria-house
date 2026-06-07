// components/icons/UserCheckIcon.tsx
interface UserCheckIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const UserCheckIcon = ({ className = "", color = "#F4A67F", size = 35 }: UserCheckIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 35 35" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M24.7917 20.4167C27.8037 20.4167 30.2492 22.3161 31.1395 24.9526C31.4958 25.9774 31.5211 27.0887 31.2127 28.1277C30.9043 29.1667 30.279 30.0852 29.4312 30.7649C28.5833 31.4447 27.5564 31.8522 26.4774 31.9321C25.3983 32.012 24.3193 31.7611 23.3746 31.2136" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21.5833 16.0417C24.3242 16.0417 26.5417 13.8242 26.5417 11.0833C26.5417 8.34241 24.3242 6.125 21.5833 6.125" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.91666 28.6481C2.91666 24.9384 5.92748 21.9276 9.63716 21.9276H16.0437C17.6511 21.9276 19.191 22.5522 20.3564 23.6692" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12.8333 2.91666C9.49049 2.91666 6.77083 5.63632 6.77083 8.97916C6.77083 12.322 9.49049 15.0417 12.8333 15.0417C16.1762 15.0417 18.8958 12.322 18.8958 8.97916" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M28.2917 11.6667L30.625 14L35 8.16666" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);