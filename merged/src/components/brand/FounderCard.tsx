import React from 'react';
import { Founder } from '../../data/brand';
import { playClickSound } from '../../utils/audio';

interface FounderCardProps {
  founder: Founder;
  onViewProfile?: (username: string) => void;
}

export const FounderCard: React.FC<FounderCardProps> = ({
  founder,
  onViewProfile,
}) => {
  return (
    <div
      className="relative flex flex-col justify-between bg-[#0e1224] rounded-2xl border border-amber-500/30 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-amber-400/60 hover:-translate-y-1 group overflow-hidden"
      style={{
        boxShadow: `0 10px 30px rgba(0,0,0,0.6), 0 0 20px ${founder.glowColor}`,
      }}
    >
      {/* Subtle Background Radial Gradient */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-amber-500/10 via-purple-500/5 to-transparent rounded-bl-full pointer-events-none" />

      {/* Top Header & Role Indicator */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-game font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {founder.badge}
        </span>
        <span className="text-[10px] font-mono text-purple-300/80 uppercase tracking-widest">
          VALUE.NET
        </span>
      </div>

      {/* Center Avatar & Identity */}
      <div className="flex flex-col items-center text-center my-2 relative z-10">
        {/* Avatar Ring */}
        <div className="relative mb-4">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${founder.avatarGradient} p-[2px] shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform duration-300`}
          >
            <div className="w-full h-full bg-[#0a0d1a] rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <span className="material-symbols-outlined text-3xl text-amber-400">
                {founder.icon}
              </span>
            </div>
          </div>
          {/* Crown/Founder Mini Badge */}
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center shadow-md border-2 border-[#0e1224]">
            <span className="material-symbols-outlined text-xs font-bold">verified</span>
          </div>
        </div>

        {/* Founder Name & Title */}
        <h3 className="text-xl sm:text-2xl font-black font-game tracking-wider text-white mb-1 group-hover:text-amber-300 transition-colors">
          {founder.name}
        </h3>
        <div className="inline-block text-xs font-bold font-game uppercase tracking-widest text-amber-400 bg-amber-950/40 px-3 py-0.5 rounded-lg border border-amber-500/30 mb-2">
          {founder.title}
        </div>
        <p className="text-[11px] font-mono text-purple-300 font-semibold mb-3">
          {founder.role}
        </p>
      </div>

      {/* Description / Bio */}
      <p className="text-xs text-slate-300 leading-relaxed text-center mb-5 px-2 relative z-10 min-h-[50px] flex items-center justify-center">
        {founder.bio}
      </p>

      {/* Card Footer: Community Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between relative z-10 text-[11px]">
        <span className="text-slate-400 font-game font-semibold uppercase tracking-wider text-[10px]">
          VALUE.NET COMMUNITY
        </span>
        {onViewProfile && (
          <button
            onClick={() => {
              playClickSound();
              onViewProfile(founder.name);
            }}
            className="text-amber-400 hover:text-amber-300 font-game font-bold flex items-center gap-1 transition-colors"
          >
            VIEW PROFILE <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
};
