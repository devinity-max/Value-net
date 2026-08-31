import React, { useState } from 'react';
import { playClickSound } from '../utils/audio';

interface ApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiModal: React.FC<ApiModalProps> = ({ isOpen, onClose }) => {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  if (!isOpen) return null;

  const endpoints = [
    {
      method: 'GET',
      path: '/api/fruits',
      desc: 'Returns the full Blox Fruits market catalog, baseline values, trends, and demand ratings.',
    },
    {
      method: 'GET',
      path: '/api/trades',
      desc: 'Fetch active peer-to-peer trade ads across all seas and servers.',
    },
    {
      method: 'POST',
      path: '/api/trades',
      desc: 'Create and broadcast a new trade offer listing.',
    },
    {
      method: 'GET',
      path: '/api/giveaways',
      desc: 'Retrieve active community giveaways, creator host info, and entry requirements.',
    },
    {
      method: 'GET',
      path: '/api/profiles/:username',
      desc: 'Query verified trader profile, reputation breakdown, badges, and vouch count.',
    },
    {
      method: 'GET',
      path: '/api/system/health',
      desc: 'Real-time telemetry, memory load, uptime, and emergency status metrics.',
    },
  ];

  const handleCopy = (path: string) => {
    playClickSound();
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopiedEndpoint(path);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#0e1224] border-2 border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-xl">terminal</span>
            </div>
            <div>
              <span className="text-[10px] font-game font-bold text-amber-400 uppercase tracking-widest block">
                DEVELOPER ACCESS // REST & WEBSOCKET
              </span>
              <h3 className="text-xl font-black text-white font-game">VALUE.NET Public API</h3>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-[#161b36] hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-white flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="overflow-y-auto pr-1 space-y-4 font-sans">
          <p className="text-xs text-slate-300">
            VALUE.NET provides high-performance JSON endpoints for Blox Fruits item valuations, live order books, and real-time trade matching.
          </p>

          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div
                key={ep.path}
                className="bg-[#141830] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-500/40 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        ep.method === 'GET'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-500/40'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-sm font-mono font-bold text-amber-300">{ep.path}</span>
                  </div>
                  <p className="text-xs text-slate-400">{ep.desc}</p>
                </div>
                <button
                  onClick={() => handleCopy(ep.path)}
                  className="px-3 py-1.5 bg-[#1e2447] hover:bg-purple-950 border border-purple-500/40 rounded-xl text-xs font-game text-slate-200 hover:text-amber-300 flex items-center gap-1.5 shrink-0 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copiedEndpoint === ep.path ? 'check' : 'content_copy'}
                  </span>
                  {copiedEndpoint === ep.path ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
