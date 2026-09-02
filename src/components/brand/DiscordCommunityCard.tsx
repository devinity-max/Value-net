import React from 'react';
import { BRAND_CONFIG } from '../../data/brand';
import { getDiscordUrl } from '../../utils/brandSettings';

export const DiscordCommunityCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const discordUrl = getDiscordUrl();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-purple-950/60 p-6 shadow-2xl backdrop-blur-md ${className}`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
            <span className="material-symbols-outlined text-3xl text-white">forum</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black text-white font-mono tracking-wide">
                OFFICIAL DISCORD HUB
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-sm text-slate-300">
              {BRAND_CONFIG.discordSubtext} Real-time price alerts, drop giveaways, and trade matchmaking.
            </p>
          </div>
        </div>

        <a
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm tracking-wider uppercase transition-all duration-200 shadow-lg shadow-indigo-600/30 hover:scale-105 flex items-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>{BRAND_CONFIG.discordLabel}</span>
          <span className="material-symbols-outlined text-base">open_in_new</span>
        </a>
      </div>
    </div>
  );
};
