import React from 'react';

interface CompanyLogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  showText?: boolean;
}

export function CompanyLogo({ 
  width = 100, 
  height = 100, 
  className = "",
  showText = true 
}: CompanyLogoProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 500 500" 
      width={width} 
      height={height}
      className={className}
    >
      <defs>
        <linearGradient id="convertiq-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e3a8a"/>
          <stop offset="100%" stopColor="#10b981"/>
        </linearGradient>
      </defs>
      <g fill="url(#convertiq-grad)">
        {/* Brain silhouette (side profile) */}
        <path d="M200,50c-60,0-100,60-90,120-20,10-30,40-10,60-20,30,0,60,30,60,0,20,10,40,30,50,10,30,50,40,80,30s50-30,60-60c40-10,60-50,50-90 10-30-10-60-40-70 0-30-20-60-50-70-10-10-30-10-40-10z"/>
        {/* Funnel inside brain */}
        <path d="M235,135c0,15,5,25,20,40v20c-10,10-15,20-15,30 0,5 2,10 5,15h20c3-5 5-10 5-15 0-10-5-20-15-30v-20c15-15 20-25 20-40 0-15-10-25-20-25s-20,10-20,25z"/>
      </g>
      {/* Text label */}
      {showText && (
        <text 
          x="250" 
          y="470" 
          textAnchor="middle" 
          fontFamily="Helvetica, Arial, sans-serif" 
          fontSize="50" 
          fill="currentColor"
          className="fill-zinc-900 dark:fill-white"
        >
          ConvertIQ
        </text>
      )}
    </svg>
  );
}

// Alternative version without text for use in headers/navbars
export function CompanyIcon({ 
  width = 40, 
  height = 40, 
  className = "" 
}: Omit<CompanyLogoProps, 'showText'>) {
  return (
    <CompanyLogo 
      width={width} 
      height={height} 
      className={className} 
      showText={false} 
    />
  );
}