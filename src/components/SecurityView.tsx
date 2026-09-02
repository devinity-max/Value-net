import React from 'react';
import { ActiveTab } from '../types';

interface PolicyViewProps {
  onNavigateTab?: (tab: ActiveTab) => void;
  onOpenAuth?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SecurityView: React.FC<PolicyViewProps> = ({ onNavigateTab }) => {
  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white font-mono uppercase tracking-wide">
            SECURITY & INTEGRITY
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
        <p className="text-xs text-slate-400">VALUE.NET platform infrastructure & protection mechanisms</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <span className="material-symbols-outlined text-amber-400 text-2xl mb-1">lock</span>
            <div className="font-bold text-white uppercase font-mono">End-to-End SSL</div>
            <div className="text-slate-400 mt-1">Encrypted HTTPS traffic and secure token sessions.</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <span className="material-symbols-outlined text-purple-400 text-2xl mb-1">shield</span>
            <div className="font-bold text-white uppercase font-mono">DDoS Resilience</div>
            <div className="text-slate-400 mt-1">Rate-limiting protection on live feeds & API gateways.</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
            <span className="material-symbols-outlined text-emerald-400 text-2xl mb-1">verified_user</span>
            <div className="font-bold text-white uppercase font-mono">Audit Logs</div>
            <div className="text-slate-400 mt-1">Immutable administrative audit logging for all price changes.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
