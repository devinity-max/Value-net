import React from 'react';
import { playClickSound } from '../utils/audio';

interface NotFoundViewProps {
  onNavigateHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigateHome }) => {
  return (
    <div className="pt-28 sm:pt-36 pb-20 px-4 md:px-8 max-w-lg mx-auto w-full text-center animate-in fade-in duration-300">
      <div className="bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/20 p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center mx-auto shadow-lg shadow-purple-950">
          <span className="material-symbols-outlined text-purple-300 text-3xl">navigation</span>
        </div>

        <div className="space-y-2">
          <div className="text-4xl font-game font-black text-white">404</div>
          <h2 className="text-lg font-game font-bold text-slate-300 uppercase tracking-wider">
            Sector Coordinates Lost
          </h2>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            The requested trade route or terminal view does not exist or has been relocated to another sector.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onNavigateHome();
          }}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 active:scale-98"
        >
          Return to Trade Calculator
        </button>
      </div>
    </div>
  );
};
