import React, { useState } from 'react';

interface ApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiModal: React.FC<ApiModalProps> = ({ isOpen, onClose }) => {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  if (!isOpen) return null;

  const endpoints = [
    { method: 'GET', path: '/api/fruits', desc: 'Fetch full authoritative catalog of Blox Fruits and Gamepasses' },
    { method: 'GET', path: '/api/trades/feed', desc: 'Live public trade feed with 30s polling or WebSockets' },
    { method: 'GET', path: '/api/giveaways', desc: 'Active community giveaways and prize pools' },
    { method: 'GET', path: '/api/system/health', desc: 'System status, pool capacity, and uptime health metrics' },
  ];

  const handleCopy = (path: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl).catch(() => {});
    setCopiedEndpoint(path);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl p-0.5 bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] shadow-[0_0_15px_rgba(168,85,247,0.3)] shrink-0 overflow-hidden">
            <img
              src="/assets/logo.png"
              alt="Value.NET Official Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <div>
            <h3 className="text-lg font-black text-white font-game uppercase tracking-wide">VALUE.NET OPEN API</h3>
            <p className="text-xs text-slate-400">Public endpoints for developer bots, Discord widgets, and integrations.</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {endpoints.map((ep) => (
            <div
              key={ep.path}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4 font-mono text-xs"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                  {ep.method}
                </span>
                <span className="text-slate-200 font-bold truncate">{ep.path}</span>
              </div>
              <button
                onClick={() => handleCopy(ep.path)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
              >
                {copiedEndpoint === ep.path ? 'COPIED!' : 'COPY URL'}
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-300 flex items-center justify-between">
          <span>Need custom webhooks or high-rate limits?</span>
          <a
            href="https://discord.gg/np4sVrpypF"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline hover:text-indigo-200 ml-2"
          >
            Request API Key in Discord &rarr;
          </a>
        </div>
      </div>
    </div>
  );
};
