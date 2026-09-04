import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Fruit, TradeAd, TradeSession, TradeMessage, TradeNotification, TraderProfile } from '../types';
import { formatMoney, getTradeVerdictForUser } from '../utils/calc';
import { playClickSound, playSelectSound } from '../utils/audio';
import { getStoredTraderProfile, saveTraderProfile } from '../utils/traderProfile';
import { getStoredUser } from '../utils/auth';
import { CreateTradeModal } from './CreateTradeModal';
import { TradeChatPanel } from './TradeChatPanel';
import { TraderProfileModal } from './TraderProfileModal';
import { NotificationToast } from './NotificationToast';
import { safeFetchJson } from '../utils/apiHelper';
import { supabase } from '../lib/supabaseClient';
import {
  apiAcceptTradeAd,
  apiCancelTradeAd,
  apiGetActiveSession,
  apiConfirmTradeSession,
  apiCancelTradeSession,
  isValidUUID,
} from '../utils/tradesApi';
import { TrustBadge } from './TrustBadge';
import { AdSlot } from './ads/AdSlot';
import { FruitImage } from './FruitImage';

interface LiveTradesViewProps {
  onLoadTrade: (yourFruits: Fruit[], theirFruits: Fruit[]) => void;
  onViewTraderProfile?: (username: string) => void;
  onOpenAuth?: () => void;
}

