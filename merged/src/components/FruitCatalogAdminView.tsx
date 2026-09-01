import React, { useState, useEffect } from 'react';
import { AuthUser, ActiveTab, Fruit } from '../types';
import { adminListFruits, updateFruit } from '../utils/fruitsApi';
import { formatMoney } from '../utils/calc';
import { isOwner, isAdmin } from '../utils/permissions';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

interface FruitCatalogAdminViewProps {
  currentUser: AuthUser | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onShowAuthModal: () => void;
}

export const FruitCatalogAdminView: React.FC<FruitCatalogAdminViewProps> = ({
  currentUser,
  onNavigateTab,
  onShowAuthModal,
}) => {
  const [fruitsList, setFruitsList] = useState<Fruit[]>([]);
  const [editingFruit, setEditingFruit] = useState<Fruit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canAccess = isOwner(currentUser) || isAdmin(currentUser);

  useEffect(() => {
    if (!canAccess) return;
    let cancelled = false;
    setLoading(true);
    adminListFruits()
      .then((list) => { if (!cancelled) setFruitsList(list); })
      .catch((err) => { if (!cancelled) setErrorNotice(err.message || 'Failed to load catalog.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="pt-28 sm:pt-32 pb-20 px-4 max-w-xl mx-auto text-center font-sans">
        <div className="p-8 bg-[#12162d] border border-rose-500/50 rounded-3xl">
          <span className="material-symbols-outlined text-4xl text-rose-400 mb-3">lock</span>
          <h2 className="text-xl font-black font-game text-white mb-2">Restricted Access</h2>
          <p className="text-xs text-slate-400 mb-4">
            Catalog administration requires elevated platform permissions.
          </p>
          <button
            onClick={() => onNavigateTab('calculator')}
            className="px-6 py-2.5 bg-purple-600 text-white font-game text-xs font-bold uppercase rounded-xl"
          >
            Return to Calculator
          </button>
        </div>
      </div>
    );
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFruit) return;

    setSaving(true);
    setErrorNotice(null);
    try {
      const updated = await updateFruit(editingFruit.id, {
        marketValue: editingFruit.marketValue,
        demand: editingFruit.demand,
        trend: editingFruit.trend,
        beliPrice: editingFruit.beliPrice,
      });
      setFruitsList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      playTradeSuccessSound();
      setSuccessNotice(`Updated valuation parameters for ${updated.name}`);
      setEditingFruit(null);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to save changes — you may not have catalog admin access.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = fruitsList.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.rarity.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-game font-bold uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-sm">tune</span>
            MARKET ARBITRAGE ENGINE // CATALOG ADMIN
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-game text-white tracking-wide uppercase">
            Fruit Catalog & Valuation Controls
          </h1>
        </div>
        <button
          onClick={() => onNavigateTab('owner-control')}
          className="px-4 py-2 bg-[#181d38] border border-slate-700 text-slate-300 font-game font-bold text-xs uppercase rounded-xl hover:text-white"
        >
          ← Back to Admin Console
        </button>
      </div>

      {errorNotice && (
        <div className="mb-6 p-4 bg-rose-950/80 border border-rose-500 rounded-2xl text-rose-300 text-xs font-game font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {errorNotice}
        </div>
      )}

      {loading && (
        <div className="mb-6 text-xs text-slate-400 font-mono">Loading catalog…</div>
      )}

      {successNotice && (
        <div className="mb-6 p-4 bg-emerald-950/80 border border-emerald-500 rounded-2xl text-emerald-300 text-xs font-game font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successNotice}
        </div>
      )}

      {/* Edit modal */}
      {editingFruit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0e1224] border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-black font-game text-white mb-4">
              Edit Fruit: <span className="text-amber-400">{editingFruit.name}</span>
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Market Value ($)</label>
                  <input
                    type="number"
                    value={editingFruit.marketValue}
                    onChange={(e) =>
                      setEditingFruit({ ...editingFruit, marketValue: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Demand (1 - 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingFruit.demand || 5}
                    onChange={(e) =>
                      setEditingFruit({ ...editingFruit, demand: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Trend</label>
                  <select
                    value={editingFruit.trend || 'Stable'}
                    onChange={(e) =>
                      setEditingFruit({ ...editingFruit, trend: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none"
                  >
                    <option value="Rising">Rising</option>
                    <option value="Stable">Stable</option>
                    <option value="Falling">Falling</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Beli In-Game Price ($)</label>
                  <input
                    type="number"
                    value={editingFruit.beliPrice || 0}
                    onChange={(e) =>
                      setEditingFruit({ ...editingFruit, beliPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-game font-bold uppercase rounded-xl shadow-lg disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFruit(null)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-game font-bold uppercase rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Catalog items search and list */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Filter catalog fruits by name or rarity..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-[#141830] border border-slate-700 rounded-2xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((fruit) => (
            <div
              key={fruit.id}
              className="bg-[#0e1224] border border-slate-800 hover:border-purple-500/40 p-4 rounded-2xl flex items-center justify-between transition-all"
            >
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block">
                  {fruit.rarity}
                </span>
                <h4 className="text-sm font-bold text-white font-game">{fruit.name}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                  <span className="text-amber-400 font-bold">${formatMoney(fruit.marketValue)}</span>
                  <span className="text-slate-400">Demand: {fruit.demand}/10</span>
                  <span
                    className={`${
                      fruit.trend === 'Rising'
                        ? 'text-emerald-400'
                        : fruit.trend === 'Falling'
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {fruit.trend}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  playClickSound();
                  setEditingFruit({ ...fruit });
                }}
                className="p-2 bg-[#181d38] hover:bg-amber-500 hover:text-black text-amber-300 rounded-xl transition-all"
                title="Edit values"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
