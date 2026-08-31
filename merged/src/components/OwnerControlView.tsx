import React, { useState, useEffect } from 'react';
import { AuthUser, ActiveTab } from '../types';
import { apiGetSystemHealth, SystemHealthMetrics } from '../utils/systemStatus';
import { isOwner, isAdmin } from '../utils/permissions';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';
import { getDiscordUrl, setDiscordUrl, resetDiscordUrl, formatDiscordUrl, isValidDiscordUrl } from '../utils/brandSettings';
import { BRAND_CONFIG } from '../data/brand';

interface OwnerControlViewProps {
  currentUser: AuthUser | null;
  onViewTraderProfile: (username: string) => void;
  onNavigateToTab: (tab: ActiveTab) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const OwnerControlView: React.FC<OwnerControlViewProps> = ({
  currentUser,
  onViewTraderProfile,
  onNavigateToTab,
  onShowToast,
}) => {
  const [health, setHealth] = useState<SystemHealthMetrics | null>(null);
  const [targetUsername, setTargetUsername] = useState('');
  const [targetRole, setTargetRole] = useState('MODERATOR');
  const [loading, setLoading] = useState(false);

  // Discord Link Management State
  const [discordInput, setDiscordInput] = useState('');
  const [activeDiscordUrl, setActiveDiscordUrl] = useState('');

  const canAccess = isOwner(currentUser) || isAdmin(currentUser);

  useEffect(() => {
    apiGetSystemHealth().then((res) => {
      if (res.success && res.health) setHealth(res.health);
    });

    const curr = getDiscordUrl();
    setActiveDiscordUrl(curr);
    setDiscordInput(curr === BRAND_CONFIG.officialDiscordUrl ? '' : curr);
  }, []);

  if (!canAccess) {
    return (
      <div className="pt-28 sm:pt-32 pb-20 px-4 max-w-xl mx-auto text-center font-sans">
        <div className="p-8 bg-[#12162d] border border-rose-500/50 rounded-3xl">
          <span className="material-symbols-outlined text-4xl text-rose-400 mb-3">lock</span>
          <h2 className="text-xl font-black font-game text-white mb-2">Restricted Access</h2>
          <p className="text-xs text-slate-400 mb-4">
            This module requires Administrator or Root Owner administrative credentials.
          </p>
          <button
            onClick={() => onNavigateToTab('calculator')}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-game text-xs font-bold uppercase rounded-xl"
          >
            Return to Calculator
          </button>
        </div>
      </div>
    );
  }

  const handleRoleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      playTradeSuccessSound();
      onShowToast(`Updated role for @${targetUsername.trim()} to ${targetRole}`, 'success');
      setTargetUsername('');
    }, 500);
  };

  const handleSaveDiscordUrl = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (!discordInput.trim()) {
      const reset = resetDiscordUrl();
      setActiveDiscordUrl(reset);
      playTradeSuccessSound();
      onShowToast('Reset Discord invite link to default', 'info');
      return;
    }

    const formatted = formatDiscordUrl(discordInput.trim());
    if (!isValidDiscordUrl(formatted)) {
      onShowToast('Please enter a valid Discord invite link or URL', 'error');
      return;
    }

    const result = setDiscordUrl(formatted);
    if (result.success) {
      setActiveDiscordUrl(result.url);
      playTradeSuccessSound();
      onShowToast('Platform Discord link updated successfully!', 'success');
    } else {
      onShowToast(result.error || 'Failed to update link', 'error');
    }
  };

  const handleResetDiscordUrl = () => {
    playClickSound();
    const def = resetDiscordUrl();
    setActiveDiscordUrl(def);
    setDiscordInput('');
    playTradeSuccessSound();
    onShowToast('Platform Discord link reset to official default', 'info');
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1200px] mx-auto w-full font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-game font-bold uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-sm">shield</span>
            SYSTEM LEVEL // ADMIN CONSOLE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-game text-white tracking-wide uppercase">
            Owner & Administration Terminal
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateToTab('monetization-admin')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600/30 to-yellow-600/30 hover:from-amber-600/50 hover:to-yellow-600/50 border border-amber-500/50 text-amber-300 font-game font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-2 shadow-lg"
          >
            <span className="material-symbols-outlined text-base text-amber-400">campaign</span>
            Monetization & Ads
          </button>
          <button
            onClick={() => onNavigateToTab('community')}
            className="px-4 py-2.5 bg-[#181d38] hover:bg-[#20274d] border border-indigo-500/40 text-indigo-300 font-game font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">groups</span>
            View Community Hub
          </button>
          <button
            onClick={() => onNavigateToTab('fruit-catalog-admin')}
            className="px-4 py-2.5 bg-[#181d38] hover:bg-purple-950 border border-purple-500/40 text-amber-300 font-game font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">category</span>
            Manage Fruit Catalog
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* System telemetry card */}
        <div className="bg-[#0e1224] border border-purple-500/30 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-black font-game text-amber-400 uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">memory</span>
            System Diagnostics
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between p-3 bg-[#141830] rounded-xl border border-slate-800">
              <span className="text-slate-400">Server Health</span>
              <span className="text-emerald-400 font-bold font-mono">{health?.status || 'OPTIMAL'}</span>
            </div>
            <div className="flex justify-between p-3 bg-[#141830] rounded-xl border border-slate-800">
              <span className="text-slate-400">Active Trade Sessions</span>
              <span className="text-white font-bold font-mono">{health?.activeTrades || 18}</span>
            </div>
            <div className="flex justify-between p-3 bg-[#141830] rounded-xl border border-slate-800">
              <span className="text-slate-400">Memory Load</span>
              <span className="text-white font-bold font-mono">{health?.memoryUsageMb || 85} MB</span>
            </div>
          </div>
        </div>

        {/* User Role Management Card */}
        <div className="bg-[#0e1224] border border-purple-500/30 rounded-3xl p-6 shadow-xl space-y-4 md:col-span-2">
          <h3 className="text-sm font-black font-game text-amber-400 uppercase flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            Role Assignment & Permissions
          </h3>
          <form onSubmit={handleRoleAssign} className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Target Username</label>
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="e.g. Admiral Marco"
                  required
                  className="w-full px-3.5 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Assigned Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none"
                >
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="CREATOR">CREATOR</option>
                  <option value="VIP">VIP</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="BANNED">BANNED</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Updating Permissions...' : 'Update Player Role'}
            </button>
          </form>
        </div>

        {/* Global Discord Link Configuration Card */}
        <div className="bg-[#0e1224] border border-indigo-500/30 rounded-3xl p-6 shadow-xl space-y-4 md:col-span-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black font-game text-white uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-[#5865F2]">forum</span>
              Discord Integration & Server Invite Link
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Active: <strong className="text-amber-400">{activeDiscordUrl}</strong>
            </span>
          </div>

          <form onSubmit={handleSaveDiscordUrl} className="space-y-4 text-xs">
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-slate-300 font-game font-bold uppercase mb-1.5 text-[11px]">
                  Custom Discord Invite URL / Code
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-base">
                    link
                  </span>
                  <input
                    type="text"
                    value={discordInput}
                    onChange={(e) => setDiscordInput(e.target.value)}
                    placeholder="https://discord.gg/yourserver or discord.gg/code"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#141830] border border-indigo-500/30 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-[#5865F2] font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-game font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(88,101,242,0.3)] active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  Save Link
                </button>
                <button
                  type="button"
                  onClick={handleResetDiscordUrl}
                  className="px-3.5 py-2.5 bg-[#161b36] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-300 font-game font-bold text-xs uppercase rounded-xl transition-all"
                  title="Reset to default official Discord"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => window.open(activeDiscordUrl, '_blank', 'noopener,noreferrer')}
                  className="px-3 py-2.5 bg-[#161b36] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
                  title="Test current link"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Updating this value immediately propagates the custom invite URL to all navigation buttons, Discord community banners, footer links, and trading portal CTAs.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
