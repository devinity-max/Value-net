import React, { useState, useEffect } from 'react';
import {
  AuthUser,
  MonetizationConfig,
  DirectSponsorItem,
  SponsorshipInquiry,
  SponsorTier,
  AdPlacement,
} from '../types';
import {
  apiGetMonetizationConfig,
  apiUpdateMonetizationConfig,
  apiGetAdminSponsors,
  apiCreateDirectSponsor,
  apiUpdateDirectSponsorStatus,
  apiDeleteDirectSponsor,
  apiGetAdminInquiries,
  apiUpdateInquiryStatus,
  isValidHttpsUrl,
} from '../utils/monetization';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

interface MonetizationAdminViewProps {
  currentUser: AuthUser | null;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const MonetizationAdminView: React.FC<MonetizationAdminViewProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [config, setConfig] = useState<MonetizationConfig | null>(null);
  const [sponsors, setSponsors] = useState<DirectSponsorItem[]>([]);
  const [inquiries, setInquiries] = useState<SponsorshipInquiry[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'sponsors' | 'inquiries'>('config');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddSponsorModal, setShowAddSponsorModal] = useState(false);

  // New Sponsor Form state
  const [newSponsor, setNewSponsor] = useState<{
    sponsorName: string;
    tagline: string;
    description: string;
    targetUrl: string;
    imageUrl: string;
    tier: SponsorTier;
    category: string;
    placements: string[];
  }>({
    sponsorName: '',
    tagline: '',
    description: '',
    targetUrl: 'https://',
    imageUrl: '',
    tier: 'FEATURED_SPONSOR',
    category: 'Gaming Community',
    placements: ['home_top', 'trading_sidebar'],
  });

  const fetchData = async () => {
    setIsLoading(true);
    const [cfgRes, spRes, inqRes] = await Promise.all([
      apiGetMonetizationConfig(),
      apiGetAdminSponsors(),
      apiGetAdminInquiries(),
    ]);

    if (cfgRes.success && cfgRes.config) setConfig(cfgRes.config);
    if (spRes.success && spRes.sponsors) setSponsors(spRes.sponsors);
    if (inqRes.success && inqRes.inquiries) setInquiries(inqRes.inquiries);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (updatedConfig: MonetizationConfig) => {
    setIsSaving(true);
    playClickSound();
    const res = await apiUpdateMonetizationConfig(updatedConfig);
    setIsSaving(false);

    if (res.success && res.config) {
      setConfig(res.config);
      playTradeSuccessSound();
      if (onShowToast) onShowToast('Monetization settings updated successfully!', 'success');
    } else {
      if (onShowToast) onShowToast(res.error || 'Failed to save configuration', 'error');
    }
  };

  const handleTogglePlacement = (placementKey: keyof MonetizationConfig['placements']) => {
    if (!config) return;
    const updated = {
      ...config,
      placements: {
        ...config.placements,
        [placementKey]: !config.placements[placementKey],
      },
    };
    setConfig(updated);
    handleSaveConfig(updated);
  };

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsor.sponsorName || !newSponsor.description) {
      if (onShowToast) onShowToast('Please fill in required sponsor fields.', 'error');
      return;
    }
    if (!isValidHttpsUrl(newSponsor.targetUrl)) {
      if (onShowToast) onShowToast('Sponsor URL must strictly start with https://', 'error');
      return;
    }

    setIsSaving(true);
    playClickSound();
    const res = await apiCreateDirectSponsor(newSponsor);
    setIsSaving(false);

