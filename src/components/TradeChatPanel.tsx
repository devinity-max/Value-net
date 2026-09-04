import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const msgListRef = useRef<HTMLDivElement>(null);
  const handleClose = onClosePanel || onClose;

  // SSR / Hydration protection
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // ── Auto-scroll to bottom (smart scroll: only if user is near bottom) ────
  useEffect(() => {
    if (isMinimized) return;
    const list = msgListRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100;
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // ── Keyboard focus on open ────────────────────────────────────────────────
  useEffect(() => {
    if (!isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [session?.id, isMinimized]);

  const handleSend = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!inputText.trim() || isSending || !session || !currentUser) return;
      if (session.status !== 'IN_PROGRESS') return;

      const text = inputText.trim();
      setInputText('');
      setIsSending(true);
      setSendError(null);

      const res = await apiSendTradeMessage(
        session.id,
        {
          id: currentUser.id,
          username: currentUser.username,
        },
        text
      );

      setIsSending(false);

      if (!res.success) {
        setSendError(res.error || 'Failed to send message.');
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

  if (!session || !mounted) return null;

  const isCreator = currentUser && session.creatorId === currentUser.id;
  const counterpartName = isCreator ? session.participantName : session.creatorName;
  const counterpartAvatar = isCreator ? session.participantAvatar : session.creatorAvatar;
  const shortSessionId = session.id.slice(-6).toUpperCase();

  const trade = session.tradeAd;
  const isClosed = ['CONFIRMED', 'COMPLETED', 'REJECTED', 'DECLINED', 'CLOSED', 'CANCELLED'].includes(
    session.status
  );
  const isActive = session.status === 'IN_PROGRESS';

  const myConfirmed = isCreator
    ? (session.creatorConfirmed ?? false)
    : (session.participantConfirmed ?? false);
  const otherConfirmed = isCreator
    ? (session.participantConfirmed ?? false)
    : (session.creatorConfirmed ?? false);

  const userVerdict = getTradeVerdictForUser(
    trade?.offeredFruits || [],
    trade?.requestedFruits || [],
    currentUser?.id,
    session.creatorId
  );

  // ── Render via React Portal to document.body ─────────────────────────────
  const panelContent = (
    <div
      id="valuenet-trade-chat-portal"
      className="fixed pointer-events-none"
      style={{
        zIndex: 1000,
        // Responsive viewport placement (mobile: bottom: 10px, left: 10px, right: 10px | desktop: bottom: 20px, right: 20px)
        inset: 'auto 10px 10px 10px',
      }}
    >
      <style>{`
        @media (min-width: 640px) {
          #valuenet-trade-chat-portal {
            left: auto !important;
            right: 20px !important;
            bottom: 20px !important;
          }
        }
      `}</style>

      {/* ── MINIMIZED PILL STATE ────────────────────────────────────── */}
      {isMinimized ? (
        <div
          onClick={() => setIsMinimized(false)}
          className="pointer-events-auto ml-auto cursor-pointer flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#080d1c] border border-purple-500/40 text-white shadow-[0_4px_25px_rgba(0,0,0,0.6)] hover:border-amber-400/60 transition-all group animate-in fade-in"
          style={{ width: 'min(380px, 100%)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-500/50 flex items-center justify-center text-amber-400 text-xs font-bold">
                <span className="material-symbols-outlined text-sm">{counterpartAvatar}</span>
              </div>
              {isActive && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#080d1c] animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-game font-bold text-white truncate">
                TRADE CHAT: @{counterpartName}
              </div>
              <div className="text-[9px] font-game text-amber-400 uppercase tracking-wider">
                {isActive ? (myConfirmed ? 'Waiting for trader...' : 'Negotiating') : session.status}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-game font-bold text-purple-300 group-hover:text-amber-300">
            <span>OPEN</span>
            <span className="material-symbols-outlined text-sm">unfold_more</span>
          </div>
        </div>
      ) : (
        /* ── EXPANDED COMPACT CHAT TERMINAL ───────────────────────── */
        <div
          className="pointer-events-auto ml-auto flex flex-col bg-[#080d1c] border border-purple-500/35 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.15)] overflow-hidden animate-in slide-in-from-bottom-3 duration-200"
          style={{
            // Size: Mobile (full width - 20px, max 400px, height 480px) | Desktop (380px wide, 500px height)
            width: 'min(380px, calc(100vw - 20px))',
            height: 'min(500px, calc(100dvh - 24px))',
          }}
        >
          {/* ── HEADER (Fixed Top) ─────────────────────────────────── */}
          <div className="flex-shrink-0 px-3.5 pt-3 pb-2 bg-gradient-to-b from-[#0e142c] to-[#080d1c] border-b border-purple-500/20">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              {/* Counterpart info */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-950/90 border border-purple-500/40 flex items-center justify-center text-amber-400">
                    <span className="material-symbols-outlined text-sm">{counterpartAvatar}</span>
                  </div>
                  {isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#080d1c] animate-pulse" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-game font-black text-xs text-white truncate leading-tight">
                    @{counterpartName}
                  </div>
                  <div className="text-[9px] font-game text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    {isActive ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        Active Deal
                      </span>
                    ) : (
                      <span>{session.status}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons (Minimize or Close) */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-[8px] font-mono font-bold text-purple-300 uppercase">
                  #{shortSessionId}
                </div>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800/60 transition-colors cursor-pointer"
                  title="Minimize"
                  aria-label="Minimize"
                >
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </button>
                {isClosed && handleClose && (
                  <button
                    onClick={handleClose}
                    className="px-1.5 py-0.5 text-slate-300 hover:text-white rounded bg-slate-800/80 hover:bg-slate-700 transition-colors text-[9px] font-game font-bold uppercase flex items-center gap-0.5"
                    title="Close"
                  >
                    <span>CLOSE</span>
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status bar */}
            <div
              className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-[9px] font-game font-bold uppercase tracking-wider ${
                isClosed
                  ? ['CONFIRMED', 'COMPLETED'].includes(session.status)
                    ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                  : 'bg-amber-950/50 border-amber-500/30 text-amber-300'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isClosed
                      ? ['CONFIRMED', 'COMPLETED'].includes(session.status)
                        ? 'bg-emerald-400'
                        : 'bg-rose-400'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span className="truncate">
                  {session.status === 'IN_PROGRESS'
                    ? myConfirmed
                      ? 'Waiting for trader...'
                      : otherConfirmed
                      ? 'Counterpart confirmed!'
                      : 'Negotiation Active'
                    : ['CONFIRMED', 'COMPLETED'].includes(session.status)
                    ? 'Trade Confirmed ✓'
                    : 'Trade Declined'}
                </span>
              </span>
              <span className="text-[8px] font-mono opacity-50 flex-shrink-0">
                {shortSessionId}
              </span>
            </div>
          </div>

          {/* ── TRADE SUMMARY CARD (Compact) ───────────────────────── */}
          {trade && (
            <div className="flex-shrink-0 px-3 py-2 bg-[#0a0f24] border-b border-purple-500/15">
              <div className="grid grid-cols-2 gap-1.5">
                {/* YOU GIVE */}
                <div className="p-1.5 rounded-lg bg-[#0e1530] border border-purple-500/20">
                  <div className="text-[8px] font-game font-bold text-purple-400 uppercase flex justify-between">
                    <span>YOU GIVE</span>
                    <span className="text-purple-300 font-mono">
                      ${formatMoney(userVerdict.giveValue)}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {userVerdict.giverFruits.slice(0, 2).map((f, i) => (
                      <div
                        key={`giver-${i}-${f.id}`}
                        className="flex items-center gap-1 text-[10px] text-slate-200 font-game font-semibold truncate"
                      >
                        <FruitImage
                          fruit={f}
                          size="xs"
                          className="w-3.5 h-3.5 rounded flex-shrink-0"
                        />
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                    {userVerdict.giverFruits.length > 2 && (
                      <span className="text-[8px] text-slate-500 font-mono block">
                        +{userVerdict.giverFruits.length - 2} more
                      </span>
                    )}
                    {userVerdict.giverFruits.length === 0 && (
                      <span className="text-[8px] text-slate-600 italic block">No fruits</span>
                    )}
                  </div>
                </div>

                {/* YOU GET */}
                <div className="p-1.5 rounded-lg bg-[#0e1530] border border-amber-500/20">
                  <div className="text-[8px] font-game font-bold text-amber-400 uppercase flex justify-between">
                    <span>YOU GET</span>
                    <span className="text-emerald-400 font-mono">
                      ${formatMoney(userVerdict.receiveValue)}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {userVerdict.receiverFruits.slice(0, 2).map((f, i) => (
                      <div
                        key={`receiver-${i}-${f.id}`}
                        className="flex items-center gap-1 text-[10px] text-slate-200 font-game font-semibold truncate"
                      >
                        <FruitImage
                          fruit={f}
                          size="xs"
                          className="w-3.5 h-3.5 rounded flex-shrink-0"
                        />
                        <span className="truncate">{f.name}</span>
                      </div>
                    ))}
                    {userVerdict.receiverFruits.length > 2 && (
                      <span className="text-[8px] text-slate-500 font-mono block">
                        +{userVerdict.receiverFruits.length - 2} more
                      </span>
                    )}
                    {userVerdict.receiverFruits.length === 0 && (
                      <span className="text-[8px] text-slate-600 italic block">No fruits</span>
                    )}
                  </div>
                </div>
              </div>
              {onLoadTradeInCalc && (
                <div className="flex justify-end mt-1">
                  <button
                    onClick={() =>
                      onLoadTradeInCalc(userVerdict.giverFruits, userVerdict.receiverFruits)
                    }
                    className="text-[8px] font-game font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    CALCULATOR →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── MESSAGES CONTAINER (ONLY THIS SCROLLS) ──────────────── */}
          <div
            ref={msgListRef}
            className="flex-1 min-h-0 overflow-y-auto px-3 py-2.5 space-y-2 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(168,85,247,0.3) transparent',
            }}
          >
            <div className="text-center">
              <span className="px-2 py-0.5 rounded-full bg-purple-950/50 border border-purple-500/20 text-[8px] font-game font-bold text-purple-400 uppercase tracking-widest">
                Trade session started
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="py-5 text-center">
                <span className="material-symbols-outlined text-xl text-slate-700 block mb-1">
                  chat
                </span>
                <p className="text-[10px] text-slate-600 font-game font-semibold uppercase">
                  No messages yet
                </p>
                <p className="text-[8px] text-slate-700 font-sans mt-0.5">
                  Send a message or share join link
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe =
                  currentUser &&
                  (m.senderId === currentUser.id || m.senderName === currentUser.username);
                const timeStr = new Date(m.createdAt || Date.now()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`flex items-center gap-1 text-[8px] text-slate-500 font-mono ${
                        isMe ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span className="font-bold text-slate-400">{m.senderName}</span>
                      <span>·</span>
                      <span>{timeStr}</span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl text-[11px] max-w-[85%] leading-relaxed font-sans ${
                        isMe
                          ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 font-semibold rounded-tr-sm shadow-sm'
                          : 'bg-[#131a35] border border-purple-500/20 text-slate-200 rounded-tl-sm shadow-sm'
                      }`}
                      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                    >
                      {m.message || (m as any).text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── TERMINAL STATE CARD (COMPLETED or DECLINED) ─────────── */}
          {isClosed && (
            <div className="flex-shrink-0 mx-2.5 my-2 p-3 rounded-xl border border-purple-500/30 bg-gradient-to-b from-[#0e1633] to-[#080d1c] text-center shadow-lg animate-in zoom-in-95">
              {['CONFIRMED', 'COMPLETED'].includes(session.status) ? (
                <div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mx-auto mb-1.5">
                    <span className="material-symbols-outlined text-lg font-bold">verified</span>
                  </div>
                  <h4 className="font-game font-black text-xs text-emerald-300 uppercase tracking-wider mb-0.5">
                    TRADE COMPLETED
                  </h4>
                  <p className="text-[10px] text-slate-300 font-sans leading-tight mb-2.5">
                    Both traders confirmed the exchange.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 mx-auto mb-1.5">
                    <span className="material-symbols-outlined text-lg font-bold">cancel</span>
                  </div>
                  <h4 className="font-game font-black text-xs text-rose-300 uppercase tracking-wider mb-0.5">
                    TRADE DECLINED
                  </h4>
                  <p className="text-[10px] text-slate-300 font-sans leading-tight mb-2.5">
                    This trade session was declined.
                  </p>
                </div>
              )}
              {handleClose && (
                <button
                  onClick={handleClose}
                  className="w-full py-1.5 rounded-lg bg-[#161d38] hover:bg-[#20294e] text-white font-game font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer border border-purple-500/30"
                >
                  CLOSE
                </button>
              )}
            </div>
          )}

          {/* ── ACTION BAR (IN_PROGRESS Only) ───────────────────────── */}
          {isActive && (onConfirmTrade || onRejectTrade) && (
            <div className="flex-shrink-0 px-3 py-2 bg-[#080d1c] border-t border-purple-500/15 flex gap-2">
              {onRejectTrade && (
                <button
                  onClick={handleDecline}
                  disabled={isDeclining || isConfirming}
                  className="flex-1 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-game font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isDeclining ? 'DECLINING...' : 'DECLINE'}
                </button>
              )}
              {onConfirmTrade && (
                <button
                  onClick={handleConfirm}
                  disabled={isConfirming || isDeclining || myConfirmed}
                  className={`flex-1 py-2 rounded-xl font-game font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${
                    myConfirmed
                      ? 'bg-purple-950/80 border border-purple-500/40 text-purple-300'
                      : otherConfirmed
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md animate-pulse'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  }`}
                >
                  {isConfirming
                    ? 'CONFIRMING...'
                    : myConfirmed
                    ? '✓ WAITING...'
                    : otherConfirmed
                    ? 'CONFIRM (1/2)'
                    : 'CONFIRM TRADE'}
                </button>
              )}
            </div>
          )}

          {/* ── MESSAGE COMPOSER (IN_PROGRESS Only) ─────────────────── */}
          {isActive && (
            <div className="flex-shrink-0 px-3 pb-2.5 pt-1.5 bg-[#080d1c] border-t border-purple-500/15">
              {sendError && (
                <div className="mb-1 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-rose-300 text-[9px] font-game flex items-center justify-between">
                  <span className="truncate mr-1">{sendError}</span>
                  <button onClick={() => setSendError(null)} className="text-rose-400">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex items-center gap-1.5">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder="Message... (Enter to send)"
                  rows={1}
                  disabled={isSending}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#0e1530] border border-purple-500/25 hover:border-purple-500/40 focus:border-amber-400/60 text-xs text-white placeholder:text-slate-600 font-sans outline-none resize-none transition-all disabled:opacity-50"
                  style={{ minHeight: '34px', maxHeight: '72px' }}
                />
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer shadow-sm"
                  aria-label="Send"
                >
                  {isSending ? (
                    <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-sm">send</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(panelContent, document.body);
};
