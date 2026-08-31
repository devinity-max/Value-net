import React, { useState } from 'react';
import { ActiveTab } from '../types';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface SafetyViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SafetyView: React.FC<SafetyViewProps> = ({
  onNavigateTab,
  onOpenAuth,
  onShowToast,
}) => {
  const [reportTarget, setReportTarget] = useState('');
  const [reportReason, setReportReason] = useState('Scam / Bait-and-Switch');
  const [reportDetails, setReportDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget.trim() || !reportDetails.trim()) {
      onShowToast('Please specify the username and description of the violation.', 'error');
      return;
    }
    playSuccessSound();
    setSubmitted(true);
    onShowToast('Safety report submitted to moderation dispatch.', 'success');
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1000px] mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/20 p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-[11px] font-game font-bold text-emerald-300 uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-xs">verified_user</span>
            <span>Security & Trust Center</span>
          </div>
          <h1 className="text-3xl font-game font-black text-white uppercase tracking-wide">
            Trader Safety & Anti-Scam Shield
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Essential protocols to protect your inventory during in-game trades.
          </p>
        </div>

        {/* Safety Principles Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#0e1224] p-5 rounded-2xl border border-purple-500/30 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-purple-300 text-lg">fact_check</span>
            </div>
            <h3 className="font-game font-bold text-sm text-white uppercase">1. Value Calculator Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Always load both trade sides into the VALUE.NET calculator prior to accepting. Ensure you check demand ratings in addition to pure Beli/Market valuation.
            </p>
          </div>

          <div className="bg-[#0e1224] p-5 rounded-2xl border border-purple-500/30 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-purple-300 text-lg">timer</span>
            </div>
            <h3 className="font-game font-bold text-sm text-white uppercase">2. 10-Second Countdown Rule</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Roblox Blox Fruits enforces a countdown timer. Never jump the gun—watch the other trader's slots closely until the countdown completes to prevent last-second removal scams.
            </p>
          </div>

          <div className="bg-[#0e1224] p-5 rounded-2xl border border-purple-500/30 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-purple-300 text-lg">link_off</span>
            </div>
            <h3 className="font-game font-bold text-sm text-white uppercase">3. Never Click External Links</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              VALUE.NET staff will never ask you to click external verification links or enter Roblox passwords on third-party sites. All trades happen inside official Roblox servers.
            </p>
          </div>

          <div className="bg-[#0e1224] p-5 rounded-2xl border border-purple-500/30 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-purple-300 text-lg">shield</span>
            </div>
            <h3 className="font-game font-bold text-sm text-white uppercase">4. Trust Index & Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Look for Verified Trader and Master Negotiator badges on user profiles. Low reputation scores indicate higher risk of trade cancellations or unreliable behavior.
            </p>
          </div>
        </div>

        {/* Report Trader Form */}
        <div className="bg-[#0e1224] p-6 rounded-2xl border border-rose-500/30 space-y-4">
          <div className="flex items-center gap-2 text-rose-400 font-game font-bold text-sm uppercase">
            <span className="material-symbols-outlined text-lg">report_problem</span>
            <span>Report Suspicious Trader / Scam Attempt</span>
          </div>

          {submitted ? (
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-4 rounded-xl text-emerald-300 text-xs font-game">
              Report received and flagged for safety review. Thank you for keeping VALUE.NET safe!
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-game font-bold text-slate-400 uppercase mb-1.5">
                    Target Player Username
                  </label>
                  <input
                    type="text"
                    value={reportTarget}
                    onChange={(e) => setReportTarget(e.target.value)}
                    placeholder="e.g. suspicious_trader"
                    className="w-full bg-[#070913] border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-game font-bold text-slate-400 uppercase mb-1.5">
                    Violation Category
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-[#070913] border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Scam / Bait-and-Switch">Scam / Bait-and-Switch</option>
                    <option value="Phishing / External Links">Phishing / External Links</option>
                    <option value="Harassment / Abusive Behavior">Harassment / Abusive Behavior</option>
                    <option value="RMT / Real Money Solicitation">RMT / Real Money Solicitation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-game font-bold text-slate-400 uppercase mb-1.5">
                  Incident Details & Evidence Description
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  placeholder="Describe what occurred, trade room details, or relevant context..."
                  className="w-full bg-[#070913] border border-slate-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-rose-600/30"
              >
                Submit Safety Report
              </button>
            </form>
          )}
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onNavigateTab('calculator');
            }}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-purple-600/30"
          >
            Return to Calculator
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onNavigateTab('contact');
            }}
            className="text-xs font-game text-purple-400 hover:text-purple-300 uppercase tracking-wider"
          >
            Contact Staff Support →
          </button>
        </div>
      </div>
    </div>
  );
};
