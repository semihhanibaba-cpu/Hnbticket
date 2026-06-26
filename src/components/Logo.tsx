import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const dimensions = {
    sm: { h: 'h-8', w: 'w-24', text: 'text-sm' },
    md: { h: 'h-12', w: 'w-36', text: 'text-lg' },
    lg: { h: 'h-16', w: 'w-48', text: 'text-2xl' }
  };

  const current = dimensions[size];

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Exact replica of Hanibaba Logo using inline vector graphics for extreme crispness */}
      <svg 
        viewBox="0 0 300 100" 
        className={`${current.h} aspect-[3/1]`}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Deep Green Rounded Rect base */}
        <rect width="300" height="100" rx="20" fill="#005E33" />
        
        {/* Inner white rounded rectangle outline */}
        <rect 
          x="12" 
          y="12" 
          width="276" 
          height="76" 
          rx="12" 
          stroke="white" 
          strokeWidth="4.5" 
        />
        
        {/* HANIBABA stylized white typography */}
        <text
          x="150"
          y="62"
          fill="white"
          fontSize="35"
          fontWeight="900"
          fontFamily="'Inter', 'Space Grotesk', system-ui, sans-serif"
          textAnchor="middle"
          letterSpacing="4"
        >
          HANİBABA
        </text>

        {/* Small detail square dot over the letter 'İ' to match user's custom design */}
        <rect x="156.5" y="24" width="5" height="5" fill="white" />
      </svg>
    </div>
  );
}
