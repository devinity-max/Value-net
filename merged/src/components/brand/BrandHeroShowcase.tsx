import React, { useState } from 'react';
import { BRAND_CONFIG } from '../../data/brand';
import { playClickSound, playTradeSuccessSound } from '../../utils/audio';
import { BrandVideoModal } from './BrandVideoModal';

interface BrandHeroShowcaseProps {
  className?: string;
  onExploreTrades?: () => void;
  onOpenCalculator?: () => void;
}

export const BrandHeroShowcase: React.FC<BrandHeroShowcaseProps> = ({
  className = '',
  onExploreTrades,
  onOpenCalculator,
}) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleOpenVideo = () => {
    playTradeSuccessSound();
    setIsVideoModalOpen(true);
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#090c1f] border border-purple-500/30 p-4 sm:p-8 md:p-10 shadow-[0_15px_50px_rgba(0,0,0,0.8)] box-border ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background Cinematic Emergence Keyframe */}
        <div className="absolute inset-0 z-0">
          <img
            src={BRAND_CONFIG.heroEmergenceUrl}
            alt="Value.NET Lava Emergence"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-30 mix-blend-screen scale-105 transition-transform duration-700 hover:scale-110 pointer-events-none"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#090c1f] via-[#090c1f]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090c1f] via-transparent to-[#090c1f]/60" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left Text & CTA Content */}
          <div className="max-w-xl text-center lg:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181d38]/90 border border-purple-400/40 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-[11px] font-game font-bold uppercase tracking-wider text-amber-300">
                OFFICIAL TRADE VALUE CALCULATOR
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black font-game tracking-tight text-white leading-none drop-shadow-lg">
              VALUE<span className="text-amber-400">.NET</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg">
              Equipped with real-time market telemetry, crystalline fruit valuation algorithms, 40% Beli compliance checks, and a live peer-to-peer trading network.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
              <div className="px-3 py-1 rounded-xl bg-[#141830]/90 border border-slate-700 text-[11px] font-mono text-purple-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-amber-400">verified</span>
                <span>Verified Values</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#141830]/90 border border-slate-700 text-[11px] font-mono text-emerald-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-emerald-400">equalizer</span>
                <span>Demand Index</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#141830]/90 border border-slate-700 text-[11px] font-mono text-amber-200 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-amber-400">sync_alt</span>
                <span>Live Negotiation</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-3">
              <button
                onClick={handleOpenVideo}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg text-amber-300">play_circle</span>
                <span>Watch 3D Reveal Video</span>
              </button>

              {onExploreTrades && (
                <button
                  onClick={() => {
                    playClickSound();
                    onExploreTrades();
                  }}
                  className="px-5 py-3 rounded-2xl bg-[#161b36] hover:bg-[#20274d] border border-slate-700 text-slate-200 font-game font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer hover:border-amber-400/50"
                >
                  <span className="material-symbols-outlined text-base text-amber-400">storefront</span>
                  <span>Live Market</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 3D Shield Crest Interactive Badge */}
          <div
            onClick={handleOpenVideo}
            className="relative cursor-pointer group shrink-0"
            title="Click to view full 3D reveal animation"
          >
            {/* Glow Aura */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-purple-600/40 via-amber-500/30 to-indigo-600/40 rounded-full blur-2xl group-hover:blur-3xl group-hover:opacity-100 opacity-70 transition-all duration-500 pointer-events-none" />

            {/* Crest Container */}
            <div className="relative w-40 h-40 xs:w-48 xs:h-48 sm:w-56 sm:h-56 md:w-60 md:h-60 rounded-2xl sm:rounded-3xl p-1 sm:p-1.5 bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] shadow-[0_0_40px_rgba(124,58,237,0.5)] transform group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300">
              <div className="w-full h-full rounded-[18px] sm:rounded-[22px] bg-[#0a0d1a] border border-purple-400/50 overflow-hidden relative flex items-center justify-center">
                <img
                  src={BRAND_CONFIG.logoCrestUrl}
                  alt="Value.NET Official Shield Crest Badge"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />

                {/* Floating Play Button Overlay on Hover */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#5865F2] flex items-center justify-center text-white shadow-[0_0_20px_rgba(88,101,242,0.8)]">
                    <span className="material-symbols-outlined text-2xl">play_arrow</span>
                  </div>
                  <span className="text-[10px] font-game font-bold text-amber-300 uppercase tracking-wider">
                    Play 3D Video
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Caption Pill */}
            <div className="mt-3 text-center">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-game font-bold text-amber-300 uppercase tracking-widest bg-[#121630] px-3 py-1 rounded-full border border-purple-500/30">
                <span className="material-symbols-outlined text-xs">verified</span>
                OFFICIAL EMBLEM
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <BrandVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
      />
    </>
  );
};
