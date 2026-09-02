import React, { useState } from 'react';
import { BRAND_CONFIG } from '../../data/brand';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showBadge?: boolean;
  logoOnly?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  showBadge = true,
  logoOnly = false,
  className = '',
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'text-sm sm:text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl',
  };

  const emblemSizes = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10',
    lg: 'w-12 h-12 sm:w-14 sm:h-14',
    xl: 'w-16 h-16 sm:w-20 sm:h-20',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${className}`}
    >
      {/* Official Shield Crest Emblem */}
      <div className="relative shrink-0">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/40 via-amber-500/30 to-purple-600/40 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div
          className={`${emblemSizes[size]} relative rounded-xl bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#fbbf24] p-[1.5px] shadow-lg shadow-purple-950/60 flex items-center justify-center transition-transform duration-300 group-hover:scale-105 overflow-hidden`}
        >
          <div className="w-full h-full bg-[#0a0d1e] rounded-[10px] flex items-center justify-center overflow-hidden">
            {!imgError ? (
              <img
                src={BRAND_CONFIG.logoCrestUrl}
                alt="Value.NET Official Logo"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <span className="font-black tracking-tighter bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                V
              </span>
            )}
          </div>
        </div>
      </div>

      {!logoOnly && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-wider uppercase bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent font-game ${sizeClasses[size]}`}
            >
              VALUE<span className="text-amber-400">.NET</span>
            </span>
            {showBadge && (
              <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold font-mono bg-gradient-to-r from-purple-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40 tracking-widest uppercase shadow-sm">
                PRO
              </span>
            )}
          </div>
          {showSubtitle && (
            <span className="text-[10px] sm:text-[11px] text-slate-400 tracking-wide -mt-0.5 font-medium font-sans">
              Trade Value Calculator
            </span>
          )}
        </div>
      )}
    </div>
  );
};
