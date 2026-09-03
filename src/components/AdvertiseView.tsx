import React, { useState } from 'react';
import { AuthUser, ActiveTab } from '../types';
import { supabase } from '../lib/supabaseClient';
import { getDiscordUrl } from '../utils/brandSettings';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface AdvertiseViewProps {
  currentUser: AuthUser | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdvertiseView: React.FC<AdvertiseViewProps> = ({
  currentUser,
  onNavigateTab,
  onShowToast,
}) => {
  const discordUrl = getDiscordUrl();

  // Form State
  const [name, setName] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [email, setEmail] = useState('');
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [promotionType, setPromotionType] = useState('Website Banner');
  const [duration, setDuration] = useState('7 Days');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const adOptions = [
    {
      title: 'Website Banner Placement',
      icon: 'view_carousel',
      location: 'Top & Side Banners across Calculator & Values',
      description: 'High-visibility visual banner placed prominently across high-traffic platform pages.',
      badge: 'Popular',
    },
    {
      title: 'Featured Community & Server',
      icon: 'groups',
      location: 'Community Hub & Partner Showcase',
      description: 'Promote your Roblox trading Discord, gaming guild, or community project directly to players.',
      badge: 'High Engagement',
    },
    {
      title: 'Sponsored Community Giveaway',
      icon: 'featured_seasonal_and_gifts',
      location: 'Official Giveaways Terminal',
      description: 'Sponsor an official Blox Fruits fruit drop with custom YouTube video boosts and secret codes.',
      badge: 'Maximum Reach',
    },
    {
      title: 'Featured Creator & Channel',
      icon: 'smart_display',
      location: 'Creator Spotlight & Trade Terminal',
      description: 'Spotlight your YouTube or Twitch channel to traders looking for content and trade guides.',
      badge: 'Creators Choice',
    },
  ];

  // Helper for safe URL validation
  const isValidUrl = (str: string) => {
    if (!str) return true; // Optional field
    try {
      const parsed = new URL(str);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (!name.trim() || !discordUsername.trim() || !email.trim() || !brandName.trim()) {
      onShowToast('Please fill in all required contact fields.', 'error');
      return;
    }

    if (websiteUrl.trim() && !isValidUrl(websiteUrl.trim())) {
      onShowToast('Please enter a valid HTTP/HTTPS website URL.', 'error');
      return;
    }

    if (description.trim().length < 15) {
      onShowToast('Please provide a brief description of your project/campaign (min 15 chars).', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        id: `adreq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: currentUser?.id || null,
        name: name.trim(),
        discord_username: discordUsername.trim(),
        email: email.trim(),
        brand_name: brandName.trim(),
        website_url: websiteUrl.trim() || null,
        promotion_type: promotionType,
        duration,
        description: description.trim(),
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('advertising_requests').insert(payload);

      if (error) {
        console.warn('Supabase advertising_requests insert error:', error.message);
        throw new Error(error.message || 'Database error: Failed to submit advertising request.');
      }

      playSuccessSound();
      setSubmittedSuccess(true);
      onShowToast('🎉 Advertising request submitted successfully!', 'success');

      // Reset form
      setName('');
      setDiscordUsername('');
      setEmail('');
      setBrandName('');
      setWebsiteUrl('');
      setDescription('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to submit request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1300px] mx-auto w-full space-y-12 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-950/90 via-[#0e1224] to-purple-950/90 p-8 sm:p-12 rounded-3xl border border-amber-500/40 shadow-2xl backdrop-blur-xl text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <span className="px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-game font-bold text-xs uppercase tracking-widest inline-block">
          Official Partnership & Sponsorship Terminal
        </span>
        <h1 className="text-3xl sm:text-5xl font-game font-black text-white uppercase tracking-wider max-w-3xl mx-auto leading-tight">
          Advertise With <span className="text-amber-400">VALUE.NET</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
          Connect your gaming community, Roblox project, Discord server, or YouTube channel directly with active Blox Fruits traders across the platform.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="#request-form"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-game font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            Request Advertising Quote
          </a>
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-game font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">forum</span>
            <span>Join Discord Community</span>
          </a>
        </div>
      </div>

      {/* Advertising Options Showcase */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-game font-black text-white uppercase tracking-wider">
            Available Promotional Placements
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl mx-auto">
            Choose from tailored promotional placements integrated cleanly into the platform experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adOptions.map((opt, idx) => (
            <div
              key={idx}
              className="bg-[#0e1224] border border-slate-800 hover:border-amber-500/50 p-6 sm:p-8 rounded-3xl space-y-4 transition-all duration-300 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                  </div>
                  <span className="px-3 py-1 bg-amber-950 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-game font-bold uppercase">
                    {opt.badge}
                  </span>
                </div>
                <h3 className="text-xl font-game font-bold text-white">{opt.title}</h3>
                <p className="text-xs text-amber-400 font-mono font-semibold">📍 Placement: {opt.location}</p>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{opt.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Pricing: <strong className="text-amber-300">Request a Quote</strong></span>
                <a
                  href="#request-form"
                  className="text-xs font-game font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider flex items-center gap-1"
                >
                  <span>Select Placement</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advertising Request Form */}
      <div id="request-form" className="bg-[#0e1224] border-2 border-amber-500/40 p-8 sm:p-12 rounded-3xl shadow-2xl space-y-8 max-w-4xl mx-auto">
        <div className="border-b border-slate-800 pb-6 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-game font-black text-white uppercase tracking-wider flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-3xl">send</span>
            <span>Request Advertising Quote</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans">
            Submit your promotion details below. Our staff team reviews all advertising requests for community suitability.
          </p>
        </div>

        {submittedSuccess ? (
          <div className="bg-emerald-950/80 border-2 border-emerald-500/80 p-8 rounded-3xl text-center space-y-4 animate-in zoom-in-95">
            <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
            <h3 className="text-2xl font-game font-black text-white uppercase">Request Submitted!</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto font-sans">
              Thank you for reaching out. Our team will review your partnership request and get in touch via Discord or Email shortly.
            </p>
            <button
              onClick={() => setSubmittedSuccess(false)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-game font-bold text-xs uppercase rounded-xl shadow-lg cursor-pointer"
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-2">
                  Your Full Name / Alias <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Miller"
                  required
                  className="w-full p-3 bg-[#070913] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-2">
                  Discord Username <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  placeholder="e.g. alex_trader#0001 or alex_trader"
                  required
                  className="w-full p-3 bg-[#070913] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-2">
                  Contact Email Address <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@yourbrand.com"
                  required
                  className="w-full p-3 bg-[#070913] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-2">
                  Brand / Project Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Blox Trading Community"
                  required
                  className="w-full p-3 bg-[#070913] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-2">
                  Website / Server URL (Optional)
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://discord.gg/yourserver"
                  className="w-full p-3 bg-[#070913] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-2">
                  Desired Promotion Type
                </label>
                <select
                  value={promotionType}
                  onChange={(e) => setPromotionType(e.target.value)}
                  className="w-full p-3 bg-[#070913] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white outline-none font-mono"
                >
                  <option value="Website Banner">Website Banner Placement</option>
                  <option value="Featured Community">Featured Community & Server</option>
                  <option value="Sponsored Giveaway">Sponsored Community Giveaway</option>
                  <option value="Featured Creator">Featured Creator / Channel</option>
                  <option value="Other Custom">Other Custom Partnership</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-2">
                Campaign Details & Requirements <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project, promotion goals, target timeline, or special requirements..."
                rows={4}
                required
                className="w-full p-3.5 bg-[#070913] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 outline-none font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-game font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting Request...' : 'Submit Advertising Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
