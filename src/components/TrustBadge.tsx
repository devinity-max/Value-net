import React from 'react';
import { TrustLevel } from '../types';

export interface TrustBadgeProps {
  trustLevel?: TrustLevel;
  level?: string;
  reputationScore?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  trustLevel,
  level,
  reputationScore,
  size = 'md',
  className = '',
}) => {
  const activeLevel = (trustLevel || level || 'UNRANKED').toUpperCase();

  const getBadgeConfig = () => {
    switch (activeLevel) {
      case 'APEX_TRADER':
      case 'APEX':
        return {
          label: 'APEX TRADER',
          icon: 'workspace_premium',
          style: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50 text-amber-300 shadow-amber-500/10',
        };
      case 'MASTER_TRADER':
      case 'MASTER':
        return {
          label: 'MASTER TRADER',
          icon: 'military_tech',
          style: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
        };
      case 'TRUSTED':
        return {
          label: 'TRUSTED TRADER',
          icon: 'verified',
          style: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
        };
      case 'ESTABLISHED':
        return {
          label: 'ESTABLISHED',
          icon: 'shield',
          style: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
        };
      case 'NOVICE':
        return {
          label: 'NOVICE',
          icon: 'stars',
          style: 'bg-slate-700/40 border-slate-600/40 text-slate-300',
        };
      default:
        return {
          label: 'UNRANKED',
          icon: 'fiber_new',
          style: 'bg-slate-800/40 border-slate-700/40 text-slate-400',
        };
    }
  };

  const config = getBadgeConfig();
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-bold font-mono tracking-wider uppercase rounded-full border backdrop-blur-sm ${config.style} ${sizeClasses[size]} ${className}`}
    >
      <span className="material-symbols-outlined text-[13px]">{config.icon}</span>
      <span>{config.label}</span>
      {reputationScore !== undefined && (
        <span className="opacity-70 text-[10px]">({reputationScore})</span>
      )}
    </span>
  );
};
