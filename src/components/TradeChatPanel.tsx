import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TradeSession, TradeMessage, TraderProfile, AuthUser } from '../types';
import { formatMoney, getTradeVerdictForUser } from '../utils/calc';
import { FruitImage } from './FruitImage';
import { apiSendTradeMessage, apiGetTradeMessages } from '../utils/tradesApi';
import { supabase } from '../lib/supabaseClient';

export interface TradeChatPanelProps {
  session: TradeSession | null;
  currentUser: TraderProfile | AuthUser | null;
  messages?: TradeMessage[];
  onSessionUpdate?: (session: TradeSession) => void;
  onConfirmTrade?: (sessionId: string) => void;
  onRejectTrade?: (sessionId: string, reason?: string) => void;
  onClosePanel?: () => void;
  onLoadTradeInCalc?: (offered: any[], requested: any[]) => void;
  // Legacy fallback props
  onSendMessage?: (text: string) => void;
  onClose?: () => void;
}

export const TradeChatPanel: React.FC<TradeChatPanelProps> = ({
  session,
  currentUser,
  messages: initialMessages = [],
  onConfirmTrade,
  onRejectTrade,
  onClosePanel,
  onLoadTradeInCalc,
  onClose,
}) => {
  const [messages, setMessages] = useState<TradeMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handleClose = onClosePanel || onClose;

  // ── Load initial messages and subscribe to realtime ──────────────────────
  useEffect(() => {
    if (!session?.id) return;

    // Load existing messages
    apiGetTradeMessages(session.id).then((res) => {
      if (res.success) setMessages(res.messages);
    });

    // Subscribe to new messages for this session via Supabase Realtime
    const channel = supabase
      .channel(`trade_messages:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trade_messages',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          const newMsg: TradeMessage = {
            id: row.id,
            sessionId: row.session_id,
            senderId: row.sender_id,
            senderName: row.sender_name,
            message: row.message,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            type: 'chat',
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // ── Sync incoming messages prop ───────────────────────────────────────────
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newOnes = initialMessages.filter((m) => !existingIds.has(m.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    }
  }, [initialMessages]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Keyboard focus on open ────────────────────────────────────────────────
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [session?.id]);

  const handleSend = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputText.trim() || isSending || !session || !currentUser) return;
      if (session.status !== 'IN_PROGRESS') return;

      const text = inputText.trim();
      setInputText('');
      setIsSending(true);
      setSendError(null);

      const res = await apiSendTradeMessage(session.id, {
        id: currentUser.id,
        username: currentUser.username,
      }, text);

      setIsSending(false);

      if (!res.success) {
        setSendError(res.error || 'Failed to send message. Try again.');
        setInputText(text); // restore text on failure
      }
    },
    [inputText, isSending, session, currentUser]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirm = async () => {
    if (!session || !onConfirmTrade || isConfirming) return;
    setIsConfirming(true);
    onConfirmTrade(session.id);
    setIsConfirming(false);
  };

  const handleDecline = async () => {
    if (!session || !onRejectTrade || isDeclining) return;
    setIsDeclining(true);
    onRejectTrade(session.id, 'Declined by trader');
    setIsDeclining(false);
  };

  if (!session) return null;

  const isCreator = currentUser && session.creatorId === currentUser.id;
  const counterpartName = isCreator ? session.participantName : session.creatorName;
  const counterpartAvatar = isCreator ? session.participantAvatar : session.creatorAvatar;
  const shortSessionId = session.id.slice(-6).toUpperCase();

  const trade = session.tradeAd;
  const isClosed = session.status === 'CONFIRMED' || session.status === 'REJECTED' || session.status === 'CLOSED';
  const isActive = session.status === 'IN_PROGRESS';

  const userVerdict = getTradeVerdictForUser(
    trade?.offeredFruits || [],
    trade?.requestedFruits || [],
    currentUser?.id,
    session.creatorId
  );

  const verdictColors: Record<string, string> = {
    WIN: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/60',
    FAIR: 'text-amber-300 border-amber-500/40 bg-amber-950/60',
    LOSS: 'text-rose-400 border-rose-500/40 bg-rose-950/60',
  };
  const verdictColor = verdictColors[userVerdict.verdict || 'FAIR'] || verdictColors['FAIR'];

  return (
    <>
      {/* ── Backdrop (mobile only) ─────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
        onClick={handleClose}
      />

      {/* ── Panel ─────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 z-50 w-full sm:w-[420px] flex flex-col bg-[#080d1c] border-l border-purple-500/20 shadow-[0_0_60px_rgba(168,85,247,0.15)] animate-in slide-in-from-right duration-300">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 bg-gradient-to-b from-[#0d1228] to-[#080d1c] border-b border-purple-500/20">
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Counterpart info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                  <span className="material-symbols-outlined text-lg">{counterpartAvatar}</span>
                </div>
                {isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080d1c] animate-pulse" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-game font-black text-sm text-white truncate">
                  @{counterpartName}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isActive ? (
                    <span className="text-[10px] font-game font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Trade Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-game font-bold text-slate-400 uppercase tracking-wide">
                      {session.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: session ID + close */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {handleClose && (
                <button
                  onClick={handleClose}
                  className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
                  aria-label="Close trade chat"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
              <div className="px-2 py-0.5 rounded-lg bg-purple-950/60 border border-purple-500/30 text-[9px] font-mono font-bold text-purple-300 uppercase tracking-widest">
                #{shortSessionId}
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div
            className={`flex items-center justify-between px-3 py-1.5 rounded-xl border text-[10px] font-game font-bold uppercase tracking-wider ${
              isClosed
                ? session.status === 'CONFIRMED'
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900/60 border-slate-700/40 text-slate-400'
                : 'bg-amber-950/50 border-amber-500/30 text-amber-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isClosed
                    ? session.status === 'CONFIRMED'
                      ? 'bg-emerald-400'
                      : 'bg-slate-500'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              {session.status === 'IN_PROGRESS'
                ? 'Negotiation in Progress'
                : session.status === 'CONFIRMED'
                ? 'Trade Confirmed ✓'
                : session.status === 'REJECTED'
                ? 'Trade Declined'
                : 'Session Closed'}
            </span>
            <span className="text-[9px] font-mono opacity-60">SESSION #{shortSessionId}</span>
          </div>
        </div>

        {/* ── Trade Summary Card ───────────────────────────────────────── */}
        {trade && (
          <div className="flex-shrink-0 px-4 py-3 bg-[#090e1f]/80 border-b border-purple-500/15">
            <div className="text-[9px] font-game font-bold text-slate-500 uppercase tracking-widest mb-2">
              Trade Summary ({isCreator ? 'Owner' : 'Participant'} Perspective)
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Offered / Given by Current User */}
              <div className="p-2.5 rounded-xl bg-[#0e1530]/80 border border-purple-500/20">
                <div className="text-[9px] font-game font-bold text-purple-400 uppercase mb-1.5 flex justify-between">
                  <span>YOU GIVE</span>
                  <span className="text-purple-300 font-mono">${formatMoney(userVerdict.giveValue)}</span>
                </div>
                <div className="space-y-1">
                  {userVerdict.giverFruits.slice(0, 3).map((f, i) => (
                    <div key={`off-${i}-${f.id}`} className="flex items-center gap-1.5 text-[11px] text-slate-200 font-game font-semibold">
                      <FruitImage fruit={f} size="xs" className="w-4 h-4 rounded-md flex-shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                  {userVerdict.giverFruits.length > 3 && (
                    <div className="text-[9px] text-slate-500 font-mono">+{userVerdict.giverFruits.length - 3} more</div>
                  )}
                  {userVerdict.giverFruits.length === 0 && (
                    <div className="text-[9px] text-slate-600 font-mono italic">No fruits</div>
                  )}
                </div>
              </div>

              {/* Received by Current User */}
              <div className="p-2.5 rounded-xl bg-[#0e1530]/80 border border-amber-500/20">
                <div className="text-[9px] font-game font-bold text-amber-400 uppercase mb-1.5 flex justify-between">
                  <span>YOU RECEIVE</span>
                  <span className="text-emerald-400 font-mono">${formatMoney(userVerdict.receiveValue)}</span>
                </div>
                <div className="space-y-1">
                  {userVerdict.receiverFruits.slice(0, 3).map((f, i) => (
                    <div key={`req-${i}-${f.id}`} className="flex items-center gap-1.5 text-[11px] text-slate-200 font-game font-semibold">
                      <FruitImage fruit={f} size="xs" className="w-4 h-4 rounded-md flex-shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                  {userVerdict.receiverFruits.length > 3 && (
                    <div className="text-[9px] text-slate-500 font-mono">+{userVerdict.receiverFruits.length - 3} more</div>
                  )}
                  {userVerdict.receiverFruits.length === 0 && (
                    <div className="text-[9px] text-slate-600 font-mono italic">No fruits</div>
                  )}
                </div>
              </div>
            </div>

            {/* Calculator link */}
            {onLoadTradeInCalc && (
              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={() => onLoadTradeInCalc(userVerdict.giverFruits, userVerdict.receiverFruits)}
                  className="text-[9px] font-game font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider transition-colors"
                >
                  OPEN IN CALC →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Messages ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
          {/* System entry message */}
          <div className="text-center">
            <span className="px-3 py-1 rounded-full bg-purple-950/50 border border-purple-500/20 text-[9px] font-game font-bold text-purple-400 uppercase tracking-widest">
              Trade session started
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-slate-700 block mb-2">chat</span>
              <p className="text-[11px] text-slate-600 font-game font-semibold uppercase">
                No messages yet
              </p>
              <p className="text-[10px] text-slate-700 font-sans mt-1">
                Start negotiating or share your Roblox join link
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = currentUser && (m.senderId === currentUser.id || m.senderName === currentUser.username);
              const timeStr = new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div key={m.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 text-[9px] text-slate-500 font-mono ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="font-bold text-slate-400">{m.senderName}</span>
                    <span>·</span>
                    <span>{timeStr}</span>
                  </div>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-[85%] leading-relaxed font-sans break-words ${
                      isMe
                        ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 font-semibold rounded-tr-sm shadow-[0_2px_8px_rgba(245,158,11,0.3)]'
                        : 'bg-[#131a35] border border-purple-500/20 text-slate-200 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {m.message || m.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Closed State Banner ──────────────────────────────────────── */}
        {isClosed && (
          <div
            className={`flex-shrink-0 mx-4 mb-3 p-3 rounded-xl border text-center text-[11px] font-game font-bold uppercase tracking-wider ${
              session.status === 'CONFIRMED'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900/60 border-slate-700/40 text-slate-400'
            }`}
          >
            {session.status === 'CONFIRMED' ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-sm">verified</span>
                Trade Confirmed — Session Closed
              </span>
            ) : (
              <span>Session ended — Trade {session.status.toLowerCase()}</span>
            )}
          </div>
        )}

        {/* ── Action Bar (IN_PROGRESS only) ────────────────────────────── */}
        {isActive && (onConfirmTrade || onRejectTrade) && (
          <div className="flex-shrink-0 px-4 py-2.5 border-t border-purple-500/15 flex gap-2 bg-[#080d1c]">
            {onRejectTrade && (
              <button
                onClick={handleDecline}
                disabled={isDeclining}
                className="flex-1 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-game font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeclining ? '...' : 'Decline'}
              </button>
            )}
            {onConfirmTrade && (
              <button
                onClick={handleConfirm}
                disabled={isConfirming}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-game font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_2px_12px_rgba(16,185,129,0.3)]"
              >
                {isConfirming ? '...' : 'Confirm Trade'}
              </button>
            )}
          </div>
        )}

        {/* ── Composer ────────────────────────────────────────────────── */}
        {isActive && (
          <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-[#080d1c] border-t border-purple-500/15">
            {sendError && (
              <div className="mb-2 px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] font-game font-semibold flex items-center justify-between">
                <span>{sendError}</span>
                <button onClick={() => setSendError(null)} className="text-rose-400 hover:text-white ml-2">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder="Message... (Enter to send, Shift+Enter for newline)"
                  rows={1}
                  disabled={isSending}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e1530] border border-purple-500/25 hover:border-purple-500/40 focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 text-xs text-white placeholder:text-slate-600 font-sans outline-none resize-none transition-all leading-relaxed disabled:opacity-50"
                  style={{ minHeight: '40px', maxHeight: '96px' }}
                />
                {inputText.length > 400 && (
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500">
                    {inputText.length}/500
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(245,158,11,0.3)] flex items-center justify-center cursor-pointer"
                aria-label="Send message"
              >
                {isSending ? (
                  <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-base">send</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};
