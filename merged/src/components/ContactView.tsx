import React, { useState } from 'react';
import { ActiveTab } from '../types';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface ContactViewProps {
  onNavigateTab: (tab: ActiveTab) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ContactView: React.FC<ContactViewProps> = ({
  onNavigateTab,
  onShowToast,
}) => {
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      onShowToast('Please fill in your contact email and message.', 'error');
      return;
    }
    playSuccessSound();
    setSent(true);
    onShowToast('Message transmitted to VALUE.NET staff.', 'success');
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1000px] mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/20 p-8 sm:p-12 shadow-2xl backdrop-blur-xl space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-500/40 text-[11px] font-game font-bold text-purple-300 uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-xs">headset_mic</span>
            <span>Support Terminal</span>
          </div>
          <h1 className="text-3xl font-game font-black text-white uppercase tracking-wide">
            Contact Support & Staff
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Need assistance with account recovery, value feedback, or partnership requests?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Channels */}
          <div className="space-y-4">
            <div className="bg-[#0e1224] p-5 rounded-2xl border border-purple-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-400 font-game font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">forum</span>
                <span>Community Discord</span>
              </div>
              <p className="text-xs text-slate-400">
                Join our official Discord for real-time live trading channels and community feedback.
              </p>
              <div className="pt-2">
                <span className="text-xs font-mono text-purple-300">discord.gg/valuenet</span>
              </div>
            </div>

            <div className="bg-[#0e1224] p-5 rounded-2xl border border-purple-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-sky-400 font-game font-bold text-xs uppercase">
                <span className="material-symbols-outlined text-base">mail</span>
                <span>Email Inquiries</span>
              </div>
              <p className="text-xs text-slate-400">
                Direct inquiries for creator partnerships and moderation escalation.
              </p>
              <div className="pt-2">
                <span className="text-xs font-mono text-sky-300">support@valuenet.app</span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2 bg-[#0e1224] p-6 rounded-2xl border border-slate-800 space-y-4">
            {sent ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                  <span className="material-symbols-outlined text-2xl">check</span>
                </div>
                <h3 className="font-game font-bold text-lg text-white">Transmission Sent</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Our staff team has received your message and will review it promptly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-game font-bold text-slate-400 uppercase mb-1.5">
                    Your Contact Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@example.com"
                    className="w-full bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-game font-bold text-slate-400 uppercase mb-1.5">
                    Subject / Topic
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Value adjustment suggestion, bug report, creator application"
                    className="w-full bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-game font-bold text-slate-400 uppercase mb-1.5">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Detailed explanation of your inquiry..."
                    className="w-full bg-[#070913] border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>
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
              onNavigateTab('security');
            }}
            className="text-xs font-game text-purple-400 hover:text-purple-300 uppercase tracking-wider"
          >
            Security Specifications →
          </button>
        </div>
      </div>
    </div>
  );
};
