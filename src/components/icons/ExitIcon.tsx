export const ExitIcon = ({ color = "#D77C7C", className = "" }: { color?: string; className?: string }) => (
  <svg width="34" height="35" viewBox="0 0 34 35" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20.5621 1.25H4.0934C2.52246 1.25 1.25 2.59417 1.25 4.25363V27.8014C1.25 30.8106 3.55928 33.25 6.40791 33.25H19.986" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.16211 16.9707H22.1541" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M30.0957 16.9709L20.4688 21.1272L22.4219 17.5725L22.7529 16.9709L22.4219 16.3684L20.4697 12.8186L30.0957 16.9709Z" fill={color} stroke={color} strokeWidth="2.5"/>
  </svg>
);