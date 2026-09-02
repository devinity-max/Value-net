import React from 'react';
import { ActiveTab } from '../../types';

export interface AdSlotProps {
  placement?: string;
  variant?: string;
  className?: string;
  onNavigateTab?: (tab: ActiveTab) => void;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement = 'banner', className = '' }) => {
  if (placement === 'sticky-bottom') {
    return (
      <div className={`w-full bg-slate-950/90 border-t border-slate-800/80 px-4 py-2 flex items-center justify-between backdrop-blur-md text-xs text-slate-400 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-mono text-slate-400">
            SPONSOR
          </span>
          <span className="text-slate-300 font-medium truncate">
            Trade faster with VALUE.NET Discord notifications and verified drop alerts!
          </span>
        </div>
        <a
          href="https://discord.gg/np4sVrpypF"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 font-bold ml-4 whitespace-nowrap"
        >
          Join Discord &rarr;
        </a>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 text-center ${className}`}
    >
      <div className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mb-1">
        COMMUNITY SPONSOR
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="text-left">
          <div className="font-bold text-white">Join the VALUE.NET Community Hub</div>
          <div className="text-xs text-slate-400">Connect with over 10,000+ Blox Fruits traders worldwide.</div>
        </div>
        <a
          href="https://discord.gg/np4sVrpypF"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono tracking-wider uppercase transition-colors whitespace-nowrap cursor-pointer"
        >
          JOIN DISCORD NOW
        </a>
      </div>
    </div>
  );
};
