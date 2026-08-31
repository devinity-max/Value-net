import React, { useState, useEffect } from 'react';
import { BRAND_CONFIG } from '../../data/brand';
import { getDiscordUrl } from '../../utils/brandSettings';
import { playClickSound } from '../../utils/audio';

interface DiscordCommunityCardProps {
  className?: string;
  variant?: 'banner' | 'card' | 'compact';
}

export const DiscordCommunityCard: React.FC<DiscordCommunityCardProps> = ({
  className = '',
  variant = 'banner',
}) => {
  const [activeUrl, setActiveUrl] = useState<string>(BRAND_CONFIG.officialDiscordUrl);

  useEffect(() => {
    setActiveUrl(getDiscordUrl());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string }>;
      if (customEvent.detail?.url) {
        setActiveUrl(customEvent.detail.url);
      } else {
        setActiveUrl(getDiscordUrl());
      }
    };

    window.addEventListener('valuenet:discord-updated', handleUpdate);
    return () => {
      window.removeEventListener('valuenet:discord-updated', handleUpdate);
    };
  }, []);

  const handleJoinDiscord = () => {
    playClickSound();
    window.open(activeUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'compact') {
    return (
      <div
        className={`bg-[#0e1224] rounded-2xl border border-indigo-500/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg ${className}`}
      >
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="w-11 h-11 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(88,101,242,0.4)]">
            <span className="material-symbols-outlined text-2xl">forum</span>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-game font-bold text-sm text-white truncate">
              VALUE.NET DISCORD COMMUNITY
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {BRAND_CONFIG.discordSubtext}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleJoinDiscord}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-game font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(88,101,242,0.3)] hover:scale-105 active:scale-95 shrink-0 cursor-pointer min-h-[44px]"
          >
            <span>{BRAND_CONFIG.discordLabel}</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c0f24] via-[#0f132e] to-[#121638] border border-indigo-500/30 p-5 sm:p-8 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] ${className}`}
    >
      {/* Subtle Background Discord Icon Motif */}
      <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-[#5865F2]/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-1/2 -right-8 -translate-y-1/2 opacity-5 pointer-events-none select-none hidden md:block">
        <span className="material-symbols-outlined text-[180px] text-white">forum</span>
      </div>

      <div className="relative z-10 max-w-2xl">
        {/* Top Community Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b2044] border border-indigo-400/30 shadow-sm mb-4">
          <span className="w-2 h-2 rounded-full bg-[#5865F2] animate-ping" />
          <span className="text-[10px] sm:text-[11px] font-game font-bold uppercase tracking-wider text-indigo-300">
            OFFICIAL DISCORD COMMUNITY
          </span>
        </div>

        {/* Section Heading */}
        <h3 className="text-xl sm:text-3xl md:text-4xl font-black font-game tracking-tight text-white mb-3">
          JOIN THE VALUE<span className="text-amber-400">.NET</span> COMMUNITY
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 max-w-xl">
          Connect with thousands of active traders, discuss real-time market trends, participate in verified fruit drop giveaways, and get instant updates from VALUE.NET founders.
        </p>

        {/* Value Points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 bg-[#0a0d1d]/80 px-3.5 py-2.5 rounded-xl border border-slate-800/80">
            <span className="material-symbols-outlined text-amber-400 text-base shrink-0">forum</span>
            <span className="text-xs text-slate-200 font-medium truncate">Live Trade & Value Discussion</span>
          </div>
          <div className="flex items-center gap-2.5 bg-[#0a0d1d]/80 px-3.5 py-2.5 rounded-xl border border-slate-800/80">
            <span className="material-symbols-outlined text-emerald-400 text-base shrink-0">featured_seasonal_and_gifts</span>
            <span className="text-xs text-slate-200 font-medium truncate">Exclusive Host Drops & Events</span>
          </div>
          <div className="flex items-center gap-2.5 bg-[#0a0d1d]/80 px-3.5 py-2.5 rounded-xl border border-slate-800/80">
            <span className="material-symbols-outlined text-purple-400 text-base shrink-0">verified_user</span>
            <span className="text-xs text-slate-200 font-medium truncate">Reputation & Trust Network</span>
          </div>
          <div className="flex items-center gap-2.5 bg-[#0a0d1d]/80 px-3.5 py-2.5 rounded-xl border border-slate-800/80">
            <span className="material-symbols-outlined text-sky-400 text-base shrink-0">campaign</span>
            <span className="text-xs text-slate-200 font-medium truncate">Founder Announcements</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={handleJoinDiscord}
            className="w-full sm:w-auto px-6 sm:px-7 py-3.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-black font-game text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(88,101,242,0.4)] hover:scale-105 active:scale-95 cursor-pointer min-h-[44px]"
          >
            <span className="material-symbols-outlined text-lg">forum</span>
            <span>{BRAND_CONFIG.discordLabel}</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </button>

          <div className="flex flex-col text-center sm:text-left overflow-hidden">
            <span className="text-[11px] text-slate-400 font-mono truncate">
              {activeUrl}
            </span>
            <span className="text-[10px] text-slate-500 font-sans">
              {BRAND_CONFIG.discordSubtext}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
