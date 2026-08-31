import React from 'react';
import { DirectSponsorItem, AdVariant } from '../../types';
import { sanitizeTargetUrl, isValidHttpsUrl } from '../../utils/monetization';
import { playClickSound } from '../../utils/audio';

interface SponsoredCardProps {
  sponsor: DirectSponsorItem;
  variant?: AdVariant;
  className?: string;
}

export const SponsoredCard: React.FC<SponsoredCardProps> = ({
  sponsor,
  variant = 'Native',
  className = '',
}) => {
  const safeUrl = sanitizeTargetUrl(sponsor.targetUrl);
  const hasValidUrl = isValidHttpsUrl(sponsor.targetUrl);

  const handleClick = () => {
    playClickSound();
  };

  const getTierLabel = () => {
    switch (sponsor.tier) {
      case 'PARTNER':
        return 'OFFICIAL PARTNER';
      case 'EVENT_SPONSOR':
        return 'EVENT SPONSOR';
      case 'FEATURED_SPONSOR':
        return 'FEATURED SPONSOR';
      case 'COMMUNITY_SPONSOR':
      default:
        return 'SPONSORED';
    }
  };

  if (variant === 'Sidebar') {
    return (
      <div
        className={`w-full rounded-2xl bg-[#090d1f] border border-amber-500/30 p-5 flex flex-col justify-between relative overflow-hidden group shadow-lg ${className}`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[9px] font-mono font-black text-amber-300 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {getTierLabel()}
            </span>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              {sponsor.category || 'GAMING'}
            </span>
          </div>

          <div className="flex items-start gap-3 mb-2.5">
            {sponsor.imageUrl ? (
              <img
                src={sponsor.imageUrl}
                alt={sponsor.sponsorName}
                className="w-10 h-10 rounded-xl object-cover border border-amber-500/30 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-300">
                <span className="material-symbols-outlined text-xl">verified</span>
              </div>
            )}
            <div>
              <h4 className="font-game font-black text-sm text-white group-hover:text-amber-200 transition-colors">
                {sponsor.sponsorName}
              </h4>
              <p className="text-[11px] font-mono text-amber-400/90 mt-0.5">
                {sponsor.tagline}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {sponsor.description}
          </p>
        </div>

        {hasValidUrl && (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600/30 to-purple-600/30 hover:from-amber-600/50 hover:to-purple-600/50 border border-amber-500/40 text-xs font-game font-bold text-amber-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center"
          >
            <span>Visit Sponsor</span>
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </a>
        )}
      </div>
    );
  }

  if (variant === 'Banner') {
    return (
      <div
        className={`w-full rounded-2xl bg-gradient-to-r from-[#090d1f] via-[#0d122b] to-[#090d1f] border border-amber-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group shadow-md ${className}`}
      >
        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
          {sponsor.imageUrl ? (
            <img
              src={sponsor.imageUrl}
              alt={sponsor.sponsorName}
              className="w-12 h-12 rounded-xl object-cover border border-amber-500/30 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-300">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[9px] font-mono font-black text-amber-300 uppercase tracking-wider">
                {getTierLabel()}
              </span>
              <span className="font-game font-bold text-sm text-white truncate">
                {sponsor.sponsorName}
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1">
              {sponsor.tagline || sponsor.description}
            </p>
          </div>
        </div>

        {hasValidUrl && (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-game font-black text-slate-950 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
          >
            <span>Learn More</span>
            <span className="material-symbols-outlined text-xs font-bold">open_in_new</span>
          </a>
        )}
      </div>
    );
  }

  // Default Native / InFeed
  return (
    <div
      className={`w-full rounded-2xl bg-[#090d1f] border border-amber-500/30 hover:border-amber-500/50 p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 group shadow-md ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[9px] font-mono font-black text-amber-300 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {getTierLabel()}
        </span>
        <span className="text-[10px] font-mono text-slate-500 uppercase">
          {sponsor.category || 'COMMUNITY SPONSOR'}
        </span>
      </div>

      <div className="flex items-start gap-3.5 mb-3.5">
        {sponsor.imageUrl ? (
          <img
            src={sponsor.imageUrl}
            alt={sponsor.sponsorName}
            className="w-11 h-11 rounded-xl object-cover border border-amber-500/30 shrink-0 group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-300 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
        )}
        <div>
          <h4 className="font-game font-black text-sm text-white group-hover:text-amber-200 transition-colors">
            {sponsor.sponsorName}
          </h4>
          <p className="text-[11px] font-mono text-amber-400/90 mt-0.5">
            {sponsor.tagline}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-4">
        {sponsor.description}
      </p>

      {hasValidUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="w-full py-2 px-3 rounded-xl bg-[#0e1224] hover:bg-amber-950/50 border border-amber-500/30 text-xs font-game font-bold text-amber-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
        >
          <span>Visit Sponsor</span>
          <span className="material-symbols-outlined text-xs">open_in_new</span>
        </a>
      )}
    </div>
  );
};
