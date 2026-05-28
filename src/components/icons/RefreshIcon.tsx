interface RefreshIconProps {
    className?: string;
    color?: string;
    size?: number;
}

export const RefreshIcon = ({ className = "", color = "#6B7280", size = 18 }: RefreshIconProps) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M4 4V9H4.582M4.582 9C5.24585 7.35813 6.43541 5.98206 7.96596 5.08986C9.4965 4.19765 11.2768 3.84395 13.0229 4.08179C14.769 4.31963 16.3621 5.13533 17.5473 6.39484C18.7325 7.65435 19.4382 9.27983 19.55 11M4.582 9H9M20 20V15H19.418M19.418 15C18.7542 16.6419 17.5646 18.0179 16.034 18.9101C14.5035 19.8023 12.7232 20.156 10.9771 19.9182C9.231 19.6804 7.6379 18.8647 6.45269 17.6052C5.26748 16.3456 4.5618 14.7202 4.45 13M19.418 15H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);