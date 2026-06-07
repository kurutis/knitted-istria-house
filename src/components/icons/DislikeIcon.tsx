interface DislikeIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const DislikeIcon = ({ className = "", color = "#D77C7C", size = 24 }: DislikeIconProps) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M23.2002 30.75C27.3399 30.7499 30.7498 27.209 30.75 22.4092C30.75 19.499 29.5561 16.7685 27.25 13.6934C24.9278 10.5969 21.584 7.28571 17.4414 3.19141L17.4395 3.18945L16 1.76172L14.5605 3.18945L14.5586 3.19141C10.416 7.28571 7.07223 10.5969 4.75 13.6934C2.44386 16.7685 1.25 19.499 1.25 22.4092C1.25022 27.209 4.6601 30.7499 8.7998 30.75C11.164 30.75 13.487 29.5431 15.0176 27.5996L16 26.3525L16.9824 27.5996C18.513 29.5431 20.836 30.75 23.2002 30.75Z" stroke={color} strokeWidth="2.5"/>
    </svg>
);