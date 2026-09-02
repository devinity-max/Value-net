import React, { useState } from 'react';
import { ActiveTab } from '../types';

export interface ContactViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
  onOpenAuth?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigateTab, onShowToast }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onShowToast) onShowToast('Your inquiry has been submitted to VALUE.NET support.', 'success');
    setSubject('');
    setMessage('');
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-3xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase tracking-wide">
            CONTACT & SUPPORT
          </h1>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('calculator')}
              className="text-xs text-amber-400 hover:underline font-mono"
            >
              &larr; Back to App
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-mono uppercase">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Partnership inquiry, bug report..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white mt-1"
              required
            />
          </div>

          <div>
            <label className="text-slate-400 font-mono uppercase">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Describe your inquiry..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white mt-1"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase font-mono cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Submit Ticket
          </button>
        </form>
      </div>
    </div>
  );
};
