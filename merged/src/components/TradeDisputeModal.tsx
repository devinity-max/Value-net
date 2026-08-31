import React, { useState } from 'react';
import { playClickSound, playAlertSound } from '../utils/audio';

interface TradeDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUsername: string;
  onSubmitSuccess?: () => void;
}

export const TradeDisputeModal: React.FC<TradeDisputeModalProps> = ({
  isOpen,
  onClose,
  targetUsername,
  onSubmitSuccess,
}) => {
  const [reason, setReason] = useState('Scam / Bait & Switch Attempt');
  const [details, setDetails] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      playAlertSound();
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
        className="w-full max-w-md bg-[#0e1224] border-2 border-rose-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400">report</span>
            <h3 className="text-lg font-black font-game text-white">
              Report Trader: <span className="text-rose-400">@{targetUsername}</span>
            </h3>
          </div>
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
            <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Dispute Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#141830] border border-slate-700 rounded-xl p-2.5 text-slate-200 outline-none"
            >
              <option value="Scam / Bait & Switch Attempt">Scam / Bait & Switch Attempt</option>
              <option value="Cross-Trading Solicitation">Cross-Trading Solicitation (Real Money / Gift Cards)</option>
              <option value="Harassment / Toxicity">Harassment / Toxicity</option>
              <option value="Fake / Manipulated Fruit Listings">Fake / Manipulated Fruit Listings</option>
              <option value="Other Rule Violation">Other Rule Violation</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Incident Details</label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              required
              placeholder="Describe what occurred during the trade exchange..."
              className="w-full bg-[#141830] border border-slate-700 rounded-xl p-2.5 text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Screenshot / Clip Proof URL (Optional)</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://imgur.com/... or https://youtube.com/..."
              className="w-full bg-[#141830] border border-slate-700 rounded-xl p-2.5 text-slate-200 placeholder-slate-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white font-game font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95"
          >
            {submitting ? 'Transmitting Report...' : 'File Trust Dispute'}
          </button>
        </form>
      </div>
    </div>
  );
};
