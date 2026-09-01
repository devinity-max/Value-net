import React from 'react';
import { FOUNDERS } from '../../data/brand';
import { FounderCard } from './FounderCard';

interface FoundersSectionProps {
  onViewProfile?: (username: string) => void;
  className?: string;
}

export const FoundersSection: React.FC<FoundersSectionProps> = ({
  onViewProfile,
  className = '',
}) => {
  return (
    <section className={`w-full ${className}`}>
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161b36] border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)] mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-game font-bold uppercase tracking-wider text-amber-300">
            LEADERSHIP & ARCHITECTURE
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black font-game tracking-tight text-white mb-3">
          FOUNDERS
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
          The people behind VALUE.NET. Built around trading, community, and a shared passion for the game.
        </p>
      </div>

      {/* 2-Column Responsive Founders Grid for YAMI & VOID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[840px] mx-auto items-stretch">
        {FOUNDERS.map((founder) => (
          <FounderCard
            key={founder.id}
            founder={founder}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
    </section>
  );
};
