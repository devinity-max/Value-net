import React, { useState } from 'react';
import { BRAND_CONFIG } from '../../data/brand';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showBadge?: boolean;
  showEmblemOnly?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  showBadge = true,
  showEmblemOnly = false,
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    xs: {
      emblem: 'w-6 h-6 rounded-md',
      icon: 'text-xs',
      text: 'text-base',
      subtitle: 'text-[7px]',
      badge: 'text-[7px] px-1 py-0.2',
    },
    sm: {
      emblem: 'w-8 h-8 rounded-lg',
      icon: 'text-base',
      text: 'text-lg',
      subtitle: 'text-[8px]',
      badge: 'text-[8px] px-1.5 py-0.2',
    },
    md: {
      emblem: 'w-11 h-11 rounded-xl',
      icon: 'text-xl',
      text: 'text-xl sm:text-2xl',
      subtitle: 'text-[9px]',
      badge: 'text-[9px] px-2 py-0.5',
    },
    lg: {
      emblem: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl',
      icon: 'text-2xl sm:text-3xl',
      text: 'text-2xl sm:text-3xl',
      subtitle: 'text-[10px] sm:text-[11px]',
      badge: 'text-[10px] px-2.5 py-0.5',
    },
    xl: {
      emblem: 'w-20 h-20 sm:w-24 sm:h-24 rounded-3xl',
      icon: 'text-3xl sm:text-4xl',
      text: 'text-3xl sm:text-5xl',
      subtitle: 'text-xs sm:text-sm',
      badge: 'text-xs px-3 py-1',
    },
  };

  const current = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      {/* Official 3D Shield Crest Emblem */}
      <div
        className={`${current.emblem} relative p-[1px] bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.4)] shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] overflow-hidden`}
      >
        {!imageError && BRAND_CONFIG.logoCrestUrl ? (
          <img
            src={BRAND_CONFIG.logoCrestUrl}
            alt="Value.NET Official Logo Crest"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-[inherit] transform group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-[#0a0d1a] rounded-[inherit] flex items-center justify-center relative overflow-hidden border border-purple-500/30">
            <div className="absolute inset-0 bg-radial from-purple-500/20 via-transparent to-transparent opacity-70" />
            <span className={`material-symbols-outlined text-amber-400 ${current.icon} drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] group-hover:rotate-6 transition-transform duration-200`}>
              shield
            </span>
          </div>
        )}
      </div>

      {!showEmblemOnly && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`${current.text} font-black font-game tracking-wider text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)] flex items-center`}
            >
              VALUE<span className="text-amber-400 font-bold mx-0.5">.</span>NET
            </span>

            {showBadge && (
              <span
                className={`${current.badge} font-bold font-mono rounded-full bg-[#161b36] border border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)] hidden sm:inline-block`}
              >
                CALCULATOR
              </span>
            )}
          </div>

          {showSubtitle && (
            <span
              className={`${current.subtitle} uppercase tracking-[0.22em] text-purple-300/80 font-semibold font-game`}
            >
              TRADE VALUE CALCULATOR
            </span>
          )}
        </div>
      )}
    </div>
  );
};
