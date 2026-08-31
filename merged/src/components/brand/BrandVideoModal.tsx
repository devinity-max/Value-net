import React, { useState, useEffect } from 'react';
import { playClickSound, playTradeSuccessSound } from '../../utils/audio';
import { BRAND_CONFIG } from '../../data/brand';

interface BrandVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandVideoModal: React.FC<BrandVideoModalProps> = ({ isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(true);
      setActiveStage(0);
      const stageTimer1 = setTimeout(() => setActiveStage(1), 1200);
      const stageTimer2 = setTimeout(() => setActiveStage(2), 2600);
      const stageTimer3 = setTimeout(() => setActiveStage(3), 4200);

      return () => {
        clearTimeout(stageTimer1);
        clearTimeout(stageTimer2);
        clearTimeout(stageTimer3);
      };
    } else {
      setIsPlaying(false);
      setActiveStage(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReplay = () => {
    playTradeSuccessSound();
    setActiveStage(0);
    setTimeout(() => setActiveStage(1), 1200);
    setTimeout(() => setActiveStage(2), 2600);
    setTimeout(() => setActiveStage(3), 4200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div
        className="w-full max-w-4xl bg-[#090b16] border border-purple-500/40 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Video Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0d1022] z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-amber-400 flex items-center justify-center text-white shadow-md">
              <span className="material-symbols-outlined text-lg">movie</span>
            </div>
            <div>
              <span className="text-[10px] font-game font-bold text-amber-400 uppercase tracking-widest block">
                OFFICIAL 3D IDENTITY REVEAL
              </span>
              <h3 className="text-sm sm:text-base font-black font-game text-white">
                VALUE.NET // Trade Value Calculator Crest Emergence
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#161b36] hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Video Canvas Stage */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden select-none">
          {/* Swirling purple energy waves */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0e0728] via-[#1a0f3d] to-[#080415]" />
          
          {/* Magma Ripple Circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[600px] h-[300px] rounded-[100%] border-4 border-amber-500/30 scale-100 animate-ping opacity-20" />
            <div className="w-[450px] h-[220px] rounded-[100%] border-2 border-purple-500/40 animate-pulse opacity-40" />
            <div className="w-[300px] h-[150px] rounded-[100%] bg-gradient-to-t from-purple-900/60 via-amber-500/20 to-transparent blur-md" />
          </div>

          {/* Floating Embers */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute bottom-10 left-1/4 w-2 h-2 rounded-full bg-amber-400 animate-bounce blur-[1px] opacity-75" />
            <div className="absolute bottom-16 right-1/3 w-1.5 h-1.5 rounded-full bg-purple-300 animate-ping opacity-60" />
            <div className="absolute bottom-24 right-1/4 w-2 h-2 rounded-full bg-yellow-300 animate-pulse opacity-80" />
            <div className="absolute top-1/3 left-1/3 w-1 h-1 rounded-full bg-white animate-ping opacity-90" />
          </div>

          {/* Emergence Animation Stages */}
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-lg">
            {activeStage === 0 && (
              <div className="animate-in fade-in zoom-in-75 duration-700 space-y-3">
                <div className="w-24 h-24 mx-auto rounded-full bg-purple-600/30 border-2 border-amber-400/60 flex items-center justify-center animate-spin">
                  <span className="material-symbols-outlined text-4xl text-amber-300">cyclone</span>
                </div>
                <p className="font-game font-black text-amber-400 uppercase tracking-widest text-sm animate-pulse">
                  Awakening Magma Core...
                </p>
              </div>
            )}

            {activeStage === 1 && (
              <div className="animate-in slide-in-from-bottom-12 fade-in duration-700 space-y-4">
                <div className="w-36 h-36 mx-auto relative">
                  <div className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl animate-pulse" />
                  <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-800 to-amber-500 p-1 shadow-[0_0_40px_rgba(251,191,36,0.6)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-amber-300">shield</span>
                  </div>
                </div>
                <p className="font-game font-black text-white uppercase tracking-widest text-base drop-shadow-md">
                  Rising from the Lava Vault
                </p>
              </div>
            )}

            {(activeStage === 2 || activeStage === 3) && (
              <div className="animate-in zoom-in-90 fade-in duration-1000 flex flex-col items-center">
                {/* 3D Shield Crest Reveal */}
                <div className="relative p-2 rounded-3xl bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] shadow-[0_0_50px_rgba(168,85,247,0.7)] group">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-[#0a0d1a] border-2 border-amber-400/60 overflow-hidden relative flex items-center justify-center">
                    <img
                      src={BRAND_CONFIG.logoCrestUrl}
                      alt="Value.NET Crest"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <h4 className="text-2xl sm:text-3xl font-black font-game text-white tracking-wider drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                    VALUE<span className="text-amber-400">.NET</span>
                  </h4>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181d38] border border-amber-400/50 text-amber-300 font-mono text-[11px] font-bold">
                    TRADE VALUE CALCULATOR // OFFICIAL SEAL
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Video Progress Overlay */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-xs text-slate-300 z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={handleReplay}
                className="p-2 rounded-lg bg-[#161b36] hover:bg-purple-600 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-game font-bold uppercase"
              >
                <span className="material-symbols-outlined text-sm">replay</span>
                <span>Replay Animation</span>
              </button>
              <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">
                STATUS: {activeStage === 3 ? 'REVEAL COMPLETE' : 'EMERGING...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-emerald-300 font-bold uppercase">
                4K 60FPS 3D RENDER
              </span>
            </div>
          </div>
        </div>

        {/* Video Crest Anatomy Breakdown */}
        <div className="p-6 bg-[#0c0f20] border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-3 bg-[#121630] rounded-xl border border-slate-800 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-400 text-lg shrink-0">diamond</span>
            <div>
              <h5 className="font-game font-bold text-white uppercase text-[11px]">Faceted Crystalline Fruit</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Central anime mythical fruit with twisting golden vine stem representing peak trade value.</p>
            </div>
          </div>

          <div className="p-3 bg-[#121630] rounded-xl border border-slate-800 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">trending_up</span>
            <div>
              <h5 className="font-game font-bold text-white uppercase text-[11px]">Real-Time Market Chart</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Rising market curve medal representing active fruit liquidity, hype multipliers, and demand.</p>
            </div>
          </div>

          <div className="p-3 bg-[#121630] rounded-xl border border-slate-800 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-purple-400 text-lg shrink-0">shield</span>
            <div>
              <h5 className="font-game font-bold text-white uppercase text-[11px]">Beveled Steel Shield</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Hexagonal gold & steel armor with purple gemstone insets symbolizing safety and trust.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
