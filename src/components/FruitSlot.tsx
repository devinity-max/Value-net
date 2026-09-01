import React from 'react';
import { Fruit } from '../types';
import { formatMoney } from '../utils/calc';
import { playClickSound } from '../utils/audio';
import { FruitImage } from './FruitImage';

interface FruitSlotProps {
  fruit: Fruit | null;
  index: number;
  side: 'your' | 'their';
  onOpenSelector: () => void;
  onClear: () => void;
}

export const FruitSlot: React.FC<FruitSlotProps> = ({
  fruit,
  index,
  side,
  onOpenSelector,
  onClear,
}) => {
  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'Mythical':
        return 'text-rose-400 border-rose-500/40 bg-rose-950/60 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
      case 'Legendary':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
      case 'Rare':
        return 'text-sky-400 border-sky-500/40 bg-sky-950/60 shadow-[0_0_10px_rgba(14,165,233,0.2)]';
      case 'Uncommon':
        return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60';
      case 'Gamepass':
        return 'text-purple-400 border-purple-500/40 bg-purple-950/60';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-900/80';
    }
  };

  const getRarityGlow = (rarity: string) => {
    switch (rarity) {
      case 'Mythical':
        return 'hover:border-rose-500/80 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]';
      case 'Legendary':
        return 'hover:border-amber-500/80 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      case 'Rare':
        return 'hover:border-sky-500/80 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)]';
      case 'Gamepass':
        return 'hover:border-purple-500/80 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]';
      default:
        return 'hover:border-emerald-500/60 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]';
    }
  };

  if (!fruit) {
    return (
      <button
        type="button"
        id={`slot-${side}-${index}`}
        onClick={() => {
          playClickSound();
          onOpenSelector();
        }}
        className={`group relative h-28 sm:h-36 rounded-xl sm:rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-purple-500/80 bg-[#0a0d1a]/60 hover:bg-[#12162d]/80 transition-all duration-200 flex flex-col items-center justify-center p-2 sm:p-3 text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50 overflow-hidden box-border ${
          side === 'your' ? 'hover:border-purple-400' : 'hover:border-amber-400'
        }`}
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-800/80 group-hover:bg-purple-900/40 group-hover:scale-110 border border-slate-700/60 group-hover:border-purple-500/50 flex items-center justify-center transition-all duration-200 mb-1 sm:mb-2 shrink-0">
          <span className="material-symbols-outlined text-slate-400 group-hover:text-purple-300 text-lg sm:text-xl">
            add
          </span>
        </div>
        <span className="text-[10px] sm:text-[11px] font-game font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-wider truncate max-w-full">
          Slot {index + 1}
        </span>
        <span className="text-[9px] sm:text-[10px] text-slate-500 group-hover:text-purple-300/80 mt-0.5 truncate max-w-full">
          Select Fruit
        </span>
      </button>
    );
  }

  return (
    <div
      id={`slot-${side}-${index}`}
      className={`group relative h-28 sm:h-36 rounded-xl sm:rounded-2xl bg-[#0a0d1a] border-2 border-slate-700/70 p-2 sm:p-3 flex flex-col justify-between transition-all duration-200 box-border overflow-hidden ${getRarityGlow(
        fruit.rarity
      )}`}
    >
      {/* Top action row: Rarity badge + Clear Button */}
      <div className="flex items-center justify-between w-full">
        <span
          className={`text-[8px] sm:text-[9px] font-mono font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-md border tracking-wider truncate max-w-[70%] ${getRarityBadge(
            fruit.rarity
          )}`}
        >
          {fruit.rarity}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playClickSound();
            onClear();
          }}
          className="w-5 h-5 rounded-md bg-slate-800/80 hover:bg-rose-900/80 text-slate-400 hover:text-rose-200 border border-slate-700 hover:border-rose-500/50 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          title="Remove Item"
        >
          <span className="material-symbols-outlined text-[13px] sm:text-[14px]">close</span>
        </button>
      </div>

      {/* Main Content: Clickable to Swap */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          onOpenSelector();
        }}
        className="flex-grow flex flex-col items-center justify-center text-center my-0.5 sm:my-1 focus:outline-none min-w-0"
      >
        <div className="mb-0.5 sm:mb-1 group-hover:scale-105 transition-transform shrink-0">
          <FruitImage
            fruit={fruit}
            size="md"
            showGlow={fruit.rarity === 'Mythical' || fruit.rarity === 'Legendary'}
            className="w-8 h-8 sm:w-10 sm:h-10"
          />
        </div>
        <span className="font-game font-bold text-[11px] sm:text-xs md:text-sm text-white truncate max-w-full group-hover:text-purple-300 transition-colors">
          {fruit.name}
        </span>
      </button>

      {/* Footer Value & Demand */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[9px] sm:text-[10px]">
        <div className="flex items-center gap-0.5 sm:gap-1 truncate">
          <span className="text-slate-400 font-mono font-bold">Val:</span>
          <span className="font-mono font-black text-emerald-400 text-[10px] sm:text-[11px] truncate">
            ${formatMoney(fruit.marketValue)}
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-slate-400 font-mono font-semibold shrink-0">
          <span className="material-symbols-outlined text-[11px] sm:text-[12px] text-amber-400">local_fire_department</span>
          <span>{fruit.demand}/10</span>
        </div>
      </div>
    </div>
  );
};
