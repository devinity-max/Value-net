import React, { useState, useMemo } from 'react';
import { Fruit } from '../types';
import { BLOX_FRUITS_DATA } from '../data/fruits';
import { formatMoney } from '../utils/calc';
import { playClickSound, playSelectSound } from '../utils/audio';

interface FruitSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFruit: (fruit: Fruit) => void;
  targetSide: 'your' | 'their';
  targetSlotIndex: number;
}

export const FruitSelectorModal: React.FC<FruitSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectFruit,
  targetSide,
  targetSlotIndex,
}) => {
  const [search, setSearch] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');

  const filteredFruits = useMemo(() => {
    return BLOX_FRUITS_DATA.filter((fruit) => {
      const matchSearch =
        fruit.name.toLowerCase().includes(search.toLowerCase()) ||
        fruit.rarity.toLowerCase().includes(search.toLowerCase());
      const matchRarity =
        selectedRarity === 'ALL' ||
        fruit.rarity.toUpperCase() === selectedRarity.toUpperCase();
      return matchSearch && matchRarity;
    });
  }, [search, selectedRarity]);

  if (!isOpen) return null;

  const rarities = [
    { label: 'ALL', color: 'border-slate-700' },
    { label: 'MYTHICAL', color: 'border-rose-500/50 text-rose-300' },
    { label: 'LEGENDARY', color: 'border-amber-500/50 text-amber-300' },
    { label: 'RARE', color: 'border-sky-500/50 text-sky-300' },
    { label: 'UNCOMMON', color: 'border-emerald-500/50 text-emerald-300' },
    { label: 'COMMON', color: 'border-slate-600 text-slate-300' },
    { label: 'GAMEPASS', color: 'border-purple-500/50 text-purple-300' },
  ];

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'Mythical':
        return 'text-rose-300 border-rose-500/50 bg-rose-950/60 shadow-[0_0_8px_rgba(244,63,94,0.25)]';
      case 'Legendary':
        return 'text-amber-300 border-amber-500/50 bg-amber-950/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]';
      case 'Rare':
        return 'text-sky-300 border-sky-500/50 bg-sky-950/60 shadow-[0_0_8px_rgba(14,165,233,0.25)]';
      case 'Uncommon':
        return 'text-emerald-300 border-emerald-500/50 bg-emerald-950/60';
      case 'Gamepass':
        return 'text-purple-300 border-purple-500/50 bg-purple-950/60';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-900';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0e1224] border-2 border-purple-500/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden relative box-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0">
              <span className="material-symbols-outlined text-amber-400 text-lg sm:text-xl">inventory_2</span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-game font-bold text-amber-400 uppercase tracking-widest block truncate">
                SELECT FRUIT // {targetSide === 'your' ? 'YOUR OFFER' : 'THEIR OFFER'} (SLOT {targetSlotIndex + 1})
              </span>
              <h3 className="text-base sm:text-xl font-black text-white font-game truncate">Blox Fruits Vault</h3>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#161b36] hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shrink-0 min-w-[32px] min-h-[32px] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-2.5 sm:space-y-3 mb-3 sm:mb-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-purple-400 text-base sm:text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search fruits (e.g. Kitsune, Dragon, Leopard)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-[#141830] border border-purple-500/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none transition-all font-sans font-medium box-border"
            />
          </div>

          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {rarities.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  playClickSound();
                  setSelectedRarity(r.label);
                }}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-game font-bold uppercase tracking-wider transition-all border min-h-[28px] sm:min-h-[32px] cursor-pointer ${
                  selectedRarity === r.label
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-amber-300 shadow-md'
                    : `bg-[#141830] ${r.color} hover:bg-[#1c2242]`
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid List */}
        <div className="overflow-y-auto flex-grow pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 custom-scrollbar">
          {filteredFruits.map((fruit) => (
            <button
              key={fruit.id}
              onClick={() => {
                playSelectSound();
                onSelectFruit(fruit);
                onClose();
              }}
              className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#141830] hover:bg-[#1c2242] border border-purple-500/20 hover:border-amber-400/60 transition-all text-left group cursor-pointer hover:scale-[1.01] shadow-md min-h-[52px] box-border"
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-1">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#090b16] border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-amber-400/50 transition-all shadow-inner">
                  <span className="material-symbols-outlined text-amber-400 text-xl sm:text-2xl">
                    {fruit.icon || 'nutrition'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-black font-game text-white block truncate group-hover:text-amber-300 transition-colors">
                    {fruit.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider px-1 sm:px-1.5 py-0.2 rounded border ${getRarityBadge(
                        fruit.rarity
                      )}`}
                    >
                      {fruit.rarity}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-amber-400 font-game font-bold">
                      ★ {fruit.demand}/10
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-1 font-mono">
                <span className="text-xs sm:text-sm font-black font-game text-emerald-400 block whitespace-nowrap">
                  ${formatMoney(fruit.marketValue)}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium whitespace-nowrap">
                  {fruit.beliPrice ? `$${(fruit.beliPrice / 1_000_000).toFixed(1)}M` : 'Pass'}
                </span>
              </div>
            </button>
          ))}
          {filteredFruits.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 font-game text-xs sm:text-sm">
              No fruits found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

