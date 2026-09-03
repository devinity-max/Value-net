import React, { useState, useEffect, useMemo } from 'react';
import { AuthUser, ActiveTab, GiveawayItem, Fruit } from '../types';
import { useFruits } from '../hooks/useFruits';
import {
  apiCreateGiveaway,
  apiGetGiveaways,
  apiDrawGiveawayWinner,
  apiEndGiveaway,
  apiCancelGiveaway,
} from '../utils/giveaways';
import { formatMoney } from '../utils/calc';
import { playClickSound, playSuccessSound, playCoinSound } from '../utils/audio';
import { canHostGiveaways } from '../utils/permissions';
import { FruitImage } from './FruitImage';
import { ParticipantsModal } from './ParticipantsModal';

export interface HostDashboardViewProps {
  currentUser: AuthUser | null;
  onOpenAuth?: () => void;
  onViewTraderProfile?: (username: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
}

export const HostDashboardView: React.FC<HostDashboardViewProps> = ({
  currentUser,
  onOpenAuth,
  onViewTraderProfile,
  onShowToast,
  onNavigateToTab,
}) => {
  const allFruits = useFruits();

  // Tab State
  const [activeSubTab, setActiveSubTab] = useState<'CREATE' | 'MANAGE'>('CREATE');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [allowLeave, setAllowLeave] = useState(true);

  // Selected Prizes
  const [selectedPrizes, setSelectedPrizes] = useState<
    Array<{ fruit: Fruit; quantity: number }>
  >([]);

  // Fruit Selector Sub-state
  const [fruitSearch, setFruitSearch] = useState('');
  const [fruitRarityFilter, setFruitRarityFilter] = useState('ALL');
  const [isFruitPickerOpen, setIsFruitPickerOpen] = useState(false);

  // Eligibility Rules
  const [minTrades, setMinTrades] = useState('0');
  const [minAccountAgeDays, setMinAccountAgeDays] = useState('0');

  // YouTube & Secret Code Boost
  const [youtubeBoostEnabled, setYoutubeBoostEnabled] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeBoostPercentage, setYoutubeBoostPercentage] = useState<5 | 10>(10);
  const [youtubeSecretCode, setYoutubeSecretCode] = useState('');
  const [showSecretCodePlaintext, setShowSecretCodePlaintext] = useState(false);

