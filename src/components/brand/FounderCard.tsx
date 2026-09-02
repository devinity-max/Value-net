import React from 'react';
import { Founder } from '../../data/brand';

interface FounderCardProps {
  founder: Founder;
  onViewProfile?: (username: string) => void;
}

export const FounderCard: React.FC<FounderCardProps> = ({ founder, onViewProfile }) => {
  return (
    <div
      onClick={() => onViewProfile && onViewProfile(founder.name)}
      className="relative rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md transition-all duration-300 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/5 group cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${founder.avatarGradient} p-[2px] shadow-lg flex-shrink-0`}
        >
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-amber-300">
              {founder.icon}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-black tracking-wide text-white font-mono">
              {founder.name}
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
              {founder.badge}
            </span>
          </div>
          <p className="text-xs font-semibold text-amber-400/90 mb-2">{founder.role}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{founder.bio}</p>
        </div>
      </div>
    </div>
  );
};
