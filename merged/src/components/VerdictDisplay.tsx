import React from 'react';
import { Fruit, TradeAnalysis } from '../types';
import { formatMoney } from '../utils/calc';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface VerdictDisplayProps {
  analysis: TradeAnalysis;
  yourSlots: (Fruit | null)[];
  theirSlots: (Fruit | null)[];
  onLogTrade: () => void;
  onSwapSides: () => void;
  onClearAll: () => void;
}

export const getVerdictStyle = (grade: string) => {
  switch (grade) {
    case 'BW':
      return {
        badge: 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
        text: 'text-emerald-400',
        titleGlow: 'drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]',
        icon: 'workspace_premium',
      };
    case 'W':
      return {
        badge: 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
        text: 'text-emerald-400',
        titleGlow: 'drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]',
        icon: 'trending_up',
      };
    case 'F':
      return {
        badge: 'bg-amber-950/70 border-amber-500/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
        text: 'text-amber-400',
        titleGlow: 'drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]',
        icon: 'balance',
      };
    case 'L':
      return {
        badge: 'bg-rose-950/60 border-rose-500/80 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
        text: 'text-rose-400',
        titleGlow: 'drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]',
        icon: 'trending_down',
      };
    case 'BL':
      return {
        badge: 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.4)]',
        text: 'text-rose-500',
        titleGlow: 'drop-shadow-[0_0_14px_rgba(244,63,94,0.6)]',
        icon: 'warning',
      };
    default:
      return {
        badge: 'bg-slate-900/80 border-slate-700 text-slate-400',
        text: 'text-slate-400',
        titleGlow: '',
        icon: 'tune',
      };
  }
};

