import React, { useState } from 'react';
import { useFruits } from '../hooks/useFruits';
import { formatMoney, formatBeli } from '../utils/calc';
import { FruitImage } from './FruitImage';

export const WikiView: React.FC = () => {
  const fruits = useFruits();
  const [search, setSearch] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('All');

  const filtered = (fruits || []).filter((f): f is (typeof fruits)[number] => {
    if (!f) return false;
    const name = f.name || '';
    const desc = f.description || '';
    const rarity = f.rarity || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || desc.toLowerCase().includes(search.toLowerCase());
    const matchesRarity = selectedRarity === 'All' || rarity.toLowerCase() === selectedRarity.toLowerCase();
    return matchesSearch && matchesRarity;
  });

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300">
      <div className="mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
        <div className="w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] shadow-[0_0_20px_rgba(168,85,247,0.3)] shrink-0 overflow-hidden">
          <img
            src="/assets/logo.png"
            alt="Value.NET Official Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-[14px]"
          />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-game uppercase tracking-wide">
            BLOX FRUITS WIKI & ENCYCLOPEDIA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete combat mechanics, in-game Beli shop values, awakened abilities, and market demand stats.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search abilities, fruits, pass..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-500 text-sm">search</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'Mythical', 'Legendary', 'Rare', 'Gamepass'].map((rarity) => (
            <button
              key={rarity}
              onClick={() => setSelectedRarity(rarity)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                selectedRarity === rarity
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {rarity}
            </button>
          ))}
        </div>
      </div>

      {/* Wiki Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((fruit) => (
          <div
            key={fruit.id}
            className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <FruitImage fruit={fruit} size="md" />
                <div>
                  <h3 className="text-base font-black text-white font-mono">{fruit.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                      {fruit.rarity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 uppercase">
                      {fruit.type}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">{fruit.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs font-mono text-center">
              <div className="p-2 rounded-xl bg-slate-950">
                <div className="text-[10px] text-slate-400 uppercase">Market Value</div>
                <div className="font-bold text-amber-400">{formatMoney(fruit.marketValue)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950">
                <div className="text-[10px] text-slate-400 uppercase">Beli Price</div>
                <div className="font-bold text-slate-200">{formatBeli(fruit.beliPrice)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
