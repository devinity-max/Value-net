import React, { useState, useEffect } from 'react';
import { BRAND_CONFIG, COMMUNITY_PILLARS } from '../data/brand';
import { FoundersSection } from './brand/FoundersSection';
import { DiscordCommunityCard } from './brand/DiscordCommunityCard';
import { BrandBadge } from './brand/BrandBadge';
import { BrandVideoModal } from './brand/BrandVideoModal';
import { ActiveTab } from '../types';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';
import { getDiscordUrl } from '../utils/brandSettings';
import { AdSlot } from './ads/AdSlot';

interface CommunityViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onViewTraderProfile?: (username: string) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  onNavigateTab,
  onViewTraderProfile,
}) => {
  const [activeDiscordUrl, setActiveDiscordUrl] = useState<string>(BRAND_CONFIG.officialDiscordUrl);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  useEffect(() => {
    setActiveDiscordUrl(getDiscordUrl());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string }>;
      if (customEvent.detail?.url) {
        setActiveDiscordUrl(customEvent.detail.url);
      } else {
        setActiveDiscordUrl(getDiscordUrl());
      }
    };

    window.addEventListener('valuenet:discord-updated', handleUpdate);
    return () => {
      window.removeEventListener('valuenet:discord-updated', handleUpdate);
    };
  }, []);

  return (
    <div className="pt-28 sm:pt-32 pb-24 px-4 md:px-8 max-w-[1240px] mx-auto w-full animate-in fade-in duration-300">
      {/* 1. Hero Brand Header with Shield Crest & Emergence Banner */}
      <section className="max-w-4xl mx-auto mb-16 relative">
        <div className="relative overflow-hidden rounded-3xl bg-[#0a0d1f] border border-purple-500/30 p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center">
          {/* Background Emergence Art */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
            <img
              src={BRAND_CONFIG.heroEmergenceUrl}
              alt="Value.NET Lava Emergence"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d1f] via-[#0a0d1f]/60 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Centerpiece 3D Crest Badge */}
            <div
              onClick={() => {
                playTradeSuccessSound();
                setIsVideoModalOpen(true);
              }}
              className="relative cursor-pointer group mb-4"
              title="Click to play 3D crest reveal video"
            >
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl p-1 bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] shadow-[0_0_35px_rgba(168,85,247,0.5)] transform group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full rounded-[14px] bg-[#0a0d1a] overflow-hidden relative flex items-center justify-center">
                  <img
                    src={BRAND_CONFIG.logoCrestUrl}
                    alt="Value.NET Official Seal"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-3xl">play_arrow</span>
                  </div>
                </div>
              </div>
              <span className="inline-block mt-2 text-[9px] font-game font-bold text-amber-300 uppercase tracking-widest bg-[#141830] px-2.5 py-0.5 rounded-full border border-purple-500/40">
                WATCH 3D REVEAL
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#161b36] border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)] mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-game font-bold uppercase tracking-wider text-purple-200">
                OFFICIAL COMMUNITY PORTAL
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-game tracking-tight text-white mb-3 drop-shadow-md">
              VALUE<span className="text-amber-400">.NET</span> COMMUNITY
            </h1>

            <p className="text-sm sm:text-base text-amber-300 font-game font-bold uppercase tracking-wider mb-2">
              {BRAND_CONFIG.tagline}
            </p>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed mb-6">
              {BRAND_CONFIG.subtitle} Dedicated to transparency, verified trust standards, and fair trading across the community.
            </p>

            {/* Hero Quick Navigation Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  playTradeSuccessSound();
                  setIsVideoModalOpen(true);
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-amber-300">movie</span>
                <span>WATCH 3D REVEAL VIDEO</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  window.open(activeDiscordUrl, '_blank', 'noopener,noreferrer');
                }}
                className="px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-game font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-[0_0_20px_rgba(88,101,242,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">forum</span>
                <span>JOIN DISCORD</span>
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </button>

              <button
                onClick={() => {
                  playClickSound();
                  onNavigateTab('live-trades');
                }}
                className="px-5 py-3 rounded-xl bg-[#0e1224] hover:bg-[#161b36] border border-purple-500/40 text-purple-200 font-game font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 hover:border-purple-400"
              >
                <span className="material-symbols-outlined text-base">storefront</span>
                <span>EXPLORE LIVE TRADES</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <BrandVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />

      {/* 2. Founders Section */}
      <FoundersSection
        onViewProfile={onViewTraderProfile}
        className="mb-20"
      />

      {/* 3. Dedicated Discord Community Experience */}
      <section className="mb-14">
        <DiscordCommunityCard />
      </section>

      {/* AdSlot: Community In-Feed Sponsor / Creator Promotion */}
      <section className="mb-14">
        <AdSlot placement="community-in-feed" variant="Native" />
      </section>

      {/* 4. Community Pillars */}
      <section className="mb-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <BrandBadge variant="official" className="mb-3" />
          <h2 className="text-2xl sm:text-4xl font-black font-game tracking-tight text-white mb-2">
            COMMUNITY PILLARS
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            The core standards governing every interaction on VALUE.NET.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COMMUNITY_PILLARS.map((pillar, idx) => (
            <div
              key={`pillar-${idx}`}
              className="bg-[#0e1224] rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-purple-500/40 transition-colors group shadow-lg"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${pillar.accentColor}`}
                >
                  <span className="material-symbols-outlined text-2xl">
                    {pillar.icon}
                  </span>
                </div>
                <h3 className="font-game font-bold text-base text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>STANDARD #{idx + 1}</span>
                <span className="text-purple-400 font-bold">VERIFIED</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Community Safety & Standards Footer Panel */}
      <section className="bg-[#0a0d1a] rounded-3xl border border-slate-800 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="material-symbols-outlined text-amber-400 text-lg">gavel</span>
            <h4 className="font-game font-bold text-base text-white">
              COMMUNITY INTEGRITY & SAFETY
            </h4>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Our platform strictly enforces a zero-tolerance policy against scams, off-platform trades, and harassment. Review our rules and safety guides.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              onNavigateTab('guidelines');
            }}
            className="px-4 py-2 rounded-xl bg-[#141830] hover:bg-[#1a2040] border border-slate-700 text-xs font-game font-bold text-slate-200 transition-colors"
          >
            Guidelines
          </button>
          <button
            onClick={() => {
              playClickSound();
              onNavigateTab('safety');
            }}
            className="px-4 py-2 rounded-xl bg-[#141830] hover:bg-[#1a2040] border border-slate-700 text-xs font-game font-bold text-amber-300 transition-colors"
          >
            Safety Center
          </button>
          <button
            onClick={() => {
              playClickSound();
              onNavigateTab('contact');
            }}
            className="px-4 py-2 rounded-xl bg-[#141830] hover:bg-[#1a2040] border border-slate-700 text-xs font-game font-bold text-purple-300 transition-colors"
          >
            Help Desk
          </button>
        </div>
      </section>
    </div>
  );
};
