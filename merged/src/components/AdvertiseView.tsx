import React, { useState } from 'react';
import { ActiveTab, SponsorTier } from '../types';
import { apiSubmitSponsorshipInquiry, isValidHttpsUrl } from '../utils/monetization';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

interface AdvertiseViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const AdvertiseView: React.FC<AdvertiseViewProps> = ({
  onNavigateTab,
  onShowToast,
}) => {
  const [formData, setFormData] = useState({
    companyOrCommunity: '',
    contactEmail: '',
    websiteUrl: '',
    campaignTier: 'FEATURED_SPONSOR' as SponsorTier,
    message: '',
    budgetRange: '$100 - $500 / mo',
    botCheck: '', // Honeypot
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate inputs
    if (!formData.companyOrCommunity.trim()) {
      setErrorMessage('Please enter your Company, Community, or Creator brand name.');
      return;
    }
    if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
      setErrorMessage('Please enter a valid corporate or contact email address.');
      return;
    }
    if (!formData.websiteUrl.trim() || !isValidHttpsUrl(formData.websiteUrl)) {
      setErrorMessage('Website or Community URL must begin strictly with "https://".');
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 15) {
      setErrorMessage('Please provide a brief description of your campaign proposal (min 15 characters).');
      return;
    }

    setIsSubmitting(true);
    playClickSound();

    const res = await apiSubmitSponsorshipInquiry(formData);
    setIsSubmitting(false);

    if (res.success) {
      playTradeSuccessSound();
      setIsSubmitted(true);
      if (onShowToast) {
        onShowToast('Sponsorship inquiry transmitted successfully!', 'success');
      }
    } else {
      setErrorMessage(res.error || 'Failed to submit inquiry. Please try again.');
      if (onShowToast) {
        onShowToast(res.error || 'Transmission failed', 'error');
      }
    }
  };

  return (
    <div className="pt-28 sm:pt-32 pb-24 px-4 md:px-8 max-w-[1180px] mx-auto w-full animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          COMMUNITY PARTNERSHIPS & SPONSORSHIPS
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-game font-black text-white tracking-tight mb-4">
          ADVERTISE WITH <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-400 to-indigo-400">VALUE.NET</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Connect your gaming community, developer tool, creator stream, or legitimate accessory service with tens of thousands of active Blox Fruits traders daily.
        </p>
      </div>

      {/* Core Integrity Notice */}
      <div className="bg-[#0b0e24] border border-purple-500/30 rounded-2xl p-6 mb-12 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center shrink-0 text-purple-300">
            <span className="material-symbols-outlined text-2xl">verified_user</span>
          </div>
          <div>
            <h3 className="font-game font-bold text-base text-white mb-1">
              The VALUE.NET Trust & Independence Guarantee
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Monetization on VALUE.NET exists strictly around the product, never interfering with user trust. Sponsoring does <strong className="text-amber-300">not</strong> purchase trader reputation, verification status, moderator influence, or trade arbitration outcomes. All promotions are prominently marked as <strong className="text-purple-300 uppercase">Sponsored</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Sponsorship Tiers Grid */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <h2 className="font-game font-bold text-xl sm:text-2xl text-white uppercase tracking-wide">
            Available Sponsorship Placements
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Transparent tiers designed for gaming communities, YouTube creators, and developer tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tier 1 */}
          <div className="bg-[#0a0d1d] border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-md group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-300 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-xl">forum</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block mb-1">
                TIER 1
              </span>
              <h3 className="font-game font-black text-lg text-white mb-2">
                Community Sponsor
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Native placement in wiki guides, community discussions, and sidebar modules. Ideal for Discord servers and gaming clans.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 mb-6">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                  Wiki & Community sidebars
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                  Verified HTTPS link
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                  Custom brand tagline
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, campaignTier: 'COMMUNITY_SPONSOR' }));
                document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-xs font-game font-bold text-purple-200 transition-all text-center cursor-pointer"
            >
              Select Tier 1
            </button>
          </div>

          {/* Tier 2 */}
          <div className="bg-[#0c102b] border-2 border-amber-500/40 hover:border-amber-500/70 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xl relative group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-0.5 rounded-full text-[9px] font-mono font-black text-slate-950 uppercase tracking-widest shadow-md">
              MOST POPULAR
            </div>
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-300 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-xl">star</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-1">
                TIER 2
              </span>
              <h3 className="font-game font-black text-lg text-white mb-2">
                Featured Sponsor
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Elevated high-contrast banner & native placement across Homepage & Live Trading marketplace feeds.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 mb-6">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-amber-400">check</span>
                  Homepage & Live Trades feed
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-amber-400">check</span>
                  Custom brand logo & accent
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-amber-400">check</span>
                  High-intent trader reach
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, campaignTier: 'FEATURED_SPONSOR' }));
                document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-game font-black text-slate-950 transition-all text-center cursor-pointer shadow-md"
            >
              Select Tier 2
            </button>
          </div>

          {/* Tier 3 */}
          <div className="bg-[#0a0d1d] border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-md group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-300 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-xl">featured_seasonal_and_gifts</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block mb-1">
                TIER 3
              </span>
              <h3 className="font-game font-black text-lg text-white mb-2">
                Event Sponsor
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Sponsor official community drops & giveaways with custom brand attribution and social follow links.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 mb-6">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                  "Sponsored By" drop banner
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                  Official Discord event blast
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-purple-400">check</span>
                  Fair cryptographic draw
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, campaignTier: 'EVENT_SPONSOR' }));
                document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-2 px-3 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 text-xs font-game font-bold text-purple-200 transition-all text-center cursor-pointer"
            >
              Select Tier 3
            </button>
          </div>

          {/* Tier 4 */}
          <div className="bg-[#0a0d1d] border border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-md group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-300 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-xl">handshake</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                TIER 4
              </span>
              <h3 className="font-game font-black text-lg text-white mb-2">
                Strategic Partner
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Long-term integration for major gaming platforms, hardware makers, or creator networks.
              </p>
              <ul className="space-y-2 text-xs text-slate-400 mb-6">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-indigo-400">check</span>
                  Dedicated Partner badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-indigo-400">check</span>
                  Multi-channel integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-indigo-400">check</span>
                  Priority support desk
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, campaignTier: 'PARTNER' }));
                document.getElementById('inquiry-form')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-2 px-3 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-xs font-game font-bold text-indigo-200 transition-all text-center cursor-pointer"
            >
              Select Tier 4
            </button>
          </div>
        </div>
      </div>

      {/* Strict Prohibited Categories Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        <div className="bg-[#090c1b] border border-rose-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="material-symbols-outlined text-rose-400 text-xl">block</span>
            <h4 className="font-game font-bold text-sm text-white uppercase tracking-wider">
              Strictly Prohibited Categories
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            To safeguard our community and underage players, we strictly reject campaigns in these categories:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-rose-300/90">
            <span>• Gambling / Casinos</span>
            <span>• Unauthorized Robux Selling</span>
            <span>• Account Theft / Phishing</span>
            <span>• Malware / Exploits</span>
            <span>• Pay-to-Win Advantage</span>
            <span>• Fake Giveaway Sites</span>
          </div>
        </div>

        <div className="bg-[#090c1b] border border-emerald-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
            <h4 className="font-game font-bold text-sm text-white uppercase tracking-wider">
              Approved & Welcomed Partners
            </h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            We actively support legitimate gaming businesses and creators offering genuine utility:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-emerald-300/90">
            <span>• Verified Roblox Creators</span>
            <span>• Gaming Communities / Clans</span>
            <span>• Server Hosting Providers</span>
            <span>• Developer Software Tools</span>
            <span>• Gaming Peripherals</span>
            <span>• Community Event Organizers</span>
          </div>
        </div>
      </div>

      {/* Sponsorship Inquiry Form */}
      <div
        id="inquiry-form"
        className="bg-[#0a0d1e] border border-purple-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="font-game font-black text-2xl text-white uppercase tracking-wide">
              Sponsorship & Partnership Inquiry
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Submit your campaign requirements. Our partnerships team typically responds within 24–48 hours.
            </p>
          </div>

          {isSubmitted ? (
            <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-2xl p-8 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-900/80 border border-emerald-400/50 flex items-center justify-center mx-auto mb-4 text-emerald-300 shadow-lg">
                <span className="material-symbols-outlined text-3xl">done_all</span>
              </div>
              <h4 className="font-game font-bold text-lg text-white mb-2">
                Inquiry Transmitted Successfully
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed mb-6">
                Thank you for your interest in partnering with VALUE.NET. We have logged your submission and our staff will review your campaign details.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData({
                    companyOrCommunity: '',
                    contactEmail: '',
                    websiteUrl: '',
                    campaignTier: 'FEATURED_SPONSOR',
                    message: '',
                    budgetRange: '$100 - $500 / mo',
                    botCheck: '',
                  });
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-700/50 hover:bg-emerald-700/80 border border-emerald-400/40 text-xs font-game font-bold text-white transition-all"
              >
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Company / Community Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyOrCommunity}
                    onChange={(e) =>
                      setFormData({ ...formData, companyOrCommunity: e.target.value })
                    }
                    placeholder="e.g. Apex Fruit Guild"
                    className="w-full bg-[#060814] border border-purple-500/30 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    placeholder="partner@yourcompany.com"
                    className="w-full bg-[#060814] border border-purple-500/30 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Website or Community URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.websiteUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, websiteUrl: e.target.value })
                    }
                    placeholder="https://discord.gg/your-guild"
                    className="w-full bg-[#060814] border border-purple-500/30 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Desired Placement Tier
                  </label>
                  <select
                    value={formData.campaignTier}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        campaignTier: e.target.value as SponsorTier,
                      })
                    }
                    className="w-full bg-[#060814] border border-purple-500/30 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                  >
                    <option value="COMMUNITY_SPONSOR">Tier 1: Community Sponsor</option>
                    <option value="FEATURED_SPONSOR">Tier 2: Featured Sponsor</option>
                    <option value="EVENT_SPONSOR">Tier 3: Event Sponsor</option>
                    <option value="PARTNER">Tier 4: Strategic Partner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Monthly Budget
                </label>
                <select
                  value={formData.budgetRange}
                  onChange={(e) =>
                    setFormData({ ...formData, budgetRange: e.target.value })
                  }
                  className="w-full bg-[#060814] border border-purple-500/30 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                >
                  <option value="< $100 / mo">&lt; $100 / mo (Small community / creator)</option>
                  <option value="$100 - $500 / mo">$100 - $500 / mo (Standard promotion)</option>
                  <option value="$500 - $1500 / mo">$500 - $1,500 / mo (Featured partner)</option>
                  <option value="$1500+ / mo">$1,500+ / mo (Major brand / platform)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Campaign Proposal & Target Audience *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Describe your brand, desired promotion duration, target goals, and any specific assets..."
                  className="w-full bg-[#060814] border border-purple-500/30 focus:border-purple-400 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 outline-none transition-all resize-none"
                />
              </div>

              {/* Honeypot for bot defense */}
              <input
                type="text"
                name="bot_field"
                value={formData.botCheck}
                onChange={(e) =>
                  setFormData({ ...formData, botCheck: e.target.value })
                }
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:via-purple-500 hover:to-indigo-500 text-xs sm:text-sm font-game font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>TRANSMITTING INQUIRY...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">send</span>
                    <span>SUBMIT SPONSORSHIP PROPOSAL</span>
                  </>
                )}
              </button>

              <p className="text-[11px] font-mono text-slate-500 text-center">
                Submissions are screened against our community safety standards. No payment info is collected until an official proposal is signed.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
