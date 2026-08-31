import React from 'react';
import { HouseAdItem, ActiveTab } from '../../types';
import { playClickSound } from '../../utils/audio';

interface HouseAdProps {
  ad: HouseAdItem;
  variant?: 'Banner' | 'Rectangle' | 'Native' | 'Sidebar' | 'InFeed' | 'Footer';
  onNavigateTab?: (tab: ActiveTab) => void;
  className?: string;
}

export const HouseAd: React.FC<HouseAdProps> = ({
  ad,
  variant = 'Native',
  onNavigateTab,
  className = '',
}) => {
  const handleClick = () => {
    playClickSound();
    if (ad.targetTab && onNavigateTab) {
      onNavigateTab(ad.targetTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (ad.externalUrl) {
      window.open(ad.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (variant === 'Sidebar') {
    return (
      <div
        className={`w-full rounded-2xl bg-gradient-to-b ${ad.accentGradient} border border-purple-500/20 p-5 flex flex-col justify-between relative overflow-hidden group shadow-lg ${className}`}
      >
        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-300" />
        
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[9px] font-mono font-bold text-purple-300 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              {ad.badgeText}
            </span>
            <span className="text-[10px] font-mono text-slate-500">VALUE.NET</span>
          </div>

          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0e1224] border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-300 shadow-inner">
              <span className="material-symbols-outlined text-lg">{ad.icon}</span>
            </div>
            <h4 className="font-game font-black text-sm text-white leading-tight group-hover:text-purple-200 transition-colors">
              {ad.title}
            </h4>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {ad.description}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="w-full py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-xs font-game font-bold text-purple-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <span>{ad.buttonText}</span>
          <span className="material-symbols-outlined text-xs">arrow_forward</span>
        </button>
      </div>
    );
  }

  if (variant === 'Banner') {
    return (
      <div
        className={`w-full rounded-2xl bg-gradient-to-r ${ad.accentGradient} border border-purple-500/25 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group shadow-md ${className}`}
      >
        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
          <div className="w-11 h-11 rounded-xl bg-[#0e1224] border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300 shadow-inner">
            <span className="material-symbols-outlined text-xl">{ad.icon}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[9px] font-mono font-bold text-purple-300 uppercase tracking-wider">
                {ad.badgeText}
              </span>
              <span className="font-game font-bold text-sm text-white truncate">
                {ad.title}
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1">
              {ad.tagline}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClick}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-game font-bold text-white transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
        >
          <span>{ad.buttonText}</span>
          <span className="material-symbols-outlined text-xs">arrow_forward</span>
        </button>
      </div>
    );
  }

  // Default Native / InFeed Card
  return (
    <div
      className={`w-full rounded-2xl bg-[#0a0d1a] border border-purple-500/20 hover:border-purple-500/40 p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 group shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/70 border border-purple-500/30 text-[9px] font-mono font-bold text-purple-300 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          {ad.badgeText}
        </span>
        <span className="text-[10px] font-mono text-slate-500">VALUE.NET ECOSYSTEM</span>
      </div>

      <div className="flex items-start gap-3.5 mb-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#0e1224] border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-300 shadow-inner group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-xl">{ad.icon}</span>
        </div>
        <div>
          <h4 className="font-game font-black text-sm text-white group-hover:text-purple-200 transition-colors">
            {ad.title}
          </h4>
          <p className="text-[11px] font-mono text-purple-400/90 mt-0.5">
            {ad.tagline}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-4">
        {ad.description}
      </p>

      <button
        type="button"
        onClick={handleClick}
        className="w-full py-2 px-3 rounded-xl bg-[#0e1224] hover:bg-purple-950/60 border border-purple-500/30 text-xs font-game font-bold text-purple-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>{ad.buttonText}</span>
        <span className="material-symbols-outlined text-xs">arrow_forward</span>
      </button>
    </div>
  );
};
