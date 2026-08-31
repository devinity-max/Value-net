import React, { useState } from 'react';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

interface TradeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUsername: string;
  onSubmitSuccess?: () => void;
}

export const TradeReviewModal: React.FC<TradeReviewModalProps> = ({
  isOpen,
  onClose,
  targetUsername,
  onSubmitSuccess,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tradeContext, setTradeContext] = useState('Smooth & Fast Trade');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      playTradeSuccessSound();
      if (onSubmitSuccess) onSubmitSuccess();
      onClose();
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0e1224] border-2 border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h3 className="text-lg font-black font-game text-white">
            Review Trader: <span className="text-amber-400">@{targetUsername}</span>
          </h3>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Rating (1 to 5 Stars)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => {
                    playClickSound();
                    setRating(star);
                  }}
                  className={`p-2 rounded-xl border text-base ${
                    rating >= star
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Trade Outcome Tag</label>
            <select
              value={tradeContext}
              onChange={(e) => setTradeContext(e.target.value)}
              className="w-full bg-[#141830] border border-slate-700 rounded-xl p-2.5 text-slate-200 outline-none"
            >
              <option value="Smooth & Fast Trade">Smooth & Fast Trade</option>
              <option value="Patient & Polite">Patient & Polite</option>
              <option value="Generous Trader">Generous Trader</option>
              <option value="Fair Exchange">Fair Exchange</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Feedback Comment</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe your trade experience with this player..."
              className="w-full bg-[#141830] border border-slate-700 rounded-xl p-2.5 text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-game font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95"
          >
            {submitting ? 'Submitting...' : 'Submit Verified Review'}
          </button>
        </form>
      </div>
    </div>
  );
};
