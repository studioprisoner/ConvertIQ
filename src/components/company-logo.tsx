import React from 'react';
import Image from 'next/image';

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
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/brain-logo.svg"
        alt="ConvertIQ Logo"
        width={typeof width === 'number' ? width : parseInt(width as string)}
        height={typeof height === 'number' ? height : parseInt(height as string)}
        className="flex-shrink-0"
      />
      {showText && (
        <span className="text-lg font-semibold text-zinc-900 dark:text-white">
          ConvertIQ
        </span>
      )}
    </div>
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