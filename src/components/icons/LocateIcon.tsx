interface LocateIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const LocateIcon = ({ color = "#D97C8E", className = "", size = 35 }: LocateIconProps) => (
    <svg width={size} height={size} viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M32.7215 10.0737C34.8347 15.4119 30.3121 20.621 24.6563 27.1211C22.6962 29.3763 20.7361 31.2443 19.0414 32.7099C18.2247 33.4237 16.7545 33.4313 15.9276 32.7251C14.2023 31.2747 12.2115 29.4295 10.2106 27.197C4.38124 20.697 -0.35576 15.4195 1.76771 10.0281C3.46241 5.70742 9.58787 1.23485 17.2753 1.25004C24.983 1.26523 31.0166 5.77576 32.7215 10.0737Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17.5609 19.52C22.2971 19.52 26.1365 16.6642 26.1365 13.1415C26.1365 9.6187 22.2971 6.76294 17.5609 6.76294C12.8248 6.76294 8.98546 9.6187 8.98546 13.1415C8.98546 16.6642 12.8248 19.52 17.5609 19.52Z" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);