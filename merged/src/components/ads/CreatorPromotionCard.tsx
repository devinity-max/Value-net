import React from 'react';
import { CreatorPromotion } from '../../types';
import { sanitizeTargetUrl, isValidHttpsUrl } from '../../utils/monetization';
import { playClickSound } from '../../utils/audio';

interface CreatorPromotionCardProps {
  promo: CreatorPromotion;
  className?: string;
}

export const CreatorPromotionCard: React.FC<CreatorPromotionCardProps> = ({
  promo,
  className = '',
}) => {
  const safeUrl = sanitizeTargetUrl(promo.targetUrl);
  const hasValidUrl = isValidHttpsUrl(promo.targetUrl);

  const getPromoIcon = () => {
    switch (promo.promoType) {
      case 'YOUTUBE':
        return 'smart_display';
      case 'DISCORD':
        return 'forum';
      case 'EVENT':
        return 'celebration';
      case 'TRADING_LOBBY':
      default:
        return 'swap_horiz';
    }
  };

  return (
    <div
      className={`w-full rounded-2xl bg-[#090b1c] border border-purple-500/30 hover:border-purple-500/50 p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 group shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[9px] font-mono font-black text-purple-300 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          PROMOTED CREATOR
        </span>
        <span className="text-[10px] font-mono text-purple-400/80">
          @{promo.creatorUsername}
        </span>
      </div>

      <div className="flex items-start gap-3.5 mb-3.5">
        <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300 group-hover:scale-105 transition-transform shadow-inner">
          <span className="material-symbols-outlined text-xl">{getPromoIcon()}</span>
        </div>
        <div>
          <h4 className="font-game font-black text-sm text-white group-hover:text-purple-200 transition-colors">
            {promo.title}
          </h4>
          <p className="text-[11px] font-mono text-purple-400/90 mt-0.5">
            {promo.badgeText || 'Creator Spotlight'}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-4">
        {promo.description}
      </p>

      {hasValidUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={playClickSound}
          className="w-full py-2 px-3 rounded-xl bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-xs font-game font-bold text-purple-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
        >
          <span>View Creator Channel</span>
          <span className="material-symbols-outlined text-xs">open_in_new</span>
        </a>
      )}
    </div>
  );
};