    if (res.success) {
      playTradeSuccessSound();
      setShowAddSponsorModal(false);
      setNewSponsor({
        sponsorName: '',
        tagline: '',
        description: '',
        targetUrl: 'https://',
        imageUrl: '',
        tier: 'FEATURED_SPONSOR',
        category: 'Gaming Community',
        placements: ['home_top', 'trading_sidebar'],
      });
      fetchData();
      if (onShowToast) onShowToast('New sponsor campaign registered and approved!', 'success');
    } else {
      if (onShowToast) onShowToast(res.error || 'Failed to create sponsor', 'error');
    }
  };

  const handleStatusChange = async (sponsorId: string, status: DirectSponsorItem['status']) => {
    playClickSound();
    const res = await apiUpdateDirectSponsorStatus(sponsorId, status);
    if (res.success) {
      playTradeSuccessSound();
      fetchData();
      if (onShowToast) onShowToast(`Sponsor status updated to ${status}.`, 'info');
    }
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!confirm('Are you sure you want to delete this sponsor campaign?')) return;
    playClickSound();
    const res = await apiDeleteDirectSponsor(sponsorId);
    if (res.success) {
      playTradeSuccessSound();
      fetchData();
      if (onShowToast) onShowToast('Sponsor campaign removed.', 'info');
    }
  };

  const handleInquiryStatus = async (inquiryId: string, status: SponsorshipInquiry['status']) => {
    playClickSound();
    const res = await apiUpdateInquiryStatus(inquiryId, status);
    if (res.success) {
      playTradeSuccessSound();
      fetchData();
      if (onShowToast) onShowToast(`Inquiry marked as ${status}.`, 'info');
    }
  };

  if (isLoading || !config) {
    return (
      <div className="pt-28 pb-20 flex flex-col items-center justify-center min-h-[400px]">
        <span className="w-8 h-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin mb-3" />
        <span className="text-xs font-mono text-slate-400">Loading Monetization Terminal...</span>
      </div>
    );
  }

  return (
    <div className="pt-28 sm:pt-32 pb-24 px-4 md:px-8 max-w-[1180px] mx-auto w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            ADMIN SECURITY & MONETIZATION ENGINE
          </div>
          <h1 className="text-2xl sm:text-3xl font-game font-black text-white">
            Monetization & Ad Infrastructure
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally manage display networks, direct sponsorships, house features, and mobile ad density.
          </p>
        </div>

        {/* Global Master Status */}
        <div className="flex items-center gap-3 bg-[#0a0d1e] border border-purple-500/30 rounded-2xl p-3 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Master Engine</div>
            <div className="text-xs font-game font-bold text-white">
              {config.enabled ? (
                <span className="text-emerald-400 flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE ({config.provider.toUpperCase()})
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  DISABLED
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const updated = { ...config, enabled: !config.enabled };
              setConfig(updated);
              handleSaveConfig(updated);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-game font-bold transition-all cursor-pointer ${
              config.enabled
                ? 'bg-rose-950/80 border border-rose-500/40 text-rose-300 hover:bg-rose-900/80'
                : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80'
            }`}
          >
            {config.enabled ? 'Emergency Kill' : 'Enable Ads'}
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-[#0a0d1d] border border-purple-500/20 p-1.5 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveSubTab('config');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-game font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === 'config'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">tune</span>
          <span>Engine Config</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveSubTab('sponsors');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-game font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeSubTab === 'sponsors'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">verified</span>
          <span>Sponsors ({sponsors.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            setActiveSubTab('inquiries');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-game font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeSubTab === 'inquiries'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">mail</span>
          <span>Inquiries</span>
          {inquiries.filter((i) => i.status === 'UNREAD').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[9px] font-mono font-black">
              {inquiries.filter((i) => i.status === 'UNREAD').length}
            </span>
          )}
        </button>
      </div>

      {/* 1. Engine Configuration Sub Tab */}
      {activeSubTab === 'config' && (
        <div className="space-y-8">
          {/* Provider Selection */}
          <div className="bg-[#0a0d1e] border border-purple-500/25 rounded-2xl p-6 shadow-md">
            <h3 className="font-game font-bold text-base text-white mb-1">
              Active Monetization Provider
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Select which engine powers the platform slots. All modes failover gracefully to House Ads if blocked.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  id: 'house_ad',
                  title: 'House Ads (Default)',
                  desc: 'Promotes VALUE.NET features, creator drops, and fair trade calculators.',
                  icon: 'stars',
                },
                {
                  id: 'direct_sponsor',
                  title: 'Direct Sponsors',
                  desc: 'Displays approved community sponsors with verified HTTPS URLs.',
                  icon: 'verified',
                },
                {
                  id: 'display_network',
                  title: 'Display Network',
                  desc: 'Sandboxed programmatic banner tags with non-intrusive styling.',
                  icon: 'ad_units',
                },
                {
                  id: 'none',
                  title: 'Disabled / Ad-Free',
                  desc: 'Completely collapses all ad slots across the platform.',
                  icon: 'block',
                },
              ].map((prov) => (
                <div
                  key={prov.id}
                  onClick={() => {
                    const updated = { ...config, provider: prov.id as any };
                    setConfig(updated);
                    handleSaveConfig(updated);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    config.provider === prov.id
                      ? 'bg-purple-950/70 border-purple-400 shadow-md scale-[1.02]'
                      : 'bg-[#060814] border-slate-800 hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-purple-400 text-lg">
                      {prov.icon}
                    </span>
                    <span className="font-game font-bold text-xs text-white">
                      {prov.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {prov.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Density & Mobile Control */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0a0d1e] border border-purple-500/25 rounded-2xl p-6 shadow-md">
              <h3 className="font-game font-bold text-base text-white mb-1">
                Ad Density Policy
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Controls maximum slots rendered per scroll viewport.
              </p>

              <div className="space-y-3">
                {[
                  {
                    id: 'minimal',
                    label: 'Minimal (1 per 2 Viewports)',
                    desc: 'Lowest density. Ideal for maximal trade board focus.',
                  },
                  {
                    id: 'standard',
                    label: 'Standard (Balanced 1 per Viewport)',
                    desc: 'Recommended default for good UX & community sustainability.',
                  },
                  {
                    id: 'disabled',
                    label: 'Disabled on Mobile',
                    desc: 'Completely eliminate ad slots on compact phone screens.',
                  },
                ].map((d) => (
                  <label
                    key={d.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      (config.mobileAdDensity || config.density || 'standard') === d.id
                        ? 'bg-purple-950/60 border-purple-400'
                        : 'bg-[#060814] border-slate-800 hover:border-purple-500/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mobileAdDensity"
                      checked={(config.mobileAdDensity || config.density || 'standard') === d.id}
                      onChange={() => {
                        const updated = {
                          ...config,
                          mobileAdDensity: d.id as any,
                          density: d.id as any,
                        };
                        setConfig(updated);
                        handleSaveConfig(updated);
                      }}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-game font-bold text-white">
                        {d.label}
                      </div>
                      <div className="text-[11px] text-slate-400">{d.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-[#0a0d1e] border border-purple-500/25 rounded-2xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="font-game font-bold text-base text-white mb-1">
                  Mobile & Creator Switches
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Granular control for small screen experience and creator integrations.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#060814] border border-slate-800">
                    <div>
                      <div className="text-xs font-game font-bold text-white">
                        Enable Mobile Ad Slots
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Default OFF to prevent screen clutter on phones.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const isCurrentlyEnabled = Boolean(config.mobileAdsEnabled ?? config.enableMobileAds);
                        const updated = {
                          ...config,
                          mobileAdsEnabled: !isCurrentlyEnabled,
                          enableMobileAds: !isCurrentlyEnabled,
                        };
                        setConfig(updated);
                        handleSaveConfig(updated);
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        (config.mobileAdsEnabled ?? config.enableMobileAds) ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          (config.mobileAdsEnabled ?? config.enableMobileAds) ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#060814] border border-slate-800">
                    <div>
                      <div className="text-xs font-game font-bold text-white">
                        Creator Video & Channel Promos
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Allow approved YouTube creators to receive promoted spots.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const isCurrentlyEnabled = Boolean(config.creatorPromotionsEnabled ?? config.enableCreatorPromotions);
                        const updated = {
                          ...config,
                          creatorPromotionsEnabled: !isCurrentlyEnabled,
                          enableCreatorPromotions: !isCurrentlyEnabled,
                        };
                        setConfig(updated);
                        handleSaveConfig(updated);
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                        (config.creatorPromotionsEnabled ?? config.enableCreatorPromotions) ? 'bg-purple-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          (config.creatorPromotionsEnabled ?? config.enableCreatorPromotions) ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-500">
                Last modified by @{config.updatedBy} ({new Date(config.updatedAt).toLocaleTimeString()})
              </div>
            </div>
          </div>

          {/* Individual Placement Feature Flags */}
          <div className="bg-[#0a0d1e] border border-purple-500/25 rounded-2xl p-6 shadow-md">
            <h3 className="font-game font-bold text-base text-white mb-1">
              Placement Feature Flags
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Toggle specific slot locations across the website independently.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'home_top', label: 'Homepage Top Hero Banner' },
                { key: 'home_between_sections', label: 'Homepage Mid-Feed Banner' },
                { key: 'trading_sidebar', label: 'Live Trades Sidebar Card' },
                { key: 'trading_in_feed', label: 'Live Trades In-Feed Native Card' },
                { key: 'marketplace_native', label: 'Marketplace Native Ad' },
                { key: 'giveaway_banner', label: 'Giveaways View Banner' },
                { key: 'footer_banner', label: 'Global Platform Footer Ad' },
              ].map((pl) => {
                const isActive = config.placements[pl.key as keyof typeof config.placements];
                return (
                  <div
                    key={pl.key}
                    onClick={() =>
                      handleTogglePlacement(pl.key as keyof typeof config.placements)
                    }
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-purple-950/50 border-purple-500/40 text-white'
                        : 'bg-[#060814] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-game font-bold">{pl.label}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {isActive ? 'ENABLED' : 'MUTED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Direct Sponsors Sub Tab */}
      {activeSubTab === 'sponsors' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-game font-bold text-lg text-white">
                Direct Sponsor Campaigns ({sponsors.length})
              </h3>
              <p className="text-xs text-slate-400">
                Verified partners and community advertisers displayed on VALUE.NET.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowAddSponsorModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-game font-black text-slate-950 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              <span>Register Sponsor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sponsors.map((sp) => (
              <div
                key={sp.id}
                className="bg-[#0a0d1e] border border-amber-500/25 rounded-2xl p-5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[9px] font-mono font-black text-amber-300 uppercase">
                      {sp.tier}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        sp.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : sp.status === 'PAUSED'
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {sp.status}
                    </span>
                  </div>

                  <h4 className="font-game font-black text-base text-white mb-1">
                    {sp.sponsorName}
                  </h4>
                  <p className="text-xs text-amber-300/90 font-mono mb-2">
                    {sp.tagline}
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {sp.description}
                  </p>

                  <div className="text-[11px] font-mono text-slate-400 break-all mb-4 bg-[#060814] p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-500">URL: </span>
                    <a
                      href={sp.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-300 hover:underline"
                    >
                      {sp.targetUrl}
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {sp.status === 'APPROVED' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(sp.id, 'PAUSED')}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300 cursor-pointer"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(sp.id, 'APPROVED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 cursor-pointer"
                      >
                        Activate
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSponsor(sp.id)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Inquiries Sub Tab */}
      {activeSubTab === 'inquiries' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-game font-bold text-lg text-white">
              Sponsorship & Partnership Inquiries ({inquiries.length})
            </h3>
            <p className="text-xs text-slate-400">
              Proposals submitted through the public "Advertise with VALUE.NET" portal.
            </p>
          </div>

          {inquiries.length === 0 ? (
            <div className="bg-[#0a0d1e] border border-purple-500/20 rounded-2xl p-10 text-center text-xs text-slate-400">
              No inquiries received yet.
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map((inq) => (
                <div
                  key={inq.id}
                  className="bg-[#0a0d1e] border border-purple-500/20 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-game font-bold text-sm text-white">
                        {inq.companyOrCommunity}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30">
                        {inq.campaignTier}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(inq.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mb-2">
                      <span className="text-slate-500 font-mono">Email: </span>
                      <a
                        href={`mailto:${inq.contactEmail}`}
                        className="text-amber-300 hover:underline"
                      >
                        {inq.contactEmail}
                      </a>
                      {inq.websiteUrl && (
                        <span className="ml-3">
                          <span className="text-slate-500 font-mono">Web: </span>
                          <a
                            href={inq.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-300 hover:underline"
                          >
                            {inq.websiteUrl}
                          </a>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 italic bg-[#060814] p-2.5 rounded-xl border border-slate-800">
                      "{inq.message}"
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        inq.status === 'UNREAD'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          : inq.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-400'
                          : inq.status === 'CONTACTED'
                          ? 'bg-blue-950 text-blue-400'
                          : 'bg-slate-900 text-slate-500'
                      }`}
                    >
                      {inq.status}
                    </span>

                    <select
                      value={inq.status}
                      onChange={(e) =>
                        handleInquiryStatus(inq.id, e.target.value as any)
                      }
                      className="bg-[#060814] border border-slate-800 text-[11px] text-white rounded-lg px-2 py-1 outline-none"
                    >
                      <option value="UNREAD">Mark Unread</option>
                      <option value="CONTACTED">Mark Contacted</option>
                      <option value="APPROVED">Approve Proposal</option>
                      <option value="ARCHIVED">Archive</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Sponsor Modal */}
      {showAddSponsorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0d1e] border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-game font-black text-lg text-white">
                Register Direct Sponsor Campaign
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSponsorModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSponsor} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Sponsor / Brand Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSponsor.sponsorName}
                  onChange={(e) =>
                    setNewSponsor({ ...newSponsor, sponsorName: e.target.value })
                  }
                  placeholder="e.g. Titan Game Servers"
                  className="w-full bg-[#060814] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={newSponsor.tagline}
                  onChange={(e) =>
                    setNewSponsor({ ...newSponsor, tagline: e.target.value })
                  }
                  placeholder="e.g. Ultra Low Latency Private Roblox Hosting"
                  className="w-full bg-[#060814] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Target URL (Strict HTTPS) *
                </label>
                <input
                  type="url"
                  required
                  value={newSponsor.targetUrl}
                  onChange={(e) =>
                    setNewSponsor({ ...newSponsor, targetUrl: e.target.value })
                  }
                  placeholder="https://valuenet.gg"
                  className="w-full bg-[#060814] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Sponsorship Tier
                  </label>
                  <select
                    value={newSponsor.tier}
                    onChange={(e) =>
                      setNewSponsor({
                        ...newSponsor,
                        tier: e.target.value as SponsorTier,
                      })
                    }
                    className="w-full bg-[#060814] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="COMMUNITY_SPONSOR">Community Sponsor</option>
                    <option value="FEATURED_SPONSOR">Featured Sponsor</option>
                    <option value="EVENT_SPONSOR">Event Sponsor</option>
                    <option value="PARTNER">Strategic Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newSponsor.category}
                    onChange={(e) =>
                      setNewSponsor({ ...newSponsor, category: e.target.value })
                    }
                    placeholder="e.g. Hosting, Clan, Tool"
                    className="w-full bg-[#060814] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Ad Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newSponsor.description}
                  onChange={(e) =>
                    setNewSponsor({ ...newSponsor, description: e.target.value })
                  }
                  placeholder="Brief description of the sponsor's service..."
                  className="w-full bg-[#060814] border border-purple-500/30 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSponsorModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-game text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-game font-bold text-slate-950 cursor-pointer disabled:opacity-50"
                >
                  Save & Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
