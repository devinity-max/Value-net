import React from 'react';

export type BrandBadgeVariant =
  | 'founder'
  | 'creator'
  | 'verified'
  | 'community'
  | 'official'
  | 'legendary';

interface BrandBadgeProps {
  variant: BrandBadgeVariant;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandBadge: React.FC<BrandBadgeProps> = ({
  variant,
  label,
  size = 'md',
  className = '',
}) => {
  const configs: Record<
    BrandBadgeVariant,
    { defaultLabel: string; icon: string; style: string }
  > = {
    founder: {
      defaultLabel: 'VALUE.NET FOUNDER',
      icon: 'crown',
      style:
        'bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    },
    creator: {
      defaultLabel: 'VALUE.NET CREATOR',
      icon: 'verified',
      style:
        'bg-purple-950/80 border-purple-500/50 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
    },
    verified: {
      defaultLabel: 'VERIFIED TRADER',
      icon: 'check_circle',
      style:
        'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    },
    community: {
      defaultLabel: 'VALUE.NET COMMUNITY',
      icon: 'groups',
      style:
        'bg-[#141830] border-slate-700 text-slate-300 shadow-sm',
    },
    official: {
      defaultLabel: 'OFFICIAL UTILITY',
      icon: 'verified_user',
      style:
        'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]',
    },
    legendary: {
      defaultLabel: 'LEGENDARY TIER',
      icon: 'star',
      style:
        'bg-gradient-to-r from-amber-900/60 to-purple-900/60 border-amber-400/50 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    },
  };

  const current = configs[variant];
  const displayLabel = label || current.defaultLabel;

  const sizeClasses = {
    sm: 'text-[9px] px-2 py-0.5 gap-1',
    md: 'text-[10px] sm:text-[11px] px-2.5 py-1 gap-1.5',
    lg: 'text-xs px-3.5 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-game font-bold uppercase tracking-wider rounded-xl border ${current.style} ${sizeClasses[size]} ${className}`}
    >
      <span className="material-symbols-outlined text-[13px] leading-none">
        {current.icon}
      </span>
      <span>{displayLabel}</span>
    </span>
  );
};
