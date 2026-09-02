import React, { useState } from 'react';
import { AuthUser } from '../types';

export interface MonetizationAdminViewProps {
  currentUser: AuthUser;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const MonetizationAdminView: React.FC<MonetizationAdminViewProps> = ({
  currentUser,
  onShowToast,
}) => {
  const [adsEnabled, setAdsEnabled] = useState(true);

  const handleSave = () => {
    if (onShowToast) onShowToast('Monetization settings saved successfully!', 'success');
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white font-mono uppercase tracking-wide">
          MONETIZATION & SPONSOR MANAGER
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure native sponsored slots, ad placements, and Discord banner integrations.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-w-2xl">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
          <div>
            <div className="text-xs font-bold text-white">Enable Native Ad Slots</div>
            <div className="text-[10px] text-slate-400">Display sponsor banners across calculator and feeds</div>
          </div>
          <button
            onClick={() => setAdsEnabled(!adsEnabled)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold font-mono uppercase cursor-pointer ${
              adsEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {adsEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase cursor-pointer font-mono"
        >
          Save Monetization Profile
        </button>
      </div>
    </div>
  );
};
