interface TBankIconProps {
    size?: number;
    className?: string;
}

export const TBankIcon = ({ size = 40, className = "" }: TBankIconProps) => (
    <svg width={size} height={size * 0.962} viewBox="0 0 79 76" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M0 0H79V36.8733C79 47.0217 73.5664 56.3999 64.7462 61.4745L39.5003 76L14.2539 61.4745C5.43348 56.3999 9.05441e-06 47.0217 9.05441e-06 36.8733L0 0Z" fill="#FFDD2D"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M21.7931 19V31.2352C23.4723 29.3458 26.5253 28.0673 30.0162 28.0673H33.8096V42.2905C33.8096 46.0745 32.7776 49.7797 31.2467 51.6016H47.7476C46.2199 49.7778 45.1905 46.0772 45.1905 42.2978V28.0673H48.9841C52.4748 28.0673 55.5277 29.3458 57.2069 31.2352V19H21.7931Z" fill="#333333"/>
    </svg>
);