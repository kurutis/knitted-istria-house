// src/components/icons/PaymentIcons.tsx
'use client';

interface IconProps {
    size?: number;
    color?: string;
    className?: string;
}

export const CreditCardIcon = ({ size = 24, color = "#737682", className = "" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 10H21M7 15H11M7 18H9M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.0799 21 6.51984 20.782 6.09202C20.5903 5.7157 20.2843 5.40974 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.7157 5.40974 3.40974 5.7157 3.21799 6.09202C3 6.51984 3 7.0799 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40974 20.2843 3.7157 20.5903 4.09202 20.782C4.51984 21 5.0799 21 6.2 21Z" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

export const SmartphoneIcon = ({ size = 24, color = "#737682", className = "" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 18H12.01M7 2H17C18.1046 2 19 2.89543 19 4V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V4C5 2.89543 5.89543 2 7 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

export const BanknotesIcon = ({ size = 24, color = "#737682", className = "" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M2 8C2 6.89543 2.89543 6 4 6H20C21.1046 6 22 6.89543 22 8V16C22 17.1046 21.1046 18 20 18H4C2.89543 18 2 17.1046 2 16V8Z" stroke={color} strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
        <path d="M18 9H18.01M6 15H6.01" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

export const BuildingIcon = ({ size = 24, color = "#737682", className = "" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M4 21H20M4 21V7C4 5.89543 4.89543 5 6 5H12M4 21H3M20 21H21M20 21V11C20 9.89543 19.1046 9 18 9H12M12 5V3M12 5H9M12 5H15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);