import React from 'react';
import { TrustLevel } from '../types';

export interface TrustBadgeProps {
  level?: TrustLevel | string;
  score?: number;
  completedTrades?: number;
  uniqueCounterparties?: number;
  totalTrades?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | string;
  showScore?: boolean;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  level,
  score = 100,
  completedTrades,
  uniqueCounterparties,
  totalTrades = 0,
  size = 'sm',
  showScore = true,
}) => {
  const tradeCount = completedTrades ?? totalTrades;
  const isHighTrust = (score >= 90) || (level === 'APEX_TRADER' || level === 'MASTER_TRADER' || level === 'TRUSTED');
  const isMediumTrust = score >= 75 || level === 'ESTABLISHED';

  const badgeColor = isHighTrust
    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
    : isMediumTrust
    ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
    : 'bg-rose-950/80 border-rose-500/50 text-rose-300';

  const label = level
    ? level.replace('_', ' ')
    : isHighTrust
    ? 'VERIFIED TRADER'
    : 'TRADER';

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-game font-bold tracking-wider uppercase ${badgeColor}`}
      title={`Trust Score: ${score}% (${tradeCount} verified trades)`}
    >
      <span className="material-symbols-outlined text-sm">
        {isHighTrust ? 'verified' : isMediumTrust ? 'shield' : 'warning'}
      </span>
      <span>{label}</span>
      {showScore && <span className="font-mono text-[10px] opacity-80">({score}%)</span>}
    </div>
  );
};

