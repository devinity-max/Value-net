import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Fruit, TradeAd, TradeSession, TradeMessage, TradeNotification, TraderProfile } from '../types';
import { formatMoney } from '../utils/calc';
import { playClickSound, playSelectSound } from '../utils/audio';
import { getStoredTraderProfile, saveTraderProfile } from '../utils/traderProfile';
import { CreateTradeModal } from './CreateTradeModal';
import { TradeChatPanel } from './TradeChatPanel';
import { TraderProfileModal } from './TraderProfileModal';
import { NotificationToast } from './NotificationToast';
import { safeFetchJson } from '../utils/apiHelper';
import { TrustBadge } from './TrustBadge';
import { AdSlot } from './ads/AdSlot';
import { FruitImage } from './FruitImage';

interface LiveTradesViewProps {
  onLoadTrade: (yourFruits: Fruit[], theirFruits: Fruit[]) => void;
  onViewTraderProfile?: (username: string) => void;
}

export const LiveTradesView: React.FC<LiveTradesViewProps> = ({ onLoadTrade, onViewTraderProfile }) => {
  const [currentUser, setCurrentUser] = useState<TraderProfile>(getStoredTraderProfile);
  const [trades, setTrades] = useState<TradeAd[]>([]);
  const [filter, setFilter] = useState<'ACTIVE' | 'ALL' | 'MY' | 'WIN' | 'FAIR' | 'LOSS'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Panels
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<TradeSession | null>(null);
  const [sessionMessages, setSessionMessages] = useState<TradeMessage[]>([]);
  const [toastNotification, setToastNotification] = useState<TradeNotification | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  // Format relative time helper
  const getRelativeTime = (timestamp: number) => {
    const elapsed = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (elapsed < 15) return 'Just now';
    if (elapsed < 60) return `${elapsed}s ago`;
    const mins = Math.floor(elapsed / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  // 1. Initial REST Fetch
  const fetchTrades = async () => {
    try {
      const res = await safeFetchJson<{ success: boolean; trades: TradeAd[] }>(
        `/api/trades?userId=${encodeURIComponent(currentUser.id)}`
      );
      if (res.success && res.data && Array.isArray(res.data.trades)) {
        const uniqueMap = new Map<string, TradeAd>();
        res.data.trades.forEach((t: TradeAd) => {
          if (t && t.id) uniqueMap.set(t.id, t);
        });
        setTrades(Array.from(uniqueMap.values()));
      }
    } catch (err) {
      console.error('Failed to fetch trades', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch User Active Sessions
  const checkActiveSessions = async () => {
    try {
      const res = await safeFetchJson<{ success: boolean; sessions: TradeSession[] }>(
        `/api/users/${encodeURIComponent(currentUser.id)}/active-sessions`
      );
      if (res.success && res.data && res.data.sessions && res.data.sessions.length > 0) {
        // Load latest session
        const currentActive = res.data.sessions[0];
        setActiveSession(currentActive);
        loadSessionMessages(currentActive.id);
      }
    } catch (e) {
      console.error('Failed to check active sessions', e);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const res = await safeFetchJson<{ success: boolean; session: TradeSession; messages: TradeMessage[] }>(
        `/api/sessions/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(currentUser.id)}`
      );
      if (res.success && res.data) {
        setActiveSession(res.data.session);
        setSessionMessages(res.data.messages || []);
      }
    } catch (e) {
      console.error('Failed to load session messages', e);
    }
  };

  // 3. Realtime WebSocket Connection
  useEffect(() => {
    fetchTrades();
    checkActiveSessions();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let reconnectTimer: NodeJS.Timeout;

    const connectWs = () => {
      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
          // Authenticate with trader identity
          socket.send(
            JSON.stringify({
              type: 'AUTH',
              payload: {
                userId: currentUser.id,
                username: currentUser.username,
              },
            })
          );
        };

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const { type, payload } = parsed;

            if (type === 'INIT_STATE') {
              if (payload.trades && Array.isArray(payload.trades)) {
                const uniqueMap = new Map<string, TradeAd>();
                payload.trades.forEach((t: TradeAd) => {
                  if (t && t.id) uniqueMap.set(t.id, t);
                });
                setTrades(Array.from(uniqueMap.values()));
              }
            } else if (type === 'TRADE_CREATED') {
              if (payload && payload.id) {
                setTrades((prev) => {
                  if (prev.some((t) => t.id === payload.id)) {
                    return prev.map((t) => (t.id === payload.id ? payload : t));
                  }
                  return [payload, ...prev];
                });
              }
            } else if (type === 'TRADE_UPDATED') {
              if (payload && payload.id) {
                setTrades((prev) =>
                  prev.map((t) => (t.id === payload.id ? { ...t, ...payload } : t))
                );
              }
              // If active session belongs to this trade, update session.tradeAd
              setActiveSession((prev) => {
                if (prev && prev.tradeId === payload.id) {
                  return { ...prev, tradeAd: payload };
                }
                return prev;
              });
            } else if (type === 'TRADE_CANCELLED') {
              setTrades((prev) => prev.filter((t) => t.id !== payload.tradeId));
            } else if (type === 'SESSION_STARTED') {
              const { session, messages } = payload;
              setActiveSession(session);
              setSessionMessages(messages || []);
              playSelectSound();
            } else if (type === 'SESSION_UPDATED') {
              const { session, newMsg } = payload;
              setActiveSession(session);
              if (newMsg) {
                setSessionMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
              }
              playSelectSound();
            } else if (type === 'NEW_MESSAGE') {
              setSessionMessages((prev) => {
                if (prev.some((m) => m.id === payload.id)) return prev;
                return [...prev, payload];
              });
              playClickSound();
            } else if (type === 'NEW_NOTIFICATION') {
              setToastNotification(payload);
              playSelectSound();
            }
          } catch (err) {
            console.error('Error parsing WS message', err);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWs, 3000);
        };

        socket.onerror = () => {
          setWsConnected(false);
          socket.close();
        };
      } catch (e) {
        console.error('WebSocket connection error', e);
        reconnectTimer = setTimeout(connectWs, 3000);
      }
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [currentUser.id, currentUser.username]);

  // 4. Accept Trade Handler (Atomic claim)
  const handleAcceptTrade = async (trade: TradeAd) => {
    setActionError(null);
    playClickSound();

    if (trade.creatorId === currentUser.id) {
      setActionError('You cannot accept your own trade advertisement.');
      return;
    }

    try {
      const res = await fetch(`/api/trades/${trade.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentUser.id,
          participantName: currentUser.username,
          participantAvatar: currentUser.avatarIcon,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim trade.');
      }

      playSelectSound();
      setActiveSession(data.session);
      setSessionMessages(data.messages || []);
    } catch (err: any) {
      setActionError(err.message || 'Trade is no longer available or was accepted by another user.');
    }
  };

  // 5. Cancel Trade Handler (Creator only)
  const handleCancelTrade = async (tradeId: string) => {
    playClickSound();
    try {
      const res = await fetch(`/api/trades/${tradeId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      }
    } catch (err) {
      console.error('Failed to cancel trade', err);
    }
  };

  // 6. Send Chat Message Handler
  const handleSendMessage = async (text: string) => {
    if (!activeSession) return;
    try {
      await fetch(`/api/sessions/${activeSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.username,
          message: text,
        }),
      });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // 7. Confirm Trade Handler (Two-party confirm)
  const handleConfirmTrade = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.username,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.session);
      }
    } catch (err) {
      console.error('Failed to confirm trade', err);
    }
  };

  // 8. Reject Trade Handler
  const handleRejectTrade = async (reason?: string) => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.username,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveSession(data.session);
      }
    } catch (err) {
      console.error('Failed to reject trade', err);
    }
  };

  // Filter and Search list (with Set-based ID deduplication)
  const filteredTrades = useMemo(() => {
    const seenIds = new Set<string>();
    return trades.filter((trade) => {
      if (!trade || !trade.id) return false;
      if (seenIds.has(trade.id)) return false;
      seenIds.add(trade.id);

      if (filter === 'ACTIVE') {
        if (trade.status !== 'ACTIVE' && trade.status !== 'IN_PROGRESS') return false;
      } else if (filter === 'MY') {
        if (trade.creatorId !== currentUser.id && trade.acceptedBy !== currentUser.id) return false;
      } else if (filter === 'WIN' || filter === 'FAIR' || filter === 'LOSS') {
        if (trade.verdict !== filter || trade.status === 'CANCELLED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = trade.creatorName?.toLowerCase().includes(q);
        const matchOffered = trade.offeredFruits?.some((f) => f.name.toLowerCase().includes(q));
        const matchReq = trade.requestedFruits?.some((f) => f.name.toLowerCase().includes(q));
        return matchUser || matchOffered || matchReq;
      }

      return true;
    });
  }, [trades, filter, currentUser.id, searchQuery]);

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 pt-28 sm:pt-32 pb-20 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onDismiss={() => setToastNotification(null)}
          onOpenSession={(sessId) => {
            loadSessionMessages(sessId);
          }}
        />
      )}

      {/* Action Error Alert */}
      {actionError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/60 text-rose-300 font-game text-xs flex justify-between items-center animate-in slide-in-from-top-2 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-rose-400">error</span>
            <span className="font-semibold">{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-white hover:text-rose-300 uppercase text-[10px] font-bold px-2 py-1 rounded-lg bg-rose-900/50"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161b36] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] mb-4">
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px] font-game font-bold uppercase tracking-wider text-purple-200">
            {wsConnected ? 'REAL-TIME P2P TRADE MARKETPLACE' : 'CONNECTING TO NETWORK...'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black font-game tracking-tight text-white mb-3">
          LIVE TRADES & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">NEGOTIATIONS</span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed mb-6">
          Post trade advertisements, negotiate deals in real-time, and execute two-party verified exchanges.
        </p>

        {/* User Identity Banner + Create Ad Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto p-4 rounded-2xl bg-[#0e1224]/80 border border-purple-500/30 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              <span className="material-symbols-outlined text-lg">
                {currentUser.avatarIcon}
              </span>
            </div>
            <div className="text-left font-sans">
              <div className="text-white font-game font-black text-sm">@{currentUser.username}</div>
              <div className="text-[10px] text-slate-400 font-game font-semibold uppercase">
                {currentUser.server} • <span className="text-amber-400 font-bold">{currentUser.completedTrades} TRADES</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:ml-auto w-full sm:w-auto">
            <button
              onClick={() => {
                playClickSound();
                setIsProfileOpen(true);
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-[#161b36] hover:bg-[#20274c] border border-purple-500/30 hover:border-purple-400 text-slate-200 font-game text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
            >
              SWITCH IDENTITY
            </button>

            <button
              onClick={() => {
                playSelectSound();
                setIsCreateOpen(true);
              }}
              className="game-btn-gold flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-game text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
            >
              <span className="material-symbols-outlined text-base font-bold">add</span>
              <span>POST TRADE AD</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Session Dock Bar (If user currently has an active negotiation) */}
      {activeSession && (
        <div className="mb-8 p-5 rounded-3xl bg-gradient-to-r from-purple-950/90 via-[#161b36] to-purple-950/90 border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5 text-xs">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div>
              <span className="text-white font-game font-black text-sm uppercase tracking-wider block">
                ACTIVE NEGOTIATION ROOM: @
                {currentUser.id === activeSession.creatorId
                  ? activeSession.participantName
                  : activeSession.creatorName}
              </span>
              <span className="text-[11px] text-amber-300 font-game font-semibold">
                Status: {activeSession.status} • Two-Party Confirmation in Progress
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                playSelectSound();
                loadSessionMessages(activeSession.id);
              }}
              className="game-btn-gold px-5 py-2.5 rounded-xl font-game text-xs font-black uppercase tracking-wider"
            >
              OPEN CHAT PANEL →
            </button>
          </div>
        </div>
      )}

      {/* AdSlot: Trading Top / Sidebar Banner */}
      <div className="mb-8">
        <AdSlot placement="trading-sidebar" variant="Banner" />
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
        <div className="flex flex-wrap justify-center gap-2">
          {(
            [
              { id: 'ACTIVE', label: 'ACTIVE' },
              { id: 'ALL', label: 'ALL ADS' },
              { id: 'MY', label: 'MY POSTS' },
              { id: 'WIN', label: 'WIN' },
              { id: 'FAIR', label: 'FAIR' },
              { id: 'LOSS', label: 'LOSS' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => {
                playClickSound();
                setFilter(f.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-game font-bold uppercase tracking-wider transition-all border ${
                filter === f.id
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-amber-300 shadow-md'
                  : 'bg-[#141830] border-purple-500/20 text-slate-300 hover:bg-[#1c2242] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fruits or traders..."
            className="w-full bg-[#141830] border border-purple-500/30 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 py-2.5 px-3 pl-9 rounded-xl font-sans text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-all"
          />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-purple-400">
            search
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-game font-bold text-slate-400 hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Trade Feed Grid */}
      {isLoading ? (
        <div className="py-20 text-center font-game text-slate-400 text-sm">
          LOADING REAL-TIME TRADE BOARD...
        </div>
      ) : filteredTrades.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {filteredTrades.map((trade, idx) => {
            const isMyAd = trade.creatorId === currentUser.id;
            const isClaimedByMe = trade.acceptedBy === currentUser.id;
            const diff = trade.requestedTotalValue - trade.offeredTotalValue;

            return (
              <React.Fragment key={trade.id}>
                {idx === 2 && (
                  <div className="col-span-1 md:col-span-2">
                    <AdSlot
                      placement="trading-in-feed"
                      variant="Native"
                      className="my-2"
                    />
                  </div>
                )}
                <div
                  className={`rounded-3xl bg-[#0e1224]/80 p-6 flex flex-col justify-between transition-all group relative border-2 shadow-lg hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:scale-[1.01] ${
                    trade.status === 'IN_PROGRESS'
                      ? 'border-amber-400/70 shadow-amber-400/10'
                      : trade.status === 'CONFIRMED'
                      ? 'border-emerald-500/60 shadow-emerald-500/10'
                      : 'border-purple-500/20 hover:border-purple-500/50'
                  }`}
                >
                <div>
                  {/* Top Bar: Creator Info, Relative Time & Status Badge */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                    <div
                      onClick={() => onViewTraderProfile && onViewTraderProfile(trade.creatorName)}
                      className={`flex items-center gap-3 ${
                        onViewTraderProfile ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                      }`}
                      title={onViewTraderProfile ? `View @${trade.creatorName}'s terminal profile` : undefined}
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#090b16] border border-purple-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                        <span className="material-symbols-outlined text-base">
                          {trade.creatorAvatar}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-game font-black text-sm text-white block group-hover:text-amber-300 transition-colors">
                            @{trade.creatorName}
                          </span>
                          <TrustBadge
                            level={
                              trade.creatorName === 'Vortex_Samurai'
                                ? 'APEX_TRADER'
                                : trade.creatorName === 'DoughKing99'
                                ? 'MASTER_TRADER'
                                : trade.creatorName === 'ShadowHunter'
                                ? 'TRUSTED'
                                : trade.creatorName === 'DragonSlayerX'
                                ? 'ESTABLISHED'
                                : 'TRUSTED'
                            }
                            size="xs"
                          />
                          {isMyAd && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[9px] font-mono font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="font-game text-[10px] text-slate-400 uppercase tracking-wider">
                          {trade.server} • {getRelativeTime(trade.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-game font-bold uppercase tracking-wider ${
                          trade.status === 'ACTIVE'
                            ? trade.verdict === 'WIN'
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50'
                              : trade.verdict === 'FAIR'
                              ? 'bg-amber-950/70 text-amber-300 border border-amber-500/50'
                              : 'bg-rose-950/70 text-rose-300 border border-rose-500/50'
                            : trade.status === 'IN_PROGRESS'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-400 animate-pulse'
                            : trade.status === 'CONFIRMED'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-400'
                            : 'bg-slate-900 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {trade.status === 'ACTIVE' ? `VERDICT: ${trade.verdict}` : trade.status}
                      </span>
                    </div>
                  </div>

                  {/* Dual Offer Comparison Trays */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Left: Offering Side */}
                    <div className="p-3.5 rounded-2xl bg-[#0a0d1a] border border-slate-800 shadow-inner">
                      <div className="text-[10px] font-game font-bold text-purple-400 uppercase mb-2 flex justify-between tracking-wider">
                        <span>OFFERING</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          ${formatMoney(trade.offeredTotalValue)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {trade.offeredFruits.map((fruit, idx) => (
                          <div key={`${trade.id}-off-${idx}-${fruit.id}`} className="flex items-center gap-2 text-xs text-slate-200 font-game font-semibold">
                            <FruitImage
                              fruit={fruit}
                              size="xs"
                              className="w-5 h-5 rounded-md"
                            />
                            <span className="truncate">{fruit.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Looking For Side */}
                    <div className="p-3.5 rounded-2xl bg-[#0a0d1a] border border-slate-800 shadow-inner">
                      <div className="text-[10px] font-game font-bold text-amber-400 uppercase mb-2 flex justify-between tracking-wider">
                        <span>LOOKING FOR</span>
                        <span className="text-amber-400 font-mono font-bold">
                          ${formatMoney(trade.requestedTotalValue)}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {trade.requestedFruits.map((fruit, idx) => (
                          <div key={`${trade.id}-req-${idx}-${fruit.id}`} className="flex items-center gap-2 text-xs text-slate-200 font-game font-semibold">
                            <FruitImage
                              fruit={fruit}
                              size="xs"
                              className="w-5 h-5 rounded-md"
                            />
                            <span className="truncate">{fruit.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Optional Note */}
                  {trade.note && (
                    <p className="font-sans text-xs text-slate-300 bg-[#0a0d1a] p-2.5 rounded-xl border border-slate-800 mb-3 italic">
                      "{trade.note}"
                    </p>
                  )}
                </div>

                {/* Card Footer: Difference readout & Primary Actions */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <span className="font-game text-xs font-bold text-slate-400">
                    DELTA:{' '}
                    <strong className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {diff >= 0 ? '+' : ''}${formatMoney(diff)}
                    </strong>
                  </span>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Test in Calculator */}
                    <button
                      onClick={() => {
                        playSelectSound();
                        onLoadTrade(trade.offeredFruits, trade.requestedFruits);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#161b36] hover:bg-[#20274c] border border-purple-500/30 hover:border-purple-400 text-slate-200 font-game text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                      title="Load this trade in calculator"
                    >
                      CALCULATOR
                    </button>

                    {/* Trade Status Conditional Action Buttons */}
                    {trade.status === 'ACTIVE' && (
                      <>
                        {isMyAd ? (
                          <button
                            onClick={() => handleCancelTrade(trade.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-game text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95"
                          >
                            CANCEL AD
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAcceptTrade(trade)}
                            className="game-btn-gold px-4 py-1.5 rounded-xl font-game text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                          >
                            ACCEPT TRADE
                          </button>
                        )}
                      </>
                    )}

                    {trade.status === 'IN_PROGRESS' && (
                      <>
                        {isMyAd || isClaimedByMe ? (
                          <button
                            onClick={() => {
                              playSelectSound();
                              if (trade.sessionId) loadSessionMessages(trade.sessionId);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-400 font-game text-xs font-bold uppercase shadow-md animate-pulse"
                          >
                            ENTER CHAT →
                          </button>
                        ) : (
                          <span className="font-game text-[10px] text-slate-400 uppercase font-semibold">
                            CLAIMED BY @{trade.acceptedByName}
                          </span>
                        )}
                      </>
                    )}

                    {trade.status === 'CONFIRMED' && (
                      <span className="font-game text-xs text-emerald-400 uppercase font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>COMPLETED</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center border-2 border-purple-500/20 bg-[#0e1224]/70 p-8 rounded-3xl max-w-lg mx-auto shadow-lg">
          <span className="material-symbols-outlined text-5xl text-purple-400 mb-3 block">
            published_with_changes
          </span>
          <h3 className="font-game text-base uppercase text-white font-black tracking-wider mb-2">
            NO ACTIVE TRADES FOUND
          </h3>
          <p className="font-sans text-xs text-slate-400 mb-6">
            {searchQuery
              ? `No trades matching search query "${searchQuery}".`
              : 'Be the first trader to publish an advertisement to the live board.'}
          </p>
          <button
            onClick={() => {
              playSelectSound();
              setIsCreateOpen(true);
            }}
            className="game-btn-gold px-6 py-3 rounded-xl font-game text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-lg"
          >
            <span className="material-symbols-outlined text-base font-bold">add</span>
            <span>CREATE TRADE AD</span>
          </button>
        </div>
      )}

      {/* Modal: Create Trade */}
      <CreateTradeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUser={currentUser}
        onTradeCreated={(newAd) => {
          if (!newAd || !newAd.id) return;
          setTrades((prev) => {
            if (prev.some((t) => t.id === newAd.id)) {
              return prev.map((t) => (t.id === newAd.id ? newAd : t));
            }
            return [newAd, ...prev];
          });
        }}
      />

      {/* Modal: Trader Profile */}
      <TraderProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={(updated) => {
          setCurrentUser(updated);
          saveTraderProfile(updated);
        }}
      />

      {/* Slide/Floating Panel: Trade Chat & Negotiation */}
      {activeSession && (
        <TradeChatPanel
          session={activeSession}
          currentUser={currentUser}
          messages={sessionMessages}
          onSendMessage={handleSendMessage}
          onConfirmTrade={handleConfirmTrade}
          onRejectTrade={handleRejectTrade}
          onClosePanel={() => setActiveSession(null)}
          onLoadTradeInCalc={(off, req) => onLoadTrade(off, req)}
        />
      )}
    </div>
  );
};