export const LiveTradesView: React.FC<LiveTradesViewProps> = ({ onLoadTrade, onViewTraderProfile, onOpenAuth }) => {
  const [currentUser, setCurrentUser] = useState<TraderProfile>(getStoredTraderProfile);
  const [trades, setTrades] = useState<TradeAd[]>([]);
  const [filter, setFilter] = useState<'ACTIVE' | 'ALL' | 'MY'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Panels
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<TradeSession | null>(null);
  const [sessionMessages, setSessionMessages] = useState<TradeMessage[]>([]);
  const [toastNotification, setToastNotification] = useState<TradeNotification | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<string | null>(null); // tradeId being accepted

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

  // ── Map raw Supabase trade_ad row → TradeAd ──────────────────────────────
  const mapTradeAdRow = (t: any): TradeAd => ({
    id: t.id,
    creatorId: t.creator_id,
    creatorName: t.creator_name || 'Trader',
    creatorAvatar: t.creator_avatar || 'person',
    server: t.server || 'Second Sea (Cafe)',
    offeredFruits: typeof t.offered_fruits === 'string' ? JSON.parse(t.offered_fruits) : (t.offered_fruits || []),
    requestedFruits: typeof t.requested_fruits === 'string' ? JSON.parse(t.requested_fruits) : (t.requested_fruits || []),
    offeredTotalValue: Number(t.offered_total_value || 0),
    requestedTotalValue: Number(t.requested_total_value || 0),
    verdict: t.verdict || 'FAIR',
    note: t.note || '',
    status: t.status || 'ACTIVE',
    sessionId: t.session_id,
    acceptedBy: t.accepted_by,
    acceptedByName: t.accepted_by_name,
    createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
    updatedAt: t.updated_at ? new Date(t.updated_at).getTime() : Date.now(),
  });

  // ── Initial fetch of Trade Ads ────────────────────────────────────────────
  const fetchTrades = async () => {
    try {
      const { data: tradeAds, error: sbErr } = await supabase
        .from('trade_ads')
        .select('*')
        .in('status', ['ACTIVE', 'IN_PROGRESS'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (!sbErr && tradeAds) {
        const uniqueMap = new Map<string, TradeAd>();
        tradeAds.forEach((t: any) => {
          if (t && t.id) uniqueMap.set(t.id, mapTradeAdRow(t));
        });
        setTrades(Array.from(uniqueMap.values()));
        return;
      }

      // Express fallback
      const res = await safeFetchJson<{ success: boolean; trades: TradeAd[] }>(
        `/api/trades?userId=${encodeURIComponent(currentUser.id)}`
      );
      if (res.success && res.data && Array.isArray(res.data.trades)) {
        const uniqueMap = new Map<string, TradeAd>();
        res.data.trades.forEach((t: TradeAd) => { if (t && t.id) uniqueMap.set(t.id, t); });
        setTrades(Array.from(uniqueMap.values()));
      }
    } catch (err) {
      console.warn('Failed to fetch trades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Recover any active trade session (tab-focus / mount fallback) ─────────
  const checkActiveSessions = useCallback(async () => {
    if (!currentUser.id) return;
    const res = await apiGetActiveSession(currentUser.id);
    if (res.success && res.session) {
      setActiveSession(res.session);
      playSelectSound();
    }
  }, [currentUser.id]);

  // ── Supabase Realtime: trade_ads board ────────────────────────────────────
  // ── Supabase Realtime: trade_sessions for this user ──────────────────────
  useEffect(() => {
    fetchTrades();
    checkActiveSessions();

    // ── Channel 1: live trade board (INSERT / UPDATE on trade_ads) ──────────
    const tradeAdsChannel = supabase
      .channel('trade_ads_board')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trade_ads' },
        (payload) => {
          const newTrade = mapTradeAdRow(payload.new);
          if (newTrade && newTrade.id) {
            setTrades((prev) => {
              if (prev.some((t) => t.id === newTrade.id)) return prev;
              return [newTrade, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trade_ads' },
        (payload) => {
          const updated = mapTradeAdRow(payload.new);
          if (updated && updated.id) {
            setTrades((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    // ── Channel 2: trade_sessions where I am creator OR participant ──────────
    // Supabase Realtime filter only supports single column; we subscribe to all
    // sessions and filter client-side for our user ID (RLS ensures we only
    // receive rows we're authorized to see).
    const tradeSessionsChannel = supabase
      .channel(`trade_sessions_user_${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trade_sessions' },
        (payload) => {
          const row = payload.new as any;
          // Only react if I am a participant in this session
          if (row.creator_id !== currentUser.id && row.participant_id !== currentUser.id) return;

          // Build TradeSession from the raw row
          const offeredFruits = typeof row.offered_fruits === 'string'
            ? JSON.parse(row.offered_fruits) : (row.offered_fruits || []);
          const requestedFruits = typeof row.requested_fruits === 'string'
            ? JSON.parse(row.requested_fruits) : (row.requested_fruits || []);

          const session: TradeSession = {
            id: row.id,
            tradeId: row.trade_ad_id,
            creatorId: row.creator_id,
            creatorName: row.creator_name,
            creatorAvatar: row.creator_avatar || 'person',
            participantId: row.participant_id,
            participantName: row.participant_name,
            participantAvatar: row.participant_avatar || 'person',
            tradeAd: {
              id: row.trade_ad_id,
              creatorId: row.creator_id,
              creatorName: row.creator_name,
              creatorAvatar: row.creator_avatar || 'person',
              server: 'Second Sea (Cafe)',
              offeredFruits,
              requestedFruits,
              offeredTotalValue: Number(row.offered_total_value || 0),
              requestedTotalValue: Number(row.requested_total_value || 0),
              verdict: row.verdict || 'FAIR',
              note: '',
              status: 'IN_PROGRESS',
              sessionId: row.id,
              createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
              updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
            },
            creatorConfirmed: row.creator_confirmed ?? false,
            participantConfirmed: row.participant_confirmed ?? false,
            status: row.status || 'IN_PROGRESS',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          };

          setActiveSession(session);
          setSessionMessages([]);
          playSelectSound();

          // Show toast notification to the trade creator (not the accepter who already has the panel open)
          if (row.creator_id === currentUser.id) {
            setToastNotification({
              id: `notif-${row.id}`,
              userId: currentUser.id,
              title: '⚔️ Trade Accepted!',
              message: `@${row.participant_name} accepted your trade offer.`,
              type: 'acceptance',
              tradeId: row.trade_ad_id,
              sessionId: row.id,
              createdAt: Date.now(),
              read: false,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trade_sessions' },
        (payload) => {
          const row = payload.new as any;
          if (row.creator_id !== currentUser.id && row.participant_id !== currentUser.id) return;
          setActiveSession((prev) => {
            if (!prev || prev.id !== row.id) return prev;
            return { ...prev, status: row.status, creatorConfirmed: row.creator_confirmed, participantConfirmed: row.participant_confirmed };
          });
        }
      )
      .subscribe();

    // ── Tab focus fallback: recover session when user returns to tab ─────────
    const onFocus = () => checkActiveSessions();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(tradeAdsChannel);
      supabase.removeChannel(tradeSessionsChannel);
      window.removeEventListener('focus', onFocus);
      if (socketRef.current) socketRef.current.close();
    };
  }, [currentUser.id, currentUser.username, checkActiveSessions]);





  // ── Sync user profile with stored auth user if available ────────────────
  useEffect(() => {
    const syncUser = () => {
      const stored = getStoredUser();
      if (stored && stored.id && isValidUUID(stored.id)) {
        setCurrentUser((prev) => ({
          ...prev,
          id: stored.id,
          username: stored.username || prev.username,
          displayName: stored.displayName || prev.displayName,
          avatarIcon: stored.avatarUrl || prev.avatarIcon || 'person',
        }));
      }
    };
    syncUser();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  // ── Accept Trade (creates real persisted session) ─────────────────────────
  const handleAcceptTrade = async (trade: TradeAd) => {
    setActionError(null);
    playClickSound();

    let authenticatedId: string | null = null;
    let usernameToUse = currentUser.username;

    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id && isValidUUID(authData.user.id)) {
      authenticatedId = authData.user.id;
      usernameToUse = authData.user.user_metadata?.username || currentUser.username;
    } else {
      const storedUser = getStoredUser();
      if (storedUser && storedUser.id && isValidUUID(storedUser.id)) {
        authenticatedId = storedUser.id;
        usernameToUse = storedUser.username || currentUser.username;
      } else if (currentUser.id && isValidUUID(currentUser.id)) {
        authenticatedId = currentUser.id;
        usernameToUse = currentUser.username;
      }
    }

    if (!authenticatedId || !isValidUUID(authenticatedId)) {
      try {
        sessionStorage.setItem('valuenet_pending_accept_trade', trade.id);
      } catch {}
      setActionError('You must be logged in to accept trade advertisements.');
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (trade.creatorId === authenticatedId) {
      setActionError('You cannot accept your own trade advertisement.');
      return;
    }

    if (isAccepting) return; // prevent double-click
    setIsAccepting(trade.id);

    try {
      const res = await apiAcceptTradeAd(trade.id, {
        id: authenticatedId,
        username: usernameToUse,
        avatarUrl: currentUser.avatarIcon,
      });

      if (res.success && res.session) {
        playSelectSound();
        setActiveSession(res.session);
        setSessionMessages([]);
        try {
          sessionStorage.removeItem('valuenet_pending_accept_trade');
        } catch {}
        // Optimistically update local trade list
        setTrades((prev) =>
          prev.map((t) =>
            t.id === trade.id
              ? { ...t, status: 'IN_PROGRESS', acceptedBy: authenticatedId, acceptedByName: usernameToUse, sessionId: res.session!.id }
              : t
          )
        );
      } else {
        setActionError(res.error || 'Trade is no longer available or was accepted by another user.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept trade.');
    } finally {
      setIsAccepting(null);
    }
  };

  // ── Auto-resume pending trade acceptance post-login ───────────────────────
  useEffect(() => {
    try {
      const pendingTradeId = sessionStorage.getItem('valuenet_pending_accept_trade');
      if (!pendingTradeId) return;

      const storedUser = getStoredUser();
      const isUserAuth = (storedUser && storedUser.id && isValidUUID(storedUser.id)) || isValidUUID(currentUser.id);

      if (isUserAuth && trades.length > 0) {
        const pendingTrade = trades.find((t) => t.id === pendingTradeId);
        if (pendingTrade && pendingTrade.status === 'ACTIVE') {
          sessionStorage.removeItem('valuenet_pending_accept_trade');
          handleAcceptTrade(pendingTrade);
        }
      }
    } catch {}
  }, [trades, currentUser.id]);



  // ── Cancel Trade (creator only) ───────────────────────────────────────────
  const handleCancelTrade = async (tradeId: string) => {
    playClickSound();
    try {
      const res = await apiCancelTradeAd(tradeId, currentUser.id);
      if (res.success) {
        setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      }
    } catch (err) {
      console.error('Failed to cancel trade', err);
    }
  };

  // ── Confirm Trade ─────────────────────────────────────────────────────────
  const handleConfirmTrade = async (sessionId: string) => {
    if (!activeSession) return;
    const role = currentUser.id === activeSession.creatorId ? 'creator' : 'participant';
    const res = await apiConfirmTradeSession(sessionId, currentUser.id, role);
    if (res.success && res.session) {
      setActiveSession(res.session);
    }
  };

  // ── Reject Trade ──────────────────────────────────────────────────────────
  const handleRejectTrade = async (sessionId: string, _reason?: string) => {
    if (!activeSession) return;
    await apiCancelTradeSession(sessionId, activeSession.tradeId);
    setActiveSession((prev) => prev ? { ...prev, status: 'REJECTED' } : null);
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
          onOpenSession={(_sessId) => {
            checkActiveSessions();
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
      <div className="text-center mb-10 flex flex-col items-center">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-0.5 bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] shadow-[0_0_25px_rgba(168,85,247,0.4)] mb-3 overflow-hidden">
          <img
            src="/assets/logo.png"
            alt="Value.NET Official Logo"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-[14px]"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161b36] border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] mb-3">
          <span
            className={`w-2 h-2 rounded-full ${
              realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-[11px] font-game font-bold uppercase tracking-wider text-purple-200">
            {realtimeConnected ? 'REAL-TIME P2P TRADE MARKETPLACE' : 'CONNECTING TO NETWORK...'}
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
                // Session is already in state — just ensure it's open by re-setting it
                setActiveSession((prev) => prev ? { ...prev } : prev);
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
            const userVerdict = getTradeVerdictForUser(
              trade.offeredFruits,
              trade.requestedFruits,
              currentUser.id,
              trade.creatorId
            );
            const diff = userVerdict.analysis.diff;
            const displayVerdict = userVerdict.verdict;

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
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50'
                            : trade.status === 'IN_PROGRESS'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-400 animate-pulse'
                            : trade.status === 'CONFIRMED'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-400'
                            : 'bg-slate-900 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {trade.status === 'IN_PROGRESS' ? 'NEGOTIATING' : trade.status === 'CONFIRMED' ? 'COMPLETED' : trade.status}
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

                {/* Card Footer: Primary Actions */}
                <div className="pt-3 border-t border-slate-800 flex justify-end items-center gap-3">
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
                              checkActiveSessions();
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
          onConfirmTrade={handleConfirmTrade}
          onRejectTrade={handleRejectTrade}
          onClosePanel={() => setActiveSession(null)}
          onLoadTradeInCalc={(off, req) => onLoadTrade(off, req)}
        />
      )}
    </div>
  );
};