  // Management State
  const [hostedGiveaways, setHostedGiveaways] = useState<GiveawayItem[]>([]);
  const [loadingHosted, setLoadingHosted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedManageGw, setSelectedManageGw] = useState<GiveawayItem | null>(null);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);

  const isAuthorized =
    currentUser &&
    (currentUser.role === 'ROOT_OWNER' ||
      currentUser.role === 'ADMIN' ||
      currentUser.role === 'APPROVED_CREATOR');

  // Filtered Fruits for Prize Picker
  const filteredFruits = useMemo(() => {
    return (allFruits || []).filter((f) => {
      if (!f) return false;
      const matchSearch =
        (f.name || '').toLowerCase().includes(fruitSearch.toLowerCase()) ||
        (f.rarity || '').toLowerCase().includes(fruitSearch.toLowerCase());
      const matchRarity =
        fruitRarityFilter === 'ALL' ||
        (f.rarity || '').toUpperCase() === fruitRarityFilter.toUpperCase();
      return matchSearch && matchRarity;
    });
  }, [allFruits, fruitSearch, fruitRarityFilter]);

  // Total Prize Value Calculation
  const totalPrizeMarketValue = useMemo(() => {
    return selectedPrizes.reduce((sum, item) => {
      const val = item.fruit.marketValue || item.fruit.beliPrice || 0;
      return sum + val * item.quantity;
    }, 0);
  }, [selectedPrizes]);

  // Load Hosted Giveaways
  const loadHostedGiveaways = async () => {
    if (!currentUser) return;
    setLoadingHosted(true);
    const res = await apiGetGiveaways({
      filter: 'ALL',
      hostId: currentUser.role === 'ROOT_OWNER' || currentUser.role === 'ADMIN' ? undefined : currentUser.id,
      limit: 30,
    });
    if (res.success) {
      setHostedGiveaways(res.giveaways);
    }
    setLoadingHosted(false);
  };

  useEffect(() => {
    if (currentUser) {
      loadHostedGiveaways();
    }
  }, [currentUser, activeSubTab]);

  // Add Fruit to Prizes
  const handleAddPrize = (fruit: Fruit) => {
    playClickSound();
    setSelectedPrizes((prev) => {
      const existing = prev.find((p) => p.fruit.id === fruit.id);
      if (existing) {
        return prev.map((p) =>
          p.fruit.id === fruit.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { fruit, quantity: 1 }];
    });
  };

  // Remove / Decrease Fruit Prize
  const handleRemovePrize = (fruitId: string) => {
    playClickSound();
    setSelectedPrizes((prev) => prev.filter((p) => p.fruit.id !== fruitId));
  };

  const handleUpdatePrizeQty = (fruitId: string, delta: number) => {
    playClickSound();
    setSelectedPrizes((prev) =>
      prev
        .map((p) => {
          if (p.fruit.id === fruitId) {
            const newQty = Math.max(1, p.quantity + delta);
            return { ...p, quantity: newQty };
          }
          return p;
        })
        .filter((p) => p.quantity > 0)
    );
  };

  // Create Giveaway Submission
  const handleSubmitGiveaway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }

    if (!isAuthorized) {
      onShowToast?.(
        'Only Approved Creators, Admins, and Root Owner can host giveaways.',
        'error'
      );
      return;
    }

    if (title.trim().length < 3) {
      onShowToast?.('Giveaway title must be at least 3 characters long.', 'error');
      return;
    }

    if (description.trim().length < 10) {
      onShowToast?.('Please write a description (minimum 10 characters).', 'error');
      return;
    }

    if (selectedPrizes.length === 0) {
      onShowToast?.('Please select at least one fruit prize for the giveaway.', 'error');
      return;
    }

    if (youtubeBoostEnabled) {
      if (!youtubeUrl.trim()) {
        onShowToast?.('Please provide a valid YouTube video URL or ID.', 'error');
        return;
      }
      if (!youtubeSecretCode.trim() || youtubeSecretCode.trim().length < 2) {
        onShowToast?.(
          'Please specify a secret code for viewers to find in your video (min 2 chars).',
          'error'
        );
        return;
      }
    }

    setIsSubmitting(true);

    const prizesPayload = selectedPrizes.map((p, idx) => ({
      id: `pz-${Date.now()}-${idx}`,
      fruitId: p.fruit.id,
      name: p.fruit.name,
      rarity: p.fruit.rarity,
      icon: p.fruit.icon || 'nutrition',
      marketValue: p.fruit.marketValue || 0,
      beliPrice: p.fruit.beliPrice || 0,
      type: p.fruit.type || 'Natural',
      quantity: p.quantity,
    }));

    const now = Date.now();
    const durationMs = (parseFloat(durationHours) || 24) * 3600000;
    const endsAt = now + durationMs;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      prizes: prizesPayload,
      startsAt: now,
      endsAt,
      maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : null,
      allowLeave,
      status: 'ACTIVE',
      eligibility: {
        minTrades: parseInt(minTrades, 10) || 0,
        minAccountAgeDays: parseInt(minAccountAgeDays, 10) || 0,
        verifiedAccountRequired: true,
      },
      youtubeBoostEnabled,
      youtubeUrl: youtubeBoostEnabled ? youtubeUrl.trim() : undefined,
      youtubeSecretCode: youtubeBoostEnabled ? youtubeSecretCode.trim() : undefined,
      youtubeBoostPercentage: youtubeBoostEnabled ? youtubeBoostPercentage : undefined,
    };

    const res = await apiCreateGiveaway(payload);
    setIsSubmitting(false);

    if (res.success) {
      playSuccessSound();
      onShowToast?.('🎉 Giveaway launched successfully to the community!', 'success');
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedPrizes([]);
      setYoutubeBoostEnabled(false);
      setYoutubeUrl('');
      setYoutubeSecretCode('');
      setActiveSubTab('MANAGE');
      loadHostedGiveaways();
    } else {
      onShowToast?.(res.error || 'Failed to create giveaway.', 'error');
    }
  };

  // Draw Winner Action
  const handleDrawWinner = async (gw: GiveawayItem) => {
    if (!window.confirm(`Draw winner for "${gw.title}" now using provably fair weighted RNG?`)) {
      return;
    }
    const res = await apiDrawGiveawayWinner(gw.id);
    if (res.success && res.winner) {
      playCoinSound();
      onShowToast?.(
        `🏆 Winner drawn: @${res.winner.username}${res.winner.hasYoutubeBoost ? ' (with YouTube Boost!)' : ''}`,
        'success'
      );
      loadHostedGiveaways();
    } else {
      onShowToast?.(res.error || 'Failed to draw winner.', 'error');
    }
  };

  // End Giveaway Early
  const handleEndGiveaway = async (gw: GiveawayItem) => {
    if (!window.confirm(`End giveaway "${gw.title}" early? Entrants pool will be frozen.`)) {
      return;
    }
    const res = await apiEndGiveaway(gw.id);
    if (res.success) {
      playClickSound();
      onShowToast?.('Giveaway concluded. You may now draw the winner.', 'info');
      loadHostedGiveaways();
    } else {
      onShowToast?.(res.error || 'Failed to end giveaway.', 'error');
    }
  };

  // Cancel Giveaway
  const handleCancelGiveaway = async (gw: GiveawayItem) => {
    if (!window.confirm(`Are you sure you want to cancel "${gw.title}"?`)) {
      return;
    }
    const res = await apiCancelGiveaway(gw.id);
    if (res.success) {
      playClickSound();
      onShowToast?.('Giveaway cancelled.', 'info');
      loadHostedGiveaways();
    } else {
      onShowToast?.(res.error || 'Failed to cancel giveaway.', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full text-center">
        <div className="bg-[#0b0e1b] border border-purple-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-4">
          <span className="material-symbols-outlined text-5xl text-purple-400">lock</span>
          <h1 className="text-2xl sm:text-3xl font-game font-black text-white uppercase tracking-wider">
            Creator Authentication Required
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Please sign in to access the Host Giveaway Terminal and launch verified Blox Fruits drops.
          </p>
          <button
            onClick={onOpenAuth}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  if (!canHostGiveaways(currentUser)) {
    return (
      <div className="pt-28 sm:pt-32 pb-20 px-4 max-w-4xl mx-auto text-center space-y-6">
        <div className="bg-rose-950/80 border-2 border-rose-500/80 p-8 sm:p-12 rounded-3xl shadow-2xl backdrop-blur-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
            <span className="material-symbols-outlined text-3xl">shield_lock</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-game font-black text-white uppercase tracking-wider">
            403 — Host Clearance Required
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto font-sans">
            Hosting community giveaways requires <strong>APPROVED_CREATOR</strong> clearance or higher. Standard <strong>MEMBER</strong> accounts can participate in all active giveaways but cannot launch drops.
          </p>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('giveaways')}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game text-xs font-bold uppercase transition-all shadow-lg cursor-pointer"
            >
              Browse Active Community Giveaways
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 sm:pt-28 pb-20 px-3 sm:px-6 md:px-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[10px] font-game font-bold text-purple-300 uppercase tracking-wider">
              {currentUser.role} HOST TERMINAL
            </span>
            <span className="text-xs text-slate-500 font-mono">•</span>
            <span className="text-xs text-emerald-400 font-mono font-bold">PROVABLY FAIR RNG</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-game font-black text-white uppercase tracking-wide">
            Host & Creator Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Create verified giveaways, configure optional YouTube Secret Code boosts with server-side HMAC hashing, and manage winner selection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('giveaways')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-xs font-game font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm text-purple-400">storefront</span>
              <span>View Terminal</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
        <button
          onClick={() => {
            playClickSound();
            setActiveSubTab('CREATE');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-game font-bold uppercase transition-all flex items-center gap-2 ${
            activeSubTab === 'CREATE'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-[#070913] border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          <span>Create Giveaway</span>
        </button>

        <button
          onClick={() => {
            playClickSound();
            setActiveSubTab('MANAGE');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-game font-bold uppercase transition-all flex items-center gap-2 ${
            activeSubTab === 'MANAGE'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-[#070913] border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-sm">dashboard_customize</span>
          <span>Manage Hosted Drops ({hostedGiveaways.length})</span>
        </button>
      </div>

      {/* SubTab 1: CREATE GIVEAWAY FORM */}
      {activeSubTab === 'CREATE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmitGiveaway} className="space-y-6">
              {/* Card 1: Basic Info */}
              <div className="bg-[#0b0e1b] border border-purple-500/20 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <span className="material-symbols-outlined text-purple-400 text-lg">edit_note</span>
                  <h2 className="font-game font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                    1. Giveaway Details
                  </h2>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block mb-1">
                    Giveaway Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 🔥 100K SUBS MYTHICAL KITSUNE & DRAGON DROP"
                    maxLength={90}
                    className="w-full px-4 py-3 bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                    required
                  />
                  <div className="text-[10px] text-slate-500 font-mono text-right mt-1">
                    {title.length}/90 chars
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block mb-1">
                    Description & Instructions <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain what viewers must do, prize distribution details, and requirements..."
                    rows={3}
                    maxLength={1500}
                    className="w-full px-4 py-3 bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                    required
                  />
                  <div className="text-[10px] text-slate-500 font-mono text-right mt-1">
                    {description.length}/1500 chars
                  </div>
                </div>
              </div>

              {/* Card 2: Prize Items Selector */}
              <div className="bg-[#0b0e1b] border border-purple-500/20 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">featured_seasonal_and_gifts</span>
                    <h2 className="font-game font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                      2. Prize Items ({selectedPrizes.length})
                    </h2>
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    Total Value: ${formatMoney(totalPrizeMarketValue)}
                  </div>
                </div>

                {/* Selected Prizes list */}
                {selectedPrizes.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#070913] border border-dashed border-slate-800 text-center space-y-2">
                    <span className="material-symbols-outlined text-3xl text-slate-600">inventory_2</span>
                    <p className="text-xs text-slate-400 font-sans">
                      No prize items selected yet. Choose fruits from the catalog below.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedPrizes.map((item) => (
                      <div
                        key={item.fruit.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-[#070913] border border-purple-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <FruitImage fruit={item.fruit} size="sm" className="w-9 h-9 rounded-xl" />
                          <div>
                            <div className="text-xs font-game font-bold text-white flex items-center gap-2">
                              <span>{item.fruit.name}</span>
                              <span className="text-[10px] font-mono text-purple-300">
                                ({item.fruit.rarity})
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-emerald-400">
                              ${formatMoney(item.fruit.marketValue || item.fruit.beliPrice || 0)} each
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleUpdatePrizeQty(item.fruit.id, -1)}
                              className="w-5 h-5 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="text-xs font-mono font-bold text-white px-1">
                              x{item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdatePrizeQty(item.fruit.id, 1)}
                              className="w-5 h-5 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemovePrize(item.fruit.id)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fruit Catalog Browser to Add */}
                <div className="pt-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                        search
                      </span>
                      <input
                        type="text"
                        value={fruitSearch}
                        onChange={(e) => setFruitSearch(e.target.value)}
                        placeholder="Search fruits to add as prizes..."
                        className="w-full pl-8 pr-3 py-2 bg-[#070913] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                      {['ALL', 'MYTHICAL', 'LEGENDARY', 'RARE'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFruitRarityFilter(r)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-game font-bold uppercase transition-all whitespace-nowrap ${
                            fruitRarityFilter === r
                              ? 'bg-purple-900/60 border border-purple-500 text-purple-200'
                              : 'bg-[#070913] border border-slate-800 text-slate-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fruit Chips Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredFruits.slice(0, 24).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleAddPrize(f)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-[#070913] border border-slate-800/80 hover:border-purple-500/50 text-left transition-all group"
                      >
                        <FruitImage fruit={f} size="xs" className="w-6 h-6 rounded-md" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-game font-bold text-white truncate group-hover:text-purple-300">
                            {f.name}
                          </div>
                          <div className="text-[9px] font-mono text-emerald-400 truncate">
                            ${formatMoney(f.marketValue || f.beliPrice || 0)}
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-xs text-slate-500 group-hover:text-purple-400">
                          add
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: Duration & Constraints */}
              <div className="bg-[#0b0e1b] border border-purple-500/20 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <span className="material-symbols-outlined text-indigo-400 text-lg">timer</span>
                  <h2 className="font-game font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                    3. Duration & Participation Limits
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block mb-1">
                      Duration
                    </label>
                    <select
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#070913] border border-slate-800 rounded-xl text-xs text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="1">1 Hour (Quick Drop)</option>
                      <option value="6">6 Hours</option>
                      <option value="12">12 Hours</option>
                      <option value="24">24 Hours (1 Day)</option>
                      <option value="48">48 Hours (2 Days)</option>
                      <option value="72">72 Hours (3 Days)</option>
                      <option value="168">7 Days (1 Week)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block mb-1">
                      Max Entrants (Optional)
                    </label>
                    <input
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      placeholder="Unlimited"
                      min={1}
                      className="w-full px-3.5 py-2.5 bg-[#070913] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block mb-1">
                      Min Completed Trades
                    </label>
                    <input
                      type="number"
                      value={minTrades}
                      onChange={(e) => setMinTrades(e.target.value)}
                      placeholder="0"
                      min={0}
                      className="w-full px-3.5 py-2.5 bg-[#070913] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowLeave"
                      checked={allowLeave}
                      onChange={(e) => setAllowLeave(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="allowLeave" className="text-xs text-slate-300 cursor-pointer select-none">
                      Allow entrants to withdraw their entry before drawing
                    </label>
                  </div>
                </div>
              </div>

              {/* Card 4: YouTube Video & Secret Code Boost (VALUE.NET Feature) */}
              <div className="bg-[#0b0e1b] border border-purple-500/30 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-400 text-lg">smart_display</span>
                    <div>
                      <h2 className="font-game font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                        4. YouTube Boost & Secret Code (Optional)
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Reward viewers who watch your video with an increased RNG winning weight.
                      </p>
                    </div>
                  </div>

                  {/* Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={youtubeBoostEnabled}
                      onChange={(e) => setYoutubeBoostEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {youtubeBoostEnabled && (
                  <div className="space-y-4 pt-2 animate-in fade-in duration-200">
                    {/* Video URL */}
                    <div>
                      <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block mb-1">
                        YouTube Video URL or Video ID <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 text-sm">
                          play_circle
                        </span>
                        <input
                          type="text"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or dQw4w9WgXcQ"
                          className="w-full pl-9 pr-4 py-2.5 bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Participants will see this video embedded/linked on the giveaway card.
                      </p>
                    </div>

                    {/* Boost Percentage Selection */}
                    <div>
                      <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block mb-1.5">
                        Winning Weight Boost Percentage <span className="text-rose-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setYoutubeBoostPercentage(5)}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            youtubeBoostPercentage === 5
                              ? 'bg-purple-950/80 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                              : 'bg-[#070913] border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-xs font-game font-bold text-purple-300">+5% BOOST</div>
                          <div className="text-[10px] font-mono text-slate-400">1.05x Winning Weight</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setYoutubeBoostPercentage(10)}
                          className={`p-3 rounded-2xl border text-left transition-all ${
                            youtubeBoostPercentage === 10
                              ? 'bg-purple-950/80 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                              : 'bg-[#070913] border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-xs font-game font-bold text-purple-300">+10% BOOST (Recommended)</div>
                          <div className="text-[10px] font-mono text-slate-400">1.10x Winning Weight</div>
                        </button>
                      </div>
                    </div>

                    {/* Secret Code Input */}
                    <div>
                      <label className="text-[11px] font-mono font-bold text-slate-300 uppercase block mb-1">
                        Secret Code (Hidden in your video) <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 text-sm">
                          key
                        </span>
                        <input
                          type={showSecretCodePlaintext ? 'text' : 'password'}
                          value={youtubeSecretCode}
                          onChange={(e) => setYoutubeSecretCode(e.target.value)}
                          placeholder="e.g. KITSUNE_BOOST_2025"
                          className="w-full pl-9 pr-10 py-2.5 bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecretCodePlaintext(!showSecretCodePlaintext)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {showSecretCodePlaintext ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>

                      {/* Security Callout */}
                      <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 mt-2 text-[11px] text-purple-200 space-y-1">
                        <div className="font-game font-bold flex items-center gap-1 text-purple-300">
                          <span className="material-symbols-outlined text-xs">shield_lock</span>
                          <span>Zero-Knowledge Server-Side Security</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed font-sans">
                          Your secret code is cryptographically hashed with a unique salt on the server using HMAC-SHA256 before storage.
                          Plaintext codes are never stored in the database or transmitted to participants over the API.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-black text-sm uppercase tracking-wider shadow-xl shadow-purple-600/30 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Publishing Giveaway...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">rocket_launch</span>
                      <span>Launch Giveaway to Community</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Preview & Creator Info */}
          <div className="space-y-6">
            {/* Live Terminal Preview */}
            <div className="bg-[#0b0e1b] border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-base">visibility</span>
                  <h3 className="font-game font-bold text-xs text-white uppercase tracking-wider">
                    Live Terminal Preview
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                  ACTIVE
                </span>
              </div>

              {/* Mini Giveaway Card */}
              <div className="p-4 rounded-2xl bg-[#070913] border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-300">
                      <span className="material-symbols-outlined text-xs">
                        {currentUser.avatarUrl || 'person'}
                      </span>
                    </div>
                    <div>
                      <div className="font-game font-bold text-xs text-white">
                        @{currentUser.username}
                      </div>
                      <div className="text-[9px] font-mono text-purple-400 uppercase">
                        {currentUser.role}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[9px] font-game font-bold text-emerald-300">
                    LIVE
                  </span>
                </div>

                <div className="font-game font-bold text-sm text-white line-clamp-1">
                  {title || 'Your Giveaway Title'}
                </div>

                <div className="text-[11px] text-slate-400 line-clamp-2 font-sans">
                  {description || 'Your giveaway description and instructions for participants.'}
                </div>

                {/* Prizes summary */}
                <div className="p-2.5 rounded-xl bg-[#0e1224] border border-slate-800 space-y-1.5">
                  <div className="text-[9px] font-mono text-slate-400 uppercase flex justify-between">
                    <span>Prize Items:</span>
                    <span className="text-emerald-400 font-bold">${formatMoney(totalPrizeMarketValue)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPrizes.length === 0 ? (
                      <span className="text-[10px] text-slate-500 italic">No prizes added</span>
                    ) : (
                      selectedPrizes.map((p, idx) => (
                        <span
                          key={idx}
                          className="bg-[#070913] px-2 py-0.5 rounded-md border border-purple-500/30 text-[10px] font-mono text-purple-200 flex items-center gap-1"
                        >
                          <FruitImage fruit={p.fruit} size="xs" className="w-3.5 h-3.5 rounded-xs" />
                          {p.fruit.name} x{p.quantity}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {youtubeBoostEnabled && (
                  <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-between text-[10px] font-mono text-purple-300">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">rocket_launch</span>
                      <span>+{youtubeBoostPercentage}% Secret Code Boost</span>
                    </span>
                    <span className="text-white font-bold">Enabled</span>
                  </div>
                )}
              </div>
            </div>

            {/* Host Stats */}
            <div className="bg-[#0b0e1b] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
              <h3 className="font-game font-bold text-xs text-white uppercase tracking-wider">
                Creator Profile
              </h3>
              <div className="p-3 rounded-2xl bg-[#070913] border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Host Account</span>
                <span className="text-xs font-game font-bold text-purple-300">@{currentUser.username}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#070913] border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Total Hosted</span>
                <span className="text-xs font-mono font-bold text-white">{hostedGiveaways.length} Drops</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: MANAGE HOSTED GIVEAWAYS */}
      {activeSubTab === 'MANAGE' && (
        <div className="space-y-4">
          {loadingHosted ? (
            <div className="py-24 text-center">
              <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="font-game text-xs text-slate-400 uppercase tracking-wider">Loading Drops...</p>
            </div>
          ) : hostedGiveaways.length === 0 ? (
            <div className="bg-[#0b0e1b] rounded-3xl border border-slate-800 p-12 text-center space-y-3">
              <span className="material-symbols-outlined text-5xl text-slate-600">redeem</span>
              <h3 className="font-game font-bold text-base text-white">No Hosted Giveaways Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You have not created any giveaways yet. Launch your first community drop to reward viewers and traders!
              </p>
              <button
                onClick={() => setActiveSubTab('CREATE')}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game text-xs uppercase"
              >
                Create a Giveaway
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {hostedGiveaways.map((gw) => {
                const isConcluded =
                  gw.status === 'COMPLETED' || gw.status === 'CANCELLED' || gw.status === 'ENDED';
                const prizeTotal = (gw.prizes || []).reduce(
                  (sum, p) => sum + (p.marketValue || p.value || 0),
                  0
                );

                return (
                  <div
                    key={gw.id}
                    className="bg-[#0b0e1b] border border-purple-500/20 hover:border-purple-500/40 rounded-3xl p-5 sm:p-6 shadow-xl transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-game font-bold uppercase border ${
                              gw.status === 'ACTIVE'
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 animate-pulse'
                                : gw.status === 'COMPLETED'
                                ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            {gw.status}
                          </span>
                          {gw.youtubeBoostEnabled && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-[10px] font-mono text-rose-300 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">rocket_launch</span>
                              <span>+{gw.youtubeBoostPercentage || 10}% YouTube Boost</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-game font-bold text-base text-white">
                          {gw.title}
                        </h3>
                      </div>

                      {/* Entrants Count */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-white flex items-center gap-1 justify-end">
                            <span className="material-symbols-outlined text-amber-400 text-sm">group</span>
                            <span>{gw.participantCount || 0} Entrants</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Prize: ${formatMoney(prizeTotal)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedManageGw(gw);
                            setIsParticipantsModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors"
                        >
                          View Entrants
                        </button>
                      </div>
                    </div>

                    {/* Winner Banner if Drawn */}
                    {gw.winnerUsername && (
                      <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 to-amber-950/80 border border-amber-500/40 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-amber-400 text-xl">emoji_events</span>
                          <div>
                            <div className="text-xs font-game font-bold text-amber-300 uppercase">
                              Winner: @{gw.winnerUsername}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Drawn at {new Date(gw.completedAt || gw.updatedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => onViewTraderProfile?.(gw.winnerUsername!)}
                          className="text-xs font-mono font-bold text-amber-400 hover:underline"
                        >
                          View Profile &rarr;
                        </button>
                      </div>
                    )}

                    {/* Action Controls for Host */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] font-mono text-slate-500">
                        ID: {gw.id} • Ends {new Date(gw.endsAt).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-2">
                        {gw.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleEndGiveaway(gw)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-game uppercase transition-colors"
                          >
                            End Drop
                          </button>
                        )}

                        {gw.status !== 'COMPLETED' && gw.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleDrawWinner(gw)}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-game font-black text-xs uppercase shadow-md transition-all active:scale-98"
                          >
                            Draw Winner (RNG)
                          </button>
                        )}

                        {gw.status !== 'COMPLETED' && gw.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            onClick={() => handleCancelGiveaway(gw)}
                            className="px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 text-xs font-game uppercase transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Entrants Modal */}
      {isParticipantsModalOpen && selectedManageGw && (
        <ParticipantsModal
          giveaway={selectedManageGw}
          isOpen={isParticipantsModalOpen}
          onClose={() => setIsParticipantsModalOpen(false)}
          onViewTraderProfile={onViewTraderProfile || (() => {})}
        />
      )}
    </div>
  );
};