/** Dedicated deliberate Mobile Value Indicator positioned between YOUR OFFER and THEIR OFFER */
export const MobileTradeIndicator: React.FC<{
  analysis: TradeAnalysis;
  onSwapSides: () => void;
}> = ({ analysis, onSwapSides }) => {
  const style = getVerdictStyle(analysis.grade);

  return (
    <div className="w-full bg-[#0b0e1e] border-2 border-purple-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden box-border my-2">
      {/* Background radial highlight */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-300"
        style={{
          background: `radial-gradient(circle at center, ${analysis.barColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col gap-2.5">
        {/* Top row: Grade badge + Margin diff + Quick Swap */}
        <div className="flex items-center justify-between gap-2">
          {/* Grade Badge */}
          <div
            className={`px-3 py-1 rounded-full border text-[11px] font-game font-black tracking-wider uppercase flex items-center gap-1 shrink-0 ${style.badge}`}
          >
            <span className="material-symbols-outlined text-xs">{style.icon}</span>
            <span>{analysis.grade === '—' ? 'READY' : `GRADE: ${analysis.grade}`}</span>
          </div>

          {/* Margin badge */}
          <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black truncate">
            <span className="text-[10px] text-slate-400 font-bold uppercase hidden xs:inline">Margin:</span>
            <span
              className={
                analysis.diff > 0
                  ? 'text-emerald-400'
                  : analysis.diff < 0
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }
            >
              {analysis.diff > 0 ? '+' : ''}${formatMoney(analysis.diff)}
            </span>
          </div>

          {/* Quick Swap button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onSwapSides();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 hover:border-purple-400 flex items-center justify-center transition-all shrink-0 min-h-[32px] min-w-[32px] cursor-pointer"
            title="Swap Sides"
          >
            <span className="material-symbols-outlined text-sm">swap_vert</span>
          </button>
        </div>

        {/* Dynamic Balance Meter Bar */}
        <div className="w-full bg-slate-900 h-2.5 rounded-full border border-slate-800 p-0.5 relative overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(4, analysis.barPercentage)}%`,
              backgroundColor: analysis.barColor,
              boxShadow: `0 0 8px ${analysis.barColor}`,
            }}
          />
        </div>

        <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-0.5">
          <span className="text-purple-300 font-bold">▲ YOUR SIDE</span>
          <span className="font-bold text-center text-slate-300 truncate max-w-[140px]">
            {analysis.title}
          </span>
          <span className="text-amber-300 font-bold">▼ THEIR SIDE</span>
        </div>
      </div>
    </div>
  );
};

/** Tactical Verdict & Ledger Actions Panel for Mobile */
export const MobileTacticalVerdict: React.FC<{
  analysis: TradeAnalysis;
  hasItems: boolean;
  onLogTrade: () => void;
  onSwapSides: () => void;
  onClearAll: () => void;
}> = ({ analysis, hasItems, onLogTrade, onSwapSides, onClearAll }) => {
  const style = getVerdictStyle(analysis.grade);

  return (
    <div className="w-full bg-[#0b0e1e]/95 border border-purple-500/20 rounded-2xl p-4 shadow-xl relative overflow-hidden box-border mt-2">
      {/* Title & Subtitle */}
      <div className="text-center mb-3">
        <h3 className={`text-lg font-game font-black uppercase tracking-wider ${style.text} ${style.titleGlow}`}>
          {analysis.title}
        </h3>
        <p className="text-xs text-slate-400 font-sans mt-0.5 line-clamp-2">
          {analysis.subtitle}
        </p>
      </div>

      {/* 40% Beli rule compliance status */}
      {!analysis.isBeliCompliant && (
        <div className="mb-3 bg-amber-950/60 border border-amber-500/40 px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-amber-300 font-game">
          <span className="material-symbols-outlined text-sm shrink-0">info</span>
          <span>Exceeds 40% Beli in-game trading limit</span>
        </div>
      )}

      {/* Demand & Hype Factors */}
      <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono mb-3">
        <div className="bg-[#070913] p-2 rounded-xl border border-slate-800">
          <div className="text-slate-400 uppercase">Demand Score</div>
          <div className="font-game font-bold text-xs text-purple-300 mt-0.5">
            {analysis.factors.demandScore}/10
          </div>
        </div>
        <div className="bg-[#070913] p-2 rounded-xl border border-slate-800">
          <div className="text-slate-400 uppercase">Hype Index</div>
          <div className="font-game font-bold text-xs text-amber-300 mt-0.5">
            {analysis.factors.hypeFactor}/10
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <button
          type="button"
          disabled={!hasItems}
          onClick={() => {
            playSuccessSound();
            onLogTrade();
          }}
          className={`w-full py-3 rounded-xl font-game font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all min-h-[44px] cursor-pointer ${
            hasItems
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 active:scale-98'
              : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
          }`}
        >
          <span className="material-symbols-outlined text-sm">bookmark_add</span>
          <span>Save to Ledger</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onSwapSides();
            }}
            className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 border border-slate-700/80 text-[11px] font-game font-bold uppercase tracking-wider flex items-center justify-center gap-1 min-h-[40px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">swap_horiz</span>
            <span>Swap</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClearAll();
            }}
            className="py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-[11px] font-game font-bold uppercase tracking-wider flex items-center justify-center gap-1 min-h-[40px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">restart_alt</span>
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const VerdictDisplay: React.FC<VerdictDisplayProps> = ({
  analysis,
  yourSlots,
  theirSlots,
  onLogTrade,
  onSwapSides,
  onClearAll,
}) => {
  const hasItems = yourSlots.some((f) => f !== null) || theirSlots.some((f) => f !== null);
  const style = getVerdictStyle(analysis.grade);

  return (
    <div className="flex flex-col items-center justify-between h-full bg-[#0b0e1e]/90 p-4 sm:p-5 rounded-2xl border border-purple-500/20 shadow-2xl relative overflow-hidden box-border">
      {/* Background radial highlight */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-300"
        style={{
          background: `radial-gradient(circle at center, ${analysis.barColor} 0%, transparent 70%)`,
        }}
      />

      {/* Top Header & Grade Badge */}
      <div className="w-full flex flex-col items-center text-center relative z-10">
        <div
          className={`px-4 py-1.5 rounded-full border-2 text-xs font-game font-black tracking-widest uppercase flex items-center gap-1.5 mb-3 transition-all duration-300 ${style.badge}`}
        >
          <span className="material-symbols-outlined text-sm">{style.icon}</span>
          <span>{analysis.grade === '—' ? 'READY' : `GRADE: ${analysis.grade}`}</span>
        </div>

        <h2
          className={`text-2xl sm:text-3xl font-game font-black tracking-wider uppercase mb-1 transition-colors duration-300 ${style.text} ${style.titleGlow}`}
        >
          {analysis.title}
        </h2>
        <p className="text-xs text-slate-400 font-sans max-w-[280px] leading-relaxed line-clamp-2">
          {analysis.subtitle}
        </p>
      </div>

      {/* Center Arbitrage Value Meter */}
      <div className="w-full my-4 flex flex-col items-center relative z-10">
        {/* Difference badge */}
        <div className="bg-[#070913] px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2 mb-3 shadow-inner">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
            Margin:
          </span>
          <span
            className={`text-base sm:text-lg font-mono font-black ${
              analysis.diff > 0
                ? 'text-emerald-400'
                : analysis.diff < 0
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {analysis.diff > 0 ? '+' : ''}${formatMoney(analysis.diff)}
            {analysis.yourMarketValue > 0 && (
              <span className="text-xs font-semibold ml-1.5 opacity-90">
                ({analysis.percentageDiff >= 0 ? '+' : ''}
                {analysis.percentageDiff.toFixed(1)}%)
              </span>
            )}
          </span>
        </div>

        {/* Dynamic Balance Meter Bar */}
        <div className="w-full bg-slate-900 h-3 rounded-full border border-slate-800 p-0.5 relative overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.max(4, analysis.barPercentage)}%`,
              backgroundColor: analysis.barColor,
              boxShadow: `0 0 10px ${analysis.barColor}`,
            }}
          />
        </div>

        <div className="w-full flex justify-between text-[10px] font-mono text-slate-500 px-1">
          <span>YOUR VALUE</span>
          <span>THEIR VALUE</span>
        </div>

        {/* 40% Beli rule compliance status */}
        {!analysis.isBeliCompliant && (
          <div className="mt-3 bg-amber-950/60 border border-amber-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] text-amber-300 font-game">
            <span className="material-symbols-outlined text-xs">info</span>
            <span>Exceeds 40% Beli in-game trading limit</span>
          </div>
        )}
      </div>

      {/* Tactical Factors Grid */}
      <div className="w-full grid grid-cols-2 gap-2 text-center text-[10px] font-mono my-2 relative z-10">
        <div className="bg-[#070913]/90 p-2 rounded-xl border border-slate-800">
          <div className="text-slate-400 uppercase">Demand Score</div>
          <div className="font-game font-bold text-xs text-purple-300 mt-0.5">
            {analysis.factors.demandScore}/10
          </div>
        </div>
        <div className="bg-[#070913]/90 p-2 rounded-xl border border-slate-800">
          <div className="text-slate-400 uppercase">Hype Index</div>
          <div className="font-game font-bold text-xs text-amber-300 mt-0.5">
            {analysis.factors.hypeFactor}/10
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="w-full flex flex-col gap-2 pt-2 border-t border-slate-800/80 relative z-10">
        <button
          type="button"
          disabled={!hasItems}
          onClick={() => {
            playSuccessSound();
            onLogTrade();
          }}
          className={`w-full py-2.5 rounded-xl font-game font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 min-h-[42px] cursor-pointer ${
            hasItems
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 active:scale-98'
              : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
          }`}
        >
          <span className="material-symbols-outlined text-sm">bookmark_add</span>
          <span>Save to Ledger</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onSwapSides();
            }}
            className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 border border-slate-700/80 hover:border-slate-600 text-[11px] font-game font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors min-h-[38px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">swap_horiz</span>
            <span>Swap</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClearAll();
            }}
            className="py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-[11px] font-game font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors min-h-[38px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">restart_alt</span>
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};

