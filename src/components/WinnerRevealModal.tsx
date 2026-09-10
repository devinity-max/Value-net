import React, { useState, useEffect } from 'react';

interface WinnerRevealModalProps {
  winner: {
    user_id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  giveawayTitle: string;
  isHost: boolean;
  alreadyDrawn?: boolean;
  onContactWinner?: () => void;
  onMarkPrizeClaimed?: () => void;
  onClose: () => void;
}

type Phase = 'countdown' | 'reveal';

export const WinnerRevealModal: React.FC<WinnerRevealModalProps> = ({
  winner,
  giveawayTitle,
  isHost,
  alreadyDrawn = false,
  onContactWinner,
  onMarkPrizeClaimed,
  onClose,
}) => {
  const [phase, setPhase] = useState<Phase>(alreadyDrawn ? 'reveal' : 'countdown');
  const [countdownNum, setCountdownNum] = useState(3);
  const [visible, setVisible] = useState(false);

  // Fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Countdown 3 -> 2 -> 1 -> reveal (skipped if alreadyDrawn)
  useEffect(() => {
    if (alreadyDrawn) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCountdownNum(3), 0));
    timers.push(setTimeout(() => setCountdownNum(2), 1000));
    timers.push(setTimeout(() => setCountdownNum(1), 2000));
    timers.push(setTimeout(() => setPhase('reveal'), 3200));
    return () => timers.forEach(clearTimeout);
  }, [alreadyDrawn]);

  const displayName = winner.display_name || winner.username || 'winner';
  const username = winner.username || 'winner';

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={phase === 'reveal' ? onClose : undefined}
      />

      <div className="relative z-10 w-full max-w-md mx-4">
        {phase === 'countdown' ? (
          /* ── COUNTDOWN PHASE ── */
          <div className="flex flex-col items-center justify-center gap-4 py-16 select-none">
            <p className="text-slate-400 font-game text-sm uppercase tracking-widest animate-pulse">
              Drawing winner…
            </p>
            <div
              key={countdownNum}
              className="text-[9rem] font-black font-game text-white leading-none"
              style={{
                textShadow: '0 0 80px #a855f7, 0 0 20px #fff',
                animation: 'countPop 0.6s ease-out',
              }}
            >
              {countdownNum}
            </div>
          </div>
        ) : (
          /* ── REVEAL PHASE ── */
          <div
            className="bg-gradient-to-b from-[#0e0820] via-[#0a0d1a] to-[#0e1224] rounded-3xl border border-amber-500/60 shadow-[0_0_80px_rgba(251,191,36,0.25)] overflow-hidden"
            style={{ animation: 'fadeInScale 0.5s ease-out' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/80 via-amber-900/60 to-purple-900/80 px-6 pt-8 pb-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border border-amber-500/20 animate-ping absolute" />
                <div
                  className="w-64 h-64 rounded-full border border-purple-500/10 animate-ping absolute"
                  style={{ animationDelay: '0.3s' }}
                />
              </div>

              {/* Trophy icon */}
              <div className="relative z-10 w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.5)] animate-bounce">
                <span className="material-symbols-outlined text-4xl text-amber-900 font-bold">
                  emoji_events
                </span>
              </div>

              <div className="relative z-10 space-y-1">
                <p className="text-[11px] font-game font-bold uppercase tracking-[0.2em] text-amber-400">
                  {alreadyDrawn ? '🏆 Winner Already Drawn' : '🏆 Winner Selected!'}
                </p>
                <h2 className="text-2xl font-game font-black text-white">{displayName}</h2>
                <p className="text-sm font-mono text-slate-400">@{username}</p>
                <p className="text-[11px] font-sans text-slate-500 mt-1 truncate max-w-xs mx-auto">
                  won: {giveawayTitle}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-6 py-5 space-y-3">
              {isHost && (
                <>
                  {onContactWinner && (
                    <button
                      type="button"
                      onClick={() => { onContactWinner(); onClose(); }}
                      className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-game font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      Message Winner
                    </button>
                  )}
                  {onMarkPrizeClaimed && (
                    <button
                      type="button"
                      onClick={() => { onMarkPrizeClaimed(); onClose(); }}
                      className="w-full px-4 py-3 rounded-2xl bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-500/40 text-emerald-300 font-game font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      Mark Prize Claimed
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white font-game font-bold text-xs uppercase tracking-wider transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes countPop {
          from { opacity: 0; transform: scale(1.4); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
};
