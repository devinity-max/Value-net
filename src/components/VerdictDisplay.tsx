import React from 'react';
import { TradeAnalysis, Fruit } from '../types';
import { formatMoney, formatBeli } from '../utils/calc';

export interface VerdictDisplayProps {
  analysis: TradeAnalysis;
  onConfirmTrade?: () => void;
  onClearTrade?: () => void;
  canConfirm?: boolean;
  onSwapSides?: () => void;
  yourSlots?: (Fruit | null)[];
  theirSlots?: (Fruit | null)[];
  onLogTrade?: () => void;
  onClearAll?: () => void;
  hasItems?: boolean;
}

export const VerdictDisplay: React.FC<VerdictDisplayProps> = ({
  analysis,
  onConfirmTrade,
  onClearTrade,
  canConfirm = false,
  onSwapSides,
  onLogTrade,
  onClearAll,
  hasItems,
}) => {
  const getGradeStyle = () => {
    switch (analysis.grade) {
      case 'BW':
        return {
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-950/40 border-emerald-500/40',
          badgeColor: 'bg-emerald-500 text-slate-950',
        };
      case 'W':
        return {
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-950/30 border-emerald-500/30',
          badgeColor: 'bg-emerald-600 text-white',
        };
      case 'BL':
        return {
          textColor: 'text-rose-400',
          bgColor: 'bg-rose-950/40 border-rose-500/40',
          badgeColor: 'bg-rose-500 text-white',
        };
      case 'L':
        return {
          textColor: 'text-rose-400',
          bgColor: 'bg-rose-950/30 border-rose-500/30',
          badgeColor: 'bg-rose-600 text-white',
        };
      case 'F':
        return {
          textColor: 'text-amber-400',
          bgColor: 'bg-amber-950/30 border-amber-500/30',
          badgeColor: 'bg-amber-500 text-slate-950',
        };
      default:
        return {
          textColor: 'text-slate-400',
          bgColor: 'bg-slate-900/60 border-slate-800',
          badgeColor: 'bg-slate-700 text-slate-300',
        };
    }
  };

  const style = getGradeStyle();
  const handleConfirm = onConfirmTrade || onLogTrade;
  const handleClear = onClearTrade || onClearAll;
  const isActionable = canConfirm || hasItems;

  return (
    <div className={`rounded-2xl border p-5 flex flex-col justify-between backdrop-blur-md transition-all duration-300 ${style.bgColor}`}>
      <div>
        {/* Header / Grade Badge */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-bold font-mono uppercase tracking-widest text-slate-400">
              TACTICAL TRADE VERDICT
            </div>
            <h2 className={`text-2xl font-black font-mono tracking-wide ${style.textColor}`}>
              {analysis.title}
            </h2>
          </div>
          <div className={`px-4 py-1.5 rounded-xl font-black font-mono text-xl tracking-wider shadow-lg ${style.badgeColor}`}>
            {analysis.grade}
          </div>
        </div>

        {/* Subtitle Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          {analysis.subtitle}
        </p>

        {/* Visual Bar Indicator */}
        <div className="space-y-1.5 mb-5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>YOU ({formatMoney(analysis.yourMarketValue)})</span>
            <span className={analysis.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {analysis.diff >= 0 ? '+' : ''}{formatMoney(analysis.diff)} ({analysis.percentageDiff.toFixed(1)}%)
            </span>
            <span>THEM ({formatMoney(analysis.theirMarketValue)})</span>
          </div>
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${analysis.barColor}`}
              style={{ width: `${analysis.barPercentage}%` }}
            />
          </div>
        </div>

        {/* 40% Beli Compliance Status */}
        <div className={`flex items-center gap-2 p-2.5 rounded-xl border mb-5 text-xs font-medium ${analysis.isBeliCompliant ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-rose-950/30 border-rose-500/40 text-rose-300'}`}>
          <span className="material-symbols-outlined text-base">
            {analysis.isBeliCompliant ? 'verified' : 'gavel'}
          </span>
          <div className="flex-1">
            <span className="font-bold">40% In-Game Rule: </span>
            <span>{analysis.isBeliCompliant ? 'Trade is within valid in-game Beli threshold.' : 'Beli difference exceeds 40% trade cap!'}</span>
          </div>
          <div className="font-mono text-[11px] opacity-80">
            {formatBeli(analysis.yourBeliValue)} vs {formatBeli(analysis.theirBeliValue)}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-5">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Demand</div>
            <div className="font-bold text-amber-400 font-mono mt-0.5">{analysis.factors.demandScore}/10</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Hype</div>
            <div className="font-bold text-purple-400 font-mono mt-0.5">{analysis.factors.hypeFactor}/10</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Efficiency</div>
            <div className="font-bold text-emerald-400 font-mono mt-0.5">{analysis.factors.tradeEfficiency}%</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
        {onSwapSides && (
          <button
            onClick={onSwapSides}
            className="px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            title="Swap sides"
          >
            <span className="material-symbols-outlined text-sm">swap_horiz</span>
          </button>
        )}
        {handleClear && (
          <button
            onClick={handleClear}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
        {handleConfirm && (
          <button
            onClick={handleConfirm}
            disabled={!isActionable}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
              isActionable
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
            }`}
          >
            Log Trade
          </button>
        )}
      </div>
    </div>
  );
};

export const MobileTradeIndicator: React.FC<{ analysis: TradeAnalysis; onSwapSides?: () => void }> = ({ analysis, onSwapSides }) => {
  return (
    <div className="lg:hidden w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between mb-4">
      <div>
        <div className="text-[10px] font-mono text-slate-400 uppercase">Current Verdict</div>
        <div className="font-black text-sm text-amber-400">{analysis.title}</div>
      </div>
      <div className="flex items-center gap-2">
        {onSwapSides && (
          <button
            onClick={onSwapSides}
            className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">swap_horiz</span>
          </button>
        )}
        <div className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black font-mono text-sm">
          {analysis.grade}
        </div>
      </div>
    </div>
  );
};

export const MobileTacticalVerdict: React.FC<VerdictDisplayProps> = (props) => {
  return <VerdictDisplay {...props} />;
};
