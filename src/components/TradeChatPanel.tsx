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

  // ── Auto-scroll to bottom (only if near bottom) ───────────────────────────
  const msgListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = msgListRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
  const isClosed = ['CONFIRMED', 'COMPLETED', 'REJECTED', 'DECLINED', 'CLOSED', 'CANCELLED'].includes(session.status);
  const isActive = session.status === 'IN_PROGRESS';

  const myConfirmed = isCreator ? (session.creatorConfirmed ?? false) : (session.participantConfirmed ?? false);
  const otherConfirmed = isCreator ? (session.participantConfirmed ?? false) : (session.creatorConfirmed ?? false);

  const userVerdict = getTradeVerdictForUser(
    trade?.offeredFruits || [],
    trade?.requestedFruits || [],
    currentUser?.id,
    session.creatorId
  );

  // ── Render via portal directly into document.body ─────────────────────────
  // This breaks out of any ancestor stacking context that might clip fixed children.
  const panelContent = (
    <>
      {/* ── Mobile backdrop (behind panel, above everything else) ─────── */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm sm:hidden"
        style={{ zIndex: 999 }}
        onClick={handleClose}
      />

      {/* ── Floating compact panel ────────────────────────────────────── */}
      {/*
        Desktop: fixed bottom-right, max 400×540px
        Mobile:  fixed bottom, full-width with 10px margin
        z-index 1000: above navbar (z-50 = 50), modals are also z-50 so
        we use 1000 only for the chat. Modals that open on top of chat
        are fine — they are full-screen and cover everything.
      */}
      <div
        className="fixed flex flex-col bg-[#080d1c] animate-in slide-in-from-bottom-4 duration-300"
        style={{
          // Position: bottom-right on desktop, bottom-center on mobile
          bottom: '20px',
          right: '20px',
          // Compact size
          width: 'min(400px, calc(100vw - 20px))',
          maxHeight: 'min(540px, calc(100dvh - 32px))',
          // Visual layer
          zIndex: 1000,
          // Border & shadow — VALUE.NET visual language
          borderRadius: '20px',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          boxShadow:
            '0 0 0 1px rgba(168,85,247,0.1), 0 8px 40px rgba(0,0,0,0.7), 0 0 30px rgba(168,85,247,0.12)',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-3.5 pt-3 pb-2.5 bg-gradient-to-b from-[#0d1228] to-[#080d1c]"
          style={{
            borderBottom: '1px solid rgba(168,85,247,0.2)',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Left: counterpart + status */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(168,85,247,0.25)]">
                  <span className="material-symbols-outlined text-base">{counterpartAvatar}</span>
                </div>
                {isActive && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080d1c] animate-pulse" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-game font-black text-xs text-white truncate leading-tight">
                  @{counterpartName}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {isActive ? (
                    <span className="text-[9px] font-game font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Trade Active
                    </span>
                  ) : (
                    <span className="text-[9px] font-game font-bold text-slate-400 uppercase tracking-wide">
                      {session.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: session ID + minimize/close button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="px-1.5 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/30 text-[8px] font-mono font-bold text-purple-300 uppercase tracking-widest hidden sm:block">
                #{shortSessionId}
              </div>
              {handleClose && (
                <button
                  onClick={handleClose}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-game font-bold uppercase"
                  title={isActive ? 'Minimize Chat' : 'Close Chat'}
                  aria-label={isActive ? 'Minimize trade chat' : 'Close trade chat'}
                >
                  {isClosed ? (
                    <span className="flex items-center gap-0.5 text-slate-300 hover:text-white">
                      <span>CLOSE</span>
                      <span className="material-symbols-outlined text-sm">close</span>
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base">expand_more</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Status pill */}
          <div
            className={`flex items-center justify-between px-2.5 py-1 rounded-lg border text-[9px] font-game font-bold uppercase tracking-wider ${
              isClosed
                ? ['CONFIRMED', 'COMPLETED'].includes(session.status)
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                : 'bg-amber-950/50 border-amber-500/30 text-amber-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isClosed
                    ? ['CONFIRMED', 'COMPLETED'].includes(session.status)
                      ? 'bg-emerald-400'
                      : 'bg-rose-400'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              {session.status === 'IN_PROGRESS'
                ? myConfirmed
                  ? 'Waiting for counterpart...'
                  : otherConfirmed
                  ? 'Counterpart confirmed! Your turn.'
                  : 'Negotiation in Progress'
                : ['CONFIRMED', 'COMPLETED'].includes(session.status)
                ? 'Trade Confirmed ✓'
                : 'Trade Declined'}
            </span>
            <span className="text-[8px] font-mono opacity-50 hidden sm:inline">#{shortSessionId}</span>
          </div>
        </div>

        {/* ── Trade Summary Card ───────────────────────────────────────── */}
        {trade && (
          <div
            className="flex-shrink-0 px-3.5 py-2.5 bg-[#090e1f]/80"
            style={{ borderBottom: '1px solid rgba(168,85,247,0.12)' }}
          >
            <div className="text-[8px] font-game font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Trade Summary ({isCreator ? 'Owner' : 'Participant'} View)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* YOU GIVE */}
              <div className="p-2 rounded-xl bg-[#0e1530]/80 border border-purple-500/20">
                <div className="text-[8px] font-game font-bold text-purple-400 uppercase mb-1 flex justify-between">
                  <span>YOU GIVE</span>
                  <span className="text-purple-300 font-mono">${formatMoney(userVerdict.giveValue)}</span>
                </div>
                <div className="space-y-0.5">
                  {userVerdict.giverFruits.slice(0, 2).map((f, i) => (
                    <div key={`off-${i}-${f.id}`} className="flex items-center gap-1 text-[10px] text-slate-200 font-game font-semibold min-w-0">
                      <FruitImage fruit={f} size="xs" className="w-3.5 h-3.5 rounded flex-shrink-0" />
                      <span className="truncate min-w-0">{f.name}</span>
                    </div>
                  ))}
                  {userVerdict.giverFruits.length > 2 && (
                    <div className="text-[8px] text-slate-500 font-mono">+{userVerdict.giverFruits.length - 2} more</div>
                  )}
                  {userVerdict.giverFruits.length === 0 && (
                    <div className="text-[8px] text-slate-600 font-mono italic">No fruits</div>
                  )}
                </div>
              </div>

              {/* YOU RECEIVE */}
              <div className="p-2 rounded-xl bg-[#0e1530]/80 border border-amber-500/20">
                <div className="text-[8px] font-game font-bold text-amber-400 uppercase mb-1 flex justify-between">
                  <span>YOU GET</span>
                  <span className="text-emerald-400 font-mono">${formatMoney(userVerdict.receiveValue)}</span>
                </div>
                <div className="space-y-0.5">
                  {userVerdict.receiverFruits.slice(0, 2).map((f, i) => (
                    <div key={`req-${i}-${f.id}`} className="flex items-center gap-1 text-[10px] text-slate-200 font-game font-semibold min-w-0">
                      <FruitImage fruit={f} size="xs" className="w-3.5 h-3.5 rounded flex-shrink-0" />
                      <span className="truncate min-w-0">{f.name}</span>
                    </div>
                  ))}
                  {userVerdict.receiverFruits.length > 2 && (
                    <div className="text-[8px] text-slate-500 font-mono">+{userVerdict.receiverFruits.length - 2} more</div>
                  )}
                  {userVerdict.receiverFruits.length === 0 && (
                    <div className="text-[8px] text-slate-600 font-mono italic">No fruits</div>
                  )}
                </div>
              </div>
            </div>
            {onLoadTradeInCalc && (
              <div className="flex justify-end mt-1.5">
                <button
                  onClick={() => onLoadTradeInCalc(userVerdict.giverFruits, userVerdict.receiverFruits)}
                  className="text-[8px] font-game font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider transition-colors cursor-pointer"
                >
                  OPEN IN CALC →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Messages (only this section scrolls) ─────────────────────── */}
        <div
          ref={msgListRef}
          className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2 scroll-smooth"
          style={{
            minHeight: 0,
            // Compact custom scrollbar
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(168,85,247,0.3) transparent',
          }}
        >
          {/* Session started pill */}
          <div className="text-center">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-950/50 border border-purple-500/20 text-[8px] font-game font-bold text-purple-400 uppercase tracking-widest">
              Trade session started
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="py-6 text-center">
              <span className="material-symbols-outlined text-2xl text-slate-700 block mb-1">chat</span>
              <p className="text-[10px] text-slate-600 font-game font-semibold uppercase">No messages yet</p>
              <p className="text-[9px] text-slate-700 font-sans mt-0.5">Negotiate or share your join link</p>
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
                  <div className={`flex items-center gap-1 text-[8px] text-slate-500 font-mono ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="font-bold text-slate-400">{m.senderName}</span>
                    <span>·</span>
                    <span>{timeStr}</span>
                  </div>
                  <div
                    className={`px-3 py-2 rounded-2xl text-[11px] max-w-[82%] leading-relaxed font-sans overflow-wrap-anywhere ${
                      isMe
                        ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 font-semibold rounded-tr-sm shadow-[0_2px_8px_rgba(245,158,11,0.25)]'
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

        {/* ── Terminal State Card ─────────────────────────────────────── */}
        {isClosed && (
          <div
            className="flex-shrink-0 mx-3 my-2 p-3.5 rounded-2xl border text-center animate-in zoom-in-95"
            style={{
              background: 'linear-gradient(to bottom, #0e1633, #0d1527, #080d1c)',
              borderColor: 'rgba(168,85,247,0.3)',
            }}
          >
            {['CONFIRMED', 'COMPLETED'].includes(session.status) ? (
              <div>
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mx-auto mb-2 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                  <span className="material-symbols-outlined text-xl font-bold">verified</span>
                </div>
                <h4 className="font-game font-black text-xs text-emerald-300 uppercase tracking-wider mb-1">
                  TRADE COMPLETED
                </h4>
                <p className="text-[10px] text-slate-300 font-sans leading-relaxed mb-3">
                  Both traders confirmed the exchange.
                </p>
              </div>
            ) : (
              <div>
                <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 mx-auto mb-2 shadow-[0_0_12px_rgba(244,63,94,0.25)]">
                  <span className="material-symbols-outlined text-xl font-bold">cancel</span>
                </div>
                <h4 className="font-game font-black text-xs text-rose-300 uppercase tracking-wider mb-1">
                  TRADE DECLINED
                </h4>
                <p className="text-[10px] text-slate-300 font-sans leading-relaxed mb-3">
                  This session was declined by one of the traders.
                </p>
              </div>
            )}
            {handleClose && (
              <button
                onClick={handleClose}
                className="w-full py-2 rounded-xl bg-[#161d38] hover:bg-[#20294e] text-white font-game font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer border border-purple-500/30"
              >
                CLOSE
              </button>
            )}
          </div>
        )}

        {/* ── Action Bar (IN_PROGRESS only) ────────────────────────────── */}
        {isActive && (onConfirmTrade || onRejectTrade) && (
          <div
            className="flex-shrink-0 px-3 py-2.5 flex gap-2 bg-[#080d1c]"
            style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}
          >
            {onRejectTrade && (
              <button
                onClick={handleDecline}
                disabled={isDeclining || isConfirming}
                className="flex-1 py-2 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/40 text-rose-200 font-game font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_2px_8px_rgba(244,63,94,0.15)]"
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
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.35)] animate-pulse'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.25)]'
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

        {/* ── Composer (IN_PROGRESS only) ──────────────────────────────── */}
        {isActive && (
          <div
            className="flex-shrink-0 px-3 pb-3 pt-2 bg-[#080d1c]"
            style={{
              borderTop: '1px solid rgba(168,85,247,0.12)',
              borderRadius: '0 0 20px 20px',
            }}
          >
            {sendError && (
              <div className="mb-1.5 px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[9px] font-game font-semibold flex items-center justify-between">
                <span className="min-w-0 mr-1" style={{ overflowWrap: 'anywhere' }}>{sendError}</span>
                <button onClick={() => setSendError(null)} className="text-rose-400 hover:text-white flex-shrink-0">
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-end gap-1.5">
              <div className="flex-1 relative min-w-0">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder="Message... (Enter to send)"
                  rows={1}
                  disabled={isSending}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1530] border border-purple-500/25 hover:border-purple-500/40 focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20 text-[11px] text-white placeholder:text-slate-600 font-sans outline-none resize-none transition-all leading-relaxed disabled:opacity-50"
                  style={{ minHeight: '36px', maxHeight: '80px' }}
                />
                {inputText.length > 420 && (
                  <div className="absolute bottom-1.5 right-2 text-[8px] font-mono text-slate-500">
                    {inputText.length}/500
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(245,158,11,0.25)] flex items-center justify-center cursor-pointer"
                aria-label="Send message"
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
    </>
  );

  // Render into document.body via portal — bypasses all ancestor stacking contexts
  return createPortal(panelContent, document.body);
};
