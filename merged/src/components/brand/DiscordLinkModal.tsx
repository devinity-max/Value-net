import React, { useState, useEffect } from 'react';
import { getDiscordUrl, setDiscordUrl, resetDiscordUrl, isValidDiscordUrl, formatDiscordUrl } from '../../utils/brandSettings';
import { BRAND_CONFIG } from '../../data/brand';
import { playClickSound, playTradeSuccessSound } from '../../utils/audio';

interface DiscordLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newUrl: string) => void;
}

export const DiscordLinkModal: React.FC<DiscordLinkModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [discordInput, setDiscordInput] = useState('');
  const [currentActiveUrl, setCurrentActiveUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const active = getDiscordUrl();
      setCurrentActiveUrl(active);
      setDiscordInput(active === BRAND_CONFIG.officialDiscordUrl ? '' : active);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    if (!discordInput.trim()) {
      const reset = resetDiscordUrl();
      setCurrentActiveUrl(reset);
      playTradeSuccessSound();
      setStatusMessage({ type: 'success', text: 'Discord link reset to official default.' });
      if (onSuccess) onSuccess(reset);
      setTimeout(() => {
        onClose();
      }, 1000);
      return;
    }

    const formatted = formatDiscordUrl(discordInput.trim());
    if (!isValidDiscordUrl(formatted)) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid Discord invite link (e.g. discord.gg/valuenet or https://discord.gg/yourcode).',
      });
      return;
    }

    const result = setDiscordUrl(formatted);
    if (result.success) {
      setCurrentActiveUrl(result.url);
      playTradeSuccessSound();
      setStatusMessage({
        type: 'success',
        text: 'Custom Discord link saved and applied everywhere!',
      });
      if (onSuccess) onSuccess(result.url);
      setTimeout(() => {
        onClose();
      }, 900);
    } else {
      setStatusMessage({ type: 'error', text: result.error || 'Failed to save link.' });
    }
  };

  const handleResetToDefault = () => {
    playClickSound();
    const def = resetDiscordUrl();
    setCurrentActiveUrl(def);
    setDiscordInput('');
    playTradeSuccessSound();
    setStatusMessage({ type: 'info', text: 'Reset to official VALUE.NET Discord.' });
    if (onSuccess) onSuccess(def);
  };

  const handleTestLink = () => {
    playClickSound();
    const testUrl = discordInput.trim() ? formatDiscordUrl(discordInput.trim()) : currentActiveUrl;
    window.open(testUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0e1224] border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#5865F2]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-[0_0_15px_rgba(88,101,242,0.4)]">
              <span className="material-symbols-outlined text-2xl">forum</span>
            </div>
            <div>
              <span className="text-[10px] font-game font-bold text-amber-400 uppercase tracking-wider block">
                COMMUNITY CONFIGURATION
              </span>
              <h3 className="text-lg font-black font-game text-white">
                Insert Discord Invite Link
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#161b36] hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 pt-5 relative z-10 text-xs font-sans">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-300 font-game font-bold uppercase tracking-wider text-[11px]">
                Discord Server Link / Invite Code
              </label>
              {currentActiveUrl !== BRAND_CONFIG.officialDiscordUrl && (
                <span className="text-[10px] font-bold text-amber-400 font-mono">
                  [CUSTOM LINK ACTIVE]
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-base">
                link
              </span>
              <input
                type="text"
                value={discordInput}
                onChange={(e) => setDiscordInput(e.target.value)}
                placeholder="discord.gg/yourserver or https://discord.gg/..."
                className="w-full pl-10 pr-4 py-3 bg-[#141830] border border-indigo-500/30 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-[#5865F2] transition-colors font-mono text-xs"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Enter your own Discord server invite code or full URL. All Discord buttons across the navbar, community hub, footer, and trade pages will instantly route here.
            </p>
          </div>

          {/* Current Active Preview */}
          <div className="p-3.5 rounded-xl bg-[#090b16] border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-game tracking-wider block">
              Currently Active Link:
            </span>
            <div className="flex items-center justify-between gap-2 overflow-hidden">
              <span className="font-mono text-slate-300 truncate text-[11px]">
                {currentActiveUrl || BRAND_CONFIG.officialDiscordUrl}
              </span>
              <button
                type="button"
                onClick={handleTestLink}
                className="px-2.5 py-1 rounded-lg bg-[#161b36] hover:bg-[#5865F2] text-white text-[10px] font-game font-bold uppercase transition-colors shrink-0 flex items-center gap-1"
              >
                <span>Test</span>
                <span className="material-symbols-outlined text-[10px]">open_in_new</span>
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <span className="text-[10px] font-game font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDiscordInput('https://discord.gg/np4sVrpypF')}
                className="px-2.5 py-1 rounded-lg bg-[#141830] hover:bg-[#1f264d] border border-slate-700 text-slate-300 text-[10px] font-mono transition-colors"
              >
                Official: discord.gg/np4sVrpypF
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-2.5 py-1 rounded-lg bg-[#141830] hover:bg-[#1f264d] border border-slate-700 text-amber-300 text-[10px] font-mono transition-colors"
              >
                Reset to Default
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  : 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
              }`}
            >
              <span className="material-symbols-outlined text-base shrink-0">
                {statusMessage.type === 'success'
                  ? 'check_circle'
                  : statusMessage.type === 'error'
                  ? 'error'
                  : 'info'}
              </span>
              <span className="text-[11px] font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-[#161b36] hover:bg-slate-800 text-slate-300 font-game font-bold text-xs uppercase transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-game font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 shadow-[0_0_20px_rgba(88,101,242,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>Save & Apply Link</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
