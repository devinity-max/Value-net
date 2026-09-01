import React, { useState } from 'react';
import { Fruit, TraderProfile } from '../types';
import { useFruits } from '../hooks/useFruits';
import { formatMoney } from '../utils/calc';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

export interface CreateTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: TraderProfile;
  onCreateTrade?: (tradeData: {
    offeringFruits: Fruit[];
    seekingFruits: Fruit[];
    server: string;
    notes: string;
  }) => void;
  onTradeCreated?: (newAd: any) => void;
}

export const CreateTradeModal: React.FC<CreateTradeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreateTrade,
  onTradeCreated,
}) => {
  const [offering, setOffering] = useState<Fruit[]>([]);
  const [seeking, setSeeking] = useState<Fruit[]>([]);
  const [server, setServer] = useState('Second Sea (Cafe)');
  const [notes, setNotes] = useState('');
  const [activePickerSide, setActivePickerSide] = useState<'offering' | 'seeking' | null>(null);
  const fruits = useFruits();

  if (!isOpen) return null;

  const handleAddFruit = (side: 'offering' | 'seeking', fruit: Fruit) => {
    playClickSound();
    if (side === 'offering' && offering.length < 4) {
      setOffering([...offering, fruit]);
    } else if (side === 'seeking' && seeking.length < 4) {
      setSeeking([...seeking, fruit]);
    }
    setActivePickerSide(null);
  };

  const handleRemoveFruit = (side: 'offering' | 'seeking', index: number) => {
    playClickSound();
    if (side === 'offering') {
      setOffering(offering.filter((_, i) => i !== index));
    } else {
      setSeeking(seeking.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (offering.length === 0 && seeking.length === 0) return;
    playTradeSuccessSound();
    const tradeData = {
      offeringFruits: offering,
      seekingFruits: seeking,
      server,
      notes,
    };
    if (onCreateTrade) onCreateTrade(tradeData);
    if (onTradeCreated) onTradeCreated(tradeData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0e1224] border-2 border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
            </div>
            <div>
              <span className="text-[10px] font-game font-bold text-amber-400 uppercase tracking-widest block">
                LIVE MARKETPLACE
              </span>
              <h3 className="text-xl font-black text-white font-game">Post Trade Advertisement</h3>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-rose-950/60 transition-all"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 font-sans">
          {/* Offering & Seeking Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Offering side */}
            <div className="p-4 bg-[#141830] rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-game font-bold text-emerald-400 uppercase tracking-wider">
                  You Are Offering ({offering.length}/4)
                </span>
                {offering.length < 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActivePickerSide('offering');
                    }}
                    className="px-2 py-1 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-game font-bold"
                  >
                    + Add
                  </button>
                )}
              </div>
              <div className="space-y-2 min-h-[100px]">
                {offering.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-[#0d1021] p-2.5 rounded-xl border border-slate-800 text-xs"
                  >
                    <span className="font-bold text-white">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-mono font-bold">${formatMoney(f.marketValue)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFruit('offering', i)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  </div>
                ))}
                {offering.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500 font-mono">
                    No fruits selected
                  </div>
                )}
              </div>
            </div>

            {/* Seeking side */}
            <div className="p-4 bg-[#141830] rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-game font-bold text-amber-400 uppercase tracking-wider">
                  You Are Seeking ({seeking.length}/4)
                </span>
                {seeking.length < 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActivePickerSide('seeking');
                    }}
                    className="px-2 py-1 bg-amber-950 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-game font-bold"
                  >
                    + Add
                  </button>
                )}
              </div>
              <div className="space-y-2 min-h-[100px]">
                {seeking.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-[#0d1021] p-2.5 rounded-xl border border-slate-800 text-xs"
                  >
                    <span className="font-bold text-white">{f.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-mono font-bold">${formatMoney(f.marketValue)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFruit('seeking', i)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  </div>
                ))}
                {seeking.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500 font-mono">
                    No fruits selected
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fruit selector inline popup */}
          {activePickerSide && (
            <div className="p-4 bg-[#0a0d1a] border border-purple-500/50 rounded-2xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-game font-bold text-purple-300 uppercase">
                  Pick fruit for {activePickerSide === 'offering' ? 'Offering' : 'Seeking'}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePickerSide(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {fruits.map((fruit) => (
                  <button
                    key={fruit.id}
                    type="button"
                    onClick={() => handleAddFruit(activePickerSide, fruit)}
                    className="p-2 bg-[#141830] hover:bg-[#1f254f] border border-slate-800 hover:border-purple-500 rounded-xl text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white truncate">{fruit.name}</div>
                    <div className="text-[10px] text-amber-400 font-mono">${formatMoney(fruit.marketValue)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Server & Notes */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 mb-1 uppercase">
                Trading Location / Sea
              </label>
              <select
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="w-full bg-[#141830] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
              >
                <option value="Third Sea (Mansion)">Third Sea (Mansion)</option>
                <option value="Second Sea (Cafe)">Second Sea (Cafe)</option>
                <option value="First Sea (Starter)">First Sea (Starter)</option>
                <option value="Private VIP Server">Private VIP Server</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-400 mb-1 uppercase">
                Trade Notes / Adds (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Willing to add Buddha for fast trade"
                className="w-full bg-[#141830] border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={offering.length === 0 && seeking.length === 0}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            Publish Live Trade Listing
          </button>
        </form>
      </div>
    </div>
  );
};
