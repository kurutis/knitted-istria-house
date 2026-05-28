interface HomeIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const HomeIcon = ({ className = "", color = "#737682", size = 20 }: HomeIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 308 308" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M38.4211 134.13V296.671C38.4211 300.727 41.1453 304 44.5221 304H264.613C267.99 304 270.714 300.727 270.714 296.671V134.13M4 140.948L150.85 5.50848C153.035 3.49717 156.1 3.49717 158.285 5.50848L304 140.914M214.131 57.4276V21.7013C214.131 17.6446 216.855 14.372 220.232 14.372H245.26C248.637 14.372 251.361 17.6446 251.361 21.7013V92.0288" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);