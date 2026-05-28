interface YooKassaIconProps {
    size?: number;
    className?: string;
}

export const YooKassaIcon = ({ size = 40, className = "" }: YooKassaIconProps) => (
    <svg width={size} height={size * 0.714} viewBox="0 0 112 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <g clipPath="url(#clip0_718_2487)">
            <path fillRule="evenodd" clipRule="evenodd" d="M72 80C94.091 80 112 62.0914 112 40C112 17.9086 94.091 0 72 0C54.283 0 39.2564 11.5184 34 27.4753V12H0L19 72H34V52.5247C39.2564 68.4816 54.283 80 72 80ZM72 55C80.2843 55 87 48.2843 87 40C87 31.7157 80.2843 25 72 25C63.7157 25 57 31.7157 57 40C57 48.2843 63.7157 55 72 55Z" fill="#0070F0"/>
        </g>
        <defs>
            <clipPath id="clip0_718_2487">
                <rect width="112" height="80" fill="white"/>
            </clipPath>
        </defs>
    </svg>
);