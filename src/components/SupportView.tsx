import React from 'react';
import { ActiveTab, AuthUser } from '../types';
import { getDiscordUrl } from '../utils/brandSettings';
import { playClickSound } from '../utils/audio';

interface SupportViewProps {
  currentUser: AuthUser | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SupportView: React.FC<SupportViewProps> = ({
  onNavigateTab,
  onShowToast,
}) => {
  const discordUrl = getDiscordUrl();

  const supportPillars = [
    {
      title: 'Cloud Infrastructure & Hosting',
      icon: 'dns',
      description: 'Powers real-time Blox Fruits trade calculators, live trade feeds, and provably fair giveaway systems.',
    },
    {
      title: 'Active Development & Features',
      icon: 'code',
      description: 'Continuous development of value updates, fruit asset registries, calculator tools, and Discord integrations.',
    },
    {
      title: 'Community Moderation & Safety',
      icon: 'shield_lock',
      description: 'Enables 24/7 staff oversight, anti-scam report queues, and trade verification to keep traders safe.',
    },
  ];

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto w-full space-y-12 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-950/90 via-[#0e1224] to-indigo-950/90 p-8 sm:p-12 rounded-3xl border border-purple-500/40 shadow-2xl backdrop-blur-xl text-center space-y-6 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center mx-auto text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
          <span className="material-symbols-outlined text-3xl">favorite</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-game font-black text-white uppercase tracking-wider max-w-3xl mx-auto leading-tight">
          Support <span className="text-purple-400">VALUE.NET</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
          Help us keep building, hosting, and maintaining the premier free Blox Fruits trading terminal and community platform.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playClickSound()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">forum</span>
            <span>Join Official Discord</span>
          </a>
          <button
            onClick={() => {
              playClickSound();
              onNavigateTab('contact');
            }}
            className="px-6 py-3 rounded-2xl bg-[#141830] hover:bg-slate-800 text-slate-200 border border-slate-700 font-game font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Contact Support Team
          </button>
        </div>
      </div>

      {/* Why Support Section */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-game font-black text-white uppercase tracking-wider">
            Why Platform Support Matters
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl mx-auto">
            VALUE.NET is maintained independently to provide fast, reliable, and accessible utilities to the community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {supportPillars.map((p, i) => (
            <div
              key={i}
              className="bg-[#0e1224] border border-slate-800 p-6 rounded-3xl space-y-3 shadow-xl hover:border-purple-500/40 transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-2">
                <span className="material-symbols-outlined text-2xl">{p.icon}</span>
              </div>
              <h3 className="text-base font-game font-bold text-white uppercase tracking-wide">{p.title}</h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Support Pathways */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0e1224] border border-indigo-500/30 p-8 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <span className="material-symbols-outlined text-xl">forum</span>
              </div>
              <h3 className="text-lg font-game font-bold text-white uppercase">Discord Community Support</h3>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Join our active Discord community, share trade feedback, participate in giveaways, and help fellow traders navigate Blox Fruits values.
            </p>
          </div>
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider text-center transition-all cursor-pointer block"
          >
            Join Discord Server
          </a>
        </div>

        <div className="bg-[#0e1224] border border-purple-500/30 p-8 rounded-3xl space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <span className="material-symbols-outlined text-xl">workspace_premium</span>
              </div>
              <h3 className="text-lg font-game font-bold text-white uppercase">Financial Support & Perks</h3>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Official financial support options, supporter profile badges, and creator perks are currently being configured for future releases.
            </p>
          </div>
          <button
            onClick={() => onShowToast('Official financial support perks coming soon! Thank you for empowering platform development.', 'info')}
            className="w-full py-3 rounded-xl bg-[#141830] hover:bg-slate-800 border border-slate-700 text-purple-300 font-game font-bold text-xs uppercase tracking-wider text-center transition-all cursor-pointer"
          >
            Support Perks Coming Soon
          </button>
        </div>
      </div>
    </div>
  );
};
