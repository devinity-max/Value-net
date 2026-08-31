import React, { useState, useMemo } from 'react';
import { Fruit } from '../types';
import { BLOX_FRUITS_DATA } from '../data/fruits';
import { BRAND_CONFIG } from '../data/brand';
import { formatMoney } from '../utils/calc';
import { playClickSound, playSelectSound } from '../utils/audio';
import { AdSlot } from './ads/AdSlot';

interface ValuesViewProps {
  onAddFruitToCalc: (fruit: Fruit, side: 'your' | 'their') => void;
}

export const ValuesView: React.FC<ValuesViewProps> = ({ onAddFruitToCalc }) => {
  const [search, setSearch] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'value' | 'demand' | 'beli' | 'name'>('value');

  const filteredFruits = useMemo(() => {
    return BLOX_FRUITS_DATA.filter((fruit) => {
      const matchSearch =
        fruit.name.toLowerCase().includes(search.toLowerCase()) ||
        fruit.rarity.toLowerCase().includes(search.toLowerCase()) ||
        fruit.type.toLowerCase().includes(search.toLowerCase());
      const matchRarity =
        selectedRarity === 'ALL' ||
        fruit.rarity.toUpperCase() === selectedRarity.toUpperCase();
      return matchSearch && matchRarity;
    }).sort((a, b) => {
      if (sortBy === 'value') return b.marketValue - a.marketValue;
      if (sortBy === 'demand') return (b.demand || 0) - (a.demand || 0);
      if (sortBy === 'beli') return (b.beliPrice || 0) - (a.beliPrice || 0);
      return a.name.localeCompare(b.name);
    });
  }, [search, selectedRarity, sortBy]);

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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'Rising':
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-game text-[10px] font-bold flex items-center gap-1">
            ▲ Rising
          </span>
        );
      case 'Falling':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/40 text-rose-300 font-game text-[10px] font-bold flex items-center gap-1">
            ▼ Falling
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-slate-900/60 border border-slate-700 text-slate-400 font-game text-[10px] font-bold flex items-center gap-1">
            ● Stable
          </span>
        );
    }
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1240px] mx-auto w-full animate-in fade-in duration-300">
      {/* Header with Official Crest */}
      <div className="text-center mb-10 max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] shadow-[0_0_25px_rgba(168,85,247,0.4)] mb-3 overflow-hidden">
          <img
            src={BRAND_CONFIG.logoCrestUrl}
            alt="Value.NET Official Seal"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-[14px]"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161b36] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-game font-bold uppercase tracking-wider text-purple-200">
            MARKET DATABASE & LIQUIDITY TELEMETRY
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black font-game tracking-tight text-white mb-3">
          FRUIT VALUES & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">DEMAND</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Official Blox Fruits valuation database with updated market values, demand ranks, and trend signals.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="game-panel p-5 sm:p-6 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-purple-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search fruits by name, rarity, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#141830] border border-purple-500/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all font-sans font-medium"
            />
          </div>

          <div className="flex items-center gap-2.5 font-game text-xs text-slate-300">
            <span className="font-bold">SORT BY:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#141830] border border-purple-500/30 text-slate-100 px-3.5 py-2 rounded-xl outline-none cursor-pointer focus:border-amber-400 font-sans text-xs font-semibold"
            >
              <option value="value">Highest Market Value</option>
              <option value="demand">Highest Demand (1-10)</option>
              <option value="beli">Highest In-Game Beli</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800">
          {rarities.map((r) => (
            <button
              key={r.label}
              onClick={() => {
                playClickSound();
                setSelectedRarity(r.label);
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-game font-bold uppercase tracking-wider transition-all border ${
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

      {/* Grid of Fruit Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredFruits.map((fruit, idx) => (
          <React.Fragment key={fruit.id}>
            {idx === 3 && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <AdSlot
                  placement="marketplace-native"
                  variant="Native"
                  className="my-2"
                />
              </div>
            )}
            <div
              className="p-5 sm:p-6 rounded-3xl bg-[#0e1224]/80 border-2 border-purple-500/20 hover:border-amber-400/60 transition-all flex flex-col justify-between group shadow-lg hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:scale-[1.01]"
            >
            <div>
              <div className="flex items-start justify-between mb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#090b16] border border-purple-500/40 flex items-center justify-center group-hover:scale-105 group-hover:border-amber-400/60 transition-all shadow-inner">
                    <span className="material-symbols-outlined text-amber-400 text-2xl">
                      {fruit.icon || 'nutrition'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black font-game text-lg text-white group-hover:text-amber-300 transition-colors">
                      {fruit.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md border ${getRarityBadge(
                          fruit.rarity
                        )}`}
                      >
                        {fruit.rarity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-game font-semibold">
                        {fruit.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div>{getTrendIcon(fruit.trend)}</div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed min-h-[36px] line-clamp-2">
                {fruit.description}
              </p>

              {/* Stats Metrics */}
              <div className="grid grid-cols-3 gap-2 my-4 py-3 bg-[#0a0d1a] px-2 rounded-2xl border border-slate-800 font-mono text-center">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">MARKET VALUE</span>
                  <span className="text-sm sm:text-base font-black font-game text-emerald-400">
                    ${formatMoney(fruit.marketValue)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">DEMAND</span>
                  <span className="text-sm sm:text-base font-black font-game text-amber-400">
                    ★ {fruit.demand || 5}/10
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">BELI COST</span>
                  <span className="text-xs sm:text-sm font-bold font-game text-slate-300">
                    {fruit.beliPrice ? `$${formatMoney(fruit.beliPrice)}` : 'Pass'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions to Calculator */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => {
                  playSelectSound();
                  onAddFruitToCalc(fruit, 'your');
                }}
                className="py-2.5 rounded-xl bg-[#161b36] hover:bg-purple-900/60 border border-purple-500/30 hover:border-purple-400 text-slate-100 text-xs font-game font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 shadow-md"
              >
                <span className="material-symbols-outlined text-sm text-purple-400">add</span> + OFFER (YOU)
              </button>
              <button
                onClick={() => {
                  playSelectSound();
                  onAddFruitToCalc(fruit, 'their');
                }}
                className="py-2.5 rounded-xl bg-[#161b36] hover:bg-amber-900/60 border border-purple-500/30 hover:border-amber-400 text-slate-100 text-xs font-game font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 shadow-md"
              >
                <span className="material-symbols-outlined text-sm text-amber-400">add</span> + OFFER (THEM)
              </button>
            </div>
          </div>
        </React.Fragment>
      ))}
      </div>
    </div>
  );
};
