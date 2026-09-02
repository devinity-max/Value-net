import React, { useState } from 'react';
import { AuthUser, ActiveTab } from '../types';

export interface OwnerControlViewProps {
  currentUser: AuthUser;
  onViewTraderProfile?: (username: string) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const OwnerControlView: React.FC<OwnerControlViewProps> = ({
  currentUser,
  onShowToast,
  onNavigateToTab,
}) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [rateLimitThreshold, setRateLimitThreshold] = useState('100');

  const handleSave = () => {
    if (onShowToast) onShowToast('System settings updated successfully!', 'success');
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white font-mono uppercase tracking-wide">
            ROOT OWNER CONTROL CONSOLE
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Highest clearance system diagnostics, global maintenance toggle, and core parameter overrides.
          </p>
        </div>
        {onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab('calculator')}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-mono font-bold text-slate-300 hover:text-white"
          >
            &larr; Back to App
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h2 className="text-base font-bold text-white font-mono uppercase">Global Infrastructure</h2>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-bold text-white">Emergency Maintenance Mode</div>
              <div className="text-[10px] text-slate-400">Lock public endpoints and live trade creation</div>
            </div>
            <button
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold font-mono uppercase cursor-pointer ${
                maintenanceMode ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {maintenanceMode ? 'ACTIVE' : 'OFF'}
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-mono uppercase">Websocket Rate Limit (req/min)</label>
            <input
              type="number"
              value={rateLimitThreshold}
              onChange={(e) => setRateLimitThreshold(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white mt-1 text-xs"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase cursor-pointer font-mono"
          >
            Commit Core Configuration
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <h2 className="text-base font-bold text-white font-mono uppercase">Security Audit Status</h2>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Operator Identity</div>
            <div className="text-sm font-bold text-amber-400 font-mono">@{currentUser.username} (ROOT_OWNER)</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Cluster Uptime</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">99.98% Healthy</div>
          </div>
        </div>
      </div>
    </div>
  );
};
