import React, { useState } from 'react';
import { GiveawayItem } from '../types';
import { FruitImage } from './FruitImage';
import { formatMoney } from '../utils/calc';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface DropEntryModalProps {
  giveaway: GiveawayItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmitEntry: (giveawayId: string, secretCode?: string) => Promise<{ success: boolean; error?: string }>;
}

export const DropEntryModal: React.FC<DropEntryModalProps> = ({
  giveaway,
  isOpen,
  onClose,
  onSubmitEntry,
}) => {
  const [secretCode, setSecretCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const prizeTotal = (giveaway.prizes || []).reduce(
    (sum, p) => sum + (p?.marketValue || p?.value || 0) * (p?.quantity || 1),
    0
  );

  // Extract YouTube Embed URL
  const videoId = giveaway.youtubeVideoId;
  const embedUrl = videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0` : null;
  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : 'https://youtube.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (giveaway.youtubeBoostEnabled && !secretCode.trim()) {
      setErrorMessage('Please enter the secret code found in the video.');
      return;
    }

    setIsSubmitting(true);
    const res = await onSubmitEntry(giveaway.id, secretCode.trim() || undefined);
    setIsSubmitting(false);

    if (res.success) {
      playSuccessSound();
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to enter drop. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0b0f1d] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-950/90 via-[#0e1224] to-indigo-950/90 border-b border-purple-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
              <span className="material-symbols-outlined text-xl">celebration</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-[10px] font-game font-bold text-purple-300 uppercase">
                <span>Community Drop Entry</span>
              </div>
              <h2 className="text-base font-game font-bold text-white truncate max-w-[240px] sm:max-w-xs">
                {giveaway.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans text-xs text-slate-300">
          {/* Host & Prize Pool Summary */}
          <div className="bg-[#070913] p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-500/30 flex items-center justify-center text-purple-300">
                  <span className="material-symbols-outlined text-xs">
                    {giveaway.hostAvatar || 'person'}
                  </span>
                </div>
                <span className="font-game font-bold text-xs text-white">
                  Hosted by @{giveaway.hostName}
                </span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                ${formatMoney(prizeTotal)} Pool
              </div>
            </div>

            {/* Prizes List */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(giveaway.prizes || []).map((f, idx) => (
                <span
                  key={idx}
                  className="bg-[#0e1224] px-2.5 py-1 rounded-xl border border-purple-500/30 text-[11px] font-mono text-purple-200 flex items-center gap-1.5"
                >
                  <FruitImage fruit={f} size="xs" className="w-4 h-4 rounded-xs" />
                  <span>{f.name || f.fruitName}</span>
                  {(f.quantity || 1) > 1 && (
                    <span className="text-amber-400 font-bold">x{f.quantity}</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* YouTube Video Section */}
          {giveaway.youtubeBoostEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-purple-300 uppercase">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-500 text-sm">play_circle</span>
                  <span>Watch Video to Find Secret Code</span>
                </span>
                <span className="text-amber-400 font-bold">+{giveaway.youtubeBoostPercentage || 10}% Boost</span>
              </div>

              {embedUrl ? (
                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-purple-500/30 bg-black shadow-lg">
                  <iframe
                    src={embedUrl}
                    title="Creator Giveaway Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="p-3 bg-[#080b18] border border-rose-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500 text-xl">smart_display</span>
                    <span className="text-xs text-slate-300">Creator Video Attached</span>
                  </div>
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-game font-bold text-xs uppercase flex items-center gap-1"
                  >
                    <span>Watch Video</span>
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-rose-400 text-base shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Secret Code Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {giveaway.youtubeBoostEnabled && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-game font-bold text-slate-300 uppercase tracking-wider">
                  Enter Secret Drop Code
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 text-base">
                    key
                  </span>
                  <input
                    type="text"
                    value={secretCode}
                    onChange={(e) => setSecretCode(e.target.value)}
                    placeholder="Enter secret code from video..."
                    className="w-full pl-10 pr-4 py-3 bg-[#070913] border border-purple-500/40 focus:border-purple-400 rounded-xl text-xs text-white placeholder-slate-500 font-mono tracking-widest uppercase focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 border border-purple-400/40 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying & Entering...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">how_to_reg</span>
                  <span>ENTER DROP NOW</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
