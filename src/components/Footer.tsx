import React, { useState, useEffect } from 'react';
import { playClickSound } from '../utils/audio';
import { ActiveTab } from '../types';
import { BrandLogo } from './brand/BrandLogo';
import { BRAND_CONFIG } from '../data/brand';
import { getDiscordUrl } from '../utils/brandSettings';
import { AdSlot } from './ads/AdSlot';

interface FooterProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenLedger: () => void;
  onOpenApi: () => void;
  onScrollToTop: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateTab,
  onOpenLedger,
  onOpenApi,
  onScrollToTop,
}) => {
  const [discordUrl, setDiscordUrl] = useState<string>(BRAND_CONFIG.officialDiscordUrl);

  useEffect(() => {
    setDiscordUrl(getDiscordUrl());

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string }>;
      if (customEvent.detail?.url) {
        setDiscordUrl(customEvent.detail.url);
      } else {
        setDiscordUrl(getDiscordUrl());
      }
    };

    window.addEventListener('valuenet:discord-updated', handleUpdate);
    return () => {
      window.removeEventListener('valuenet:discord-updated', handleUpdate);
    };
  }, []);

  return (
    <footer className="border-t border-purple-500/20 bg-[#050711] py-14 px-4 md:px-8 relative z-20">
      <div className="max-w-[1240px] mx-auto">
        {/* Global Footer Banner AdSlot */}
        <div className="mb-12">
          <AdSlot
            placement="footer-banner"
            variant="Banner"
            onNavigateTab={onNavigateTab}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand & Mission Column */}
          <div className="lg:col-span-2 space-y-4">
            <BrandLogo
              size="md"
              showBadge={true}
              onClick={() => onNavigateTab('calculator')}
            />
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              The official digital home of the VALUE.NET community. High-precision trade valuation, fair formula arbitration, live peer trading, and verified community drops.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={playClickSound}
                className="px-3.5 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-[11px] font-game font-bold text-white transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(88,101,242,0.3)] cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">forum</span>
                DISCORD
              </a>
              <button
                onClick={() => {
                  playClickSound();
                  onOpenLedger();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#0e1224] border border-purple-500/30 text-[11px] font-game font-bold text-amber-400 hover:text-amber-300 hover:border-amber-400/50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                LEDGER
              </button>
              <button
                onClick={() => {
                  playClickSound();
                  onOpenApi();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#0e1224] border border-purple-500/30 text-[11px] font-game font-bold text-purple-300 hover:text-white hover:border-purple-400/50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">api</span>
                API
              </button>
            </div>
          </div>

          {/* Navigation Links Column */}
          <div className="space-y-3 text-xs">
            <h4 className="font-game font-bold text-white uppercase tracking-wider text-[11px] text-slate-300">
              PLATFORM APPS
            </h4>
            <ul className="space-y-2 font-medium text-slate-400">
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('calculator');
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Trade Calculator
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('live-trades');
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Live Market Trades
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('values');
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Fruit Values Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('giveaways');
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Giveaways & Drops
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('community');
                  }}
                  className="hover:text-purple-300 text-purple-400/90 transition-colors flex items-center gap-1 font-semibold"
                >
                  <span className="material-symbols-outlined text-xs">groups</span>
                  VALUE.NET Community
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('wiki');
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Trading Wiki & Guides
                </button>
              </li>
            </ul>
          </div>

          {/* Partnerships & Sustainability Column */}
          <div className="space-y-3 text-xs">
            <h4 className="font-game font-bold text-white uppercase tracking-wider text-[11px] text-slate-300">
              PARTNERSHIPS
            </h4>
            <ul className="space-y-2 font-medium text-slate-400">
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('advertise');
                  }}
                  className="hover:text-amber-300 text-amber-400/90 transition-colors flex items-center gap-1 font-semibold"
                >
                  <span className="material-symbols-outlined text-xs">campaign</span>
                  Advertise With Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('support');
                  }}
                  className="hover:text-purple-300 text-purple-400/90 transition-colors flex items-center gap-1 font-semibold"
                >
                  <span className="material-symbols-outlined text-xs">favorite</span>
                  Support Platform
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('safety');
                  }}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs text-amber-400">security</span>
                  Safety Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('contact');
                  }}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs text-sky-400">support_agent</span>
                  Contact Help Desk
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('security');
                  }}
                  className="hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs text-emerald-400">bug_report</span>
                  Security Disclosure
                </button>
              </li>
            </ul>
          </div>

          {/* Legal & Policy Column */}
          <div className="space-y-3 text-xs">
            <h4 className="font-game font-bold text-white uppercase tracking-wider text-[11px] text-slate-300">
              LEGAL & POLICIES
            </h4>
            <ul className="space-y-2 font-medium text-slate-400">
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('terms');
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('privacy');
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    playClickSound();
                    onNavigateTab('guidelines');
                  }}
                  className="hover:text-amber-300 transition-colors"
                >
                  Community Guidelines
                </button>
              </li>
            </ul>

            <div className="pt-3">
              <button
                onClick={() => {
                  playClickSound();
                  onScrollToTop();
                }}
                className="hover:text-amber-300 transition-colors inline-flex items-center gap-1.5 bg-[#0e1224] px-3.5 py-1.5 rounded-xl border border-purple-500/20 text-[11px] font-game font-bold uppercase tracking-wider text-slate-300 cursor-pointer"
              >
                TOP <span className="material-symbols-outlined text-xs text-amber-400">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer and Copyright */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p className="text-center md:text-left leading-relaxed max-w-2xl">
            {BRAND_CONFIG.disclaimer}
          </p>
          <div className="font-mono text-slate-400 text-center shrink-0">
            &copy; {new Date().getFullYear()} {BRAND_CONFIG.name}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
