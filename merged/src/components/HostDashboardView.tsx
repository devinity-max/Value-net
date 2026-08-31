import React, { useState } from 'react';
import { AuthUser, ActiveTab } from '../types';
import { BLOX_FRUITS_DATA } from '../data/fruits';
import { apiCreateGiveaway } from '../utils/giveaways';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

interface HostDashboardViewProps {
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onViewTraderProfile: (username: string) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const HostDashboardView: React.FC<HostDashboardViewProps> = ({
  currentUser,
  onOpenAuth,
  onViewTraderProfile,
  onShowToast,
  onNavigateToTab,
}) => {
  const [title, setTitle] = useState('');
  const [selectedFruitId, setSelectedFruitId] = useState('kitsune');
  const [durationHours, setDurationHours] = useState(24);
  const [ytBoost, setYtBoost] = useState(false);
  const [ytVideoId, setYtVideoId] = useState('');
  const [ytBoostCode, setYtBoostCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (!currentUser) {
    return (
      <div className="pt-28 sm:pt-32 pb-20 px-4 max-w-xl mx-auto text-center font-sans">
        <div className="p-8 bg-[#12162d] border border-purple-500/50 rounded-3xl">
          <span className="material-symbols-outlined text-4xl text-amber-400 mb-3">campaign</span>
          <h2 className="text-xl font-black font-game text-white mb-2">Creator Portal</h2>
          <p className="text-xs text-slate-400 mb-6">
            Log in to host verified Blox Fruits giveaways and engage with your community.
          </p>
          <button
            onClick={onOpenAuth}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-game text-xs font-bold uppercase rounded-xl shadow-lg"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);

    const fruit = BLOX_FRUITS_DATA.find((f) => f.id === selectedFruitId) || BLOX_FRUITS_DATA[0];

    const prize: any = {
      id: `prize-${fruit.id}-${Date.now()}`,
      fruitId: fruit.id,
      quantity: 1,
      name: fruit.name,
      rarity: fruit.rarity,
      icon: fruit.icon,
      marketValue: fruit.marketValue,
      beliPrice: fruit.beliPrice,
      type: fruit.type,
      fruitName: fruit.name,
      fruitIcon: fruit.icon,
      value: fruit.marketValue,
    };

    const res = await apiCreateGiveaway({
      title: title.trim(),
      description: `Official creator giveaway for ${fruit.name}`,
      prizes: [prize],
      endTime: Date.now() + durationHours * 3600 * 1000,
      youtubeBoostEnabled: ytBoost,
      youtubeVideoId: ytBoost ? ytVideoId.trim() : undefined,
      youtubeBoostCode: ytBoost ? ytBoostCode.trim() : undefined,
      youtubeBoostPercentage: ytBoost ? 25 : undefined,
    });

    setLoading(false);

    if (res.success) {
      playTradeSuccessSound();
      onShowToast('Giveaway created successfully!', 'success');
      onNavigateToTab('giveaways');
    } else {
      onShowToast(res.error || 'Failed to create giveaway', 'error');
    }
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1000px] mx-auto w-full font-sans">
      <div className="border-b border-slate-800 pb-6 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 text-amber-300 text-xs font-game font-bold uppercase tracking-widest mb-2">
          <span className="material-symbols-outlined text-sm">celebration</span>
          HOST CONSOLE // COMMUNITY GIVEAWAYS
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-game text-white tracking-wide uppercase">
          Creator & Host Dashboard
        </h1>
      </div>

      <div className="bg-[#0e1224] border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <form onSubmit={handleCreate} className="space-y-6 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Giveaway Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kitsune & Dragon Massive Weekend Giveaway!"
              required
              className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Fruit Prize</label>
              <select
                value={selectedFruitId}
                onChange={(e) => setSelectedFruitId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none"
              >
                {BLOX_FRUITS_DATA.map((fruit) => (
                  <option key={fruit.id} value={fruit.id}>
                    {fruit.name} ({fruit.rarity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Duration (Hours)</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none"
              >
                <option value={1}>1 Hour (Flash Giveaway)</option>
                <option value={6}>6 Hours</option>
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={48}>48 Hours (2 Days)</option>
                <option value={72}>72 Hours (3 Days)</option>
              </select>
            </div>
          </div>

          {/* YouTube secret code boost toggle */}
          <div className="p-4 bg-[#141830] rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white font-game uppercase block">YouTube Video Code Boost</span>
                <span className="text-slate-400 text-[11px]">Allow viewers to input a secret code from your video to increase win chances.</span>
              </div>
              <input
                type="checkbox"
                checked={ytBoost}
                onChange={(e) => setYtBoost(e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>

            {ytBoost && (
              <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">YouTube Video ID</label>
                  <input
                    type="text"
                    value={ytVideoId}
                    onChange={(e) => setYtVideoId(e.target.value)}
                    placeholder="e.g. dQw4w9WgXcQ"
                    className="w-full px-3 py-2 bg-[#0e1224] border border-slate-700 rounded-xl text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Secret Boost Code</label>
                  <input
                    type="text"
                    value={ytBoostCode}
                    onChange={(e) => setYtBoostCode(e.target.value)}
                    placeholder="e.g. VALUE2025"
                    className="w-full px-3 py-2 bg-[#0e1224] border border-slate-700 rounded-xl text-slate-100 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-game font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Publishing Giveaway...' : 'Launch Community Giveaway'}
          </button>
        </form>
      </div>
    </div>
  );
};
