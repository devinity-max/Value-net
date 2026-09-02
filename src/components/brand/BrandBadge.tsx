import React from 'react';

export interface BrandBadgeProps {
  label?: string;
  variant?: 'gold' | 'purple' | 'emerald' | 'slate' | 'official';
  size?: 'sm' | 'md';
  icon?: string;
  className?: string;
}

export const BrandBadge: React.FC<BrandBadgeProps> = ({
  label = 'OFFICIAL PARTNER',
  variant = 'gold',
  size = 'md',
  icon,
  className = '',
}) => {
  const variantStyles = {
    gold: 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-amber-500/10',
    official: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10 font-bold',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30 shadow-purple-500/10',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/60 shadow-black/20',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border shadow-sm tracking-wide ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};
