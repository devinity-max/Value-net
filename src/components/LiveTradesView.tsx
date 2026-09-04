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
  const handledNotificationsRef = useRef<Set<string>>(new Set());

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

  // Auto-dismiss toast notification after 6 seconds
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

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

  // ── Supabase Realtime: trade_ads board & trade_sessions ───────────────────
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
    const tradeSessionsChannel = supabase
      .channel(`trade_sessions_user_${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trade_sessions' },
        (payload) => {
          const row = payload.new as any;
          if (row.creator_id !== currentUser.id && row.participant_id !== currentUser.id) return;

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
              status: row.status || 'IN_PROGRESS',
              sessionId: row.id,
              createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
              updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
            },
            creatorConfirmed: row.creator_confirmed ?? false,
            participantConfirmed: row.participant_confirmed ?? false,
            status: row.status || 'IN_PROGRESS',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          };

          if (row.status === 'IN_PROGRESS') {
            setActiveSession(session);
            setSessionMessages([]);
            playSelectSound();
          }

          // Show "Trade Accepted!" notification ONLY to the trade creator for genuine IN_PROGRESS sessions
          const transitionKey = `insert-accept-${row.id}`;
          if (
            row.creator_id === currentUser.id &&
            row.status === 'IN_PROGRESS' &&
            !handledNotificationsRef.current.has(transitionKey)
          ) {
            handledNotificationsRef.current.add(transitionKey);
            setToastNotification({
              id: `notif-accept-${row.id}`,
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
            return {
              ...prev,
              status: row.status,
              creatorConfirmed: row.creator_confirmed ?? false,
              participantConfirmed: row.participant_confirmed ?? false,
            };
          });

          const isTerminal = ['CONFIRMED', 'COMPLETED', 'REJECTED', 'DECLINED', 'CLOSED', 'CANCELLED'].includes(row.status);
          if (isTerminal) {
            // Dismiss stale acceptance toast immediately when trade becomes terminal
            setToastNotification((prevNotif) => {
              if (prevNotif?.sessionId === row.id && prevNotif?.type === 'acceptance') {
                return null;
              }
              return prevNotif;
            });
          }

          // Contextual notifications for UPDATE state transitions
          if (row.status === 'IN_PROGRESS') {
            const isMeCreator = row.creator_id === currentUser.id;
            const counterpartConfirmed = isMeCreator ? (row.participant_confirmed ?? false) : (row.creator_confirmed ?? false);
            const counterpartName = isMeCreator ? row.participant_name : row.creator_name;

            const confirmKey = `confirm-${row.id}-${counterpartConfirmed}`;
            if (counterpartConfirmed && !handledNotificationsRef.current.has(confirmKey)) {
              handledNotificationsRef.current.add(confirmKey);
              setToastNotification({
                id: `notif-confirm-${row.id}`,
                userId: currentUser.id,
                title: '✓ Trade Update',
                message: `@${counterpartName} confirmed the trade.`,
                type: 'confirmed',
                tradeId: row.trade_ad_id,
                sessionId: row.id,
                createdAt: Date.now(),
                read: false,
              });
            }
          } else if (['CONFIRMED', 'COMPLETED'].includes(row.status)) {
            const completedKey = `completed-${row.id}`;
            if (!handledNotificationsRef.current.has(completedKey)) {
              handledNotificationsRef.current.add(completedKey);
              setToastNotification({
                id: `notif-completed-${row.id}`,
                userId: currentUser.id,
                title: '🎉 Trade Completed!',
                message: 'Both traders confirmed the exchange.',
                type: 'confirmed',
                tradeId: row.trade_ad_id,
                sessionId: row.id,
                createdAt: Date.now(),
                read: false,
              });
            }
          } else if (['REJECTED', 'DECLINED', 'CANCELLED'].includes(row.status)) {
            const declinedKey = `declined-${row.id}`;
            if (!handledNotificationsRef.current.has(declinedKey)) {
              handledNotificationsRef.current.add(declinedKey);
              setToastNotification({
                id: `notif-declined-${row.id}`,
                userId: currentUser.id,
                title: '✕ Trade Declined',
                message: 'The trade session was declined.',
                type: 'rejected',
                tradeId: row.trade_ad_id,
                sessionId: row.id,
                createdAt: Date.now(),
                read: false,
              });
            }
          }
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
      if (['CONFIRMED', 'COMPLETED'].includes(res.session.status)) {
        setToastNotification({
          id: `notif-completed-${res.session.id}`,
          userId: currentUser.id,
          title: '🎉 Trade Completed!',
          message: 'Both traders confirmed the exchange.',
          type: 'confirmed',
          sessionId: res.session.id,
          createdAt: Date.now(),
          read: false,
        });
      }
    }
  };

  // ── Reject / Decline Trade ────────────────────────────────────────────────
  const handleRejectTrade = async (sessionId: string, _reason?: string) => {
    if (!activeSession) return;
    const res = await apiCancelTradeSession(sessionId, activeSession.tradeId);
    if (res.success && res.session) {
      setActiveSession(res.session);
      setToastNotification({
        id: `notif-declined-${res.session.id}`,
        userId: currentUser.id,
        title: '✕ Trade Declined',
        message: 'The trade session was declined.',
        type: 'rejected',
        sessionId: res.session.id,
        createdAt: Date.now(),
        read: false,
      });
    } else if (res.error) {
      setActionError(res.error);
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

      {/* Header Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-[#0b0e1b] p-6 rounded-3xl border border-purple-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-amber-400 text-2xl">swap_horiz</span>
            <h1 className="font-game font-black text-2xl sm:text-3xl text-white uppercase tracking-wider">
              LIVE TRADES MARKETPLACE
            </h1>
            {realtimeConnected && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider ml-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                REALTIME
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-xl">
            Post your fruit offers, accept live community trades, and negotiate instantly via temporary private trade sessions.
          </p>
        </div>

        <button
          onClick={() => {
            playClickSound();
            const stored = getStoredUser();
            if (!stored && !isValidUUID(currentUser.id)) {
              setActionError('You must be logged in to create a trade ad.');
              if (onOpenAuth) onOpenAuth();
              return;
            }
            setIsCreateOpen(true);
          }}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-game font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          <span>POST TRADE AD</span>
        </button>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Active Session Dock Bar (If user currently has an active negotiation) */}
      {activeSession && (
        <div className="mb-8 p-5 rounded-3xl bg-gradient-to-r from-purple-950/90 via-[#161b36] to-purple-950/90 border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col sm:flex-row justify-between items-center gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-900/80 border border-purple-400/50 flex items-center justify-center text-amber-300">
              <span className="material-symbols-outlined text-xl">forum</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-game font-bold text-sm text-white uppercase tracking-wider">
                  ACTIVE TRADE SESSION #{activeSession.id.slice(-6).toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold uppercase">
                  {activeSession.status}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Negotiating with @{currentUser.id === activeSession.creatorId ? activeSession.participantName : activeSession.creatorName}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClickSound();
              // Re-trigger active session state so panel expands
              setActiveSession((prev) => (prev ? { ...prev } : prev));
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-game font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer shrink-0 active:scale-95"
          >
            OPEN CHAT PANEL →
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-[#090c18] p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['ACTIVE', 'ALL', 'MY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                playClickSound();
                setFilter(tab);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider uppercase transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab === 'ACTIVE' ? 'Active Offers' : tab === 'ALL' ? 'All Trades' : 'My Trades'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fruits or usernames..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#12162d] border border-slate-700/80 text-xs text-white placeholder-slate-500 font-medium outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Trades Grid */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs font-mono font-bold uppercase tracking-wider">
            Loading Live Market Trades...
          </p>
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="py-16 px-4 bg-[#090c18] rounded-3xl border border-slate-800 text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-slate-600 block">inventory_2</span>
          <h3 className="font-game font-bold text-base text-slate-300 uppercase tracking-wider">
            NO TRADES FOUND
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No trade advertisements matching "${searchQuery}".`
              : filter === 'MY'
              ? "You haven't posted any trade advertisements yet."
              : 'Be the first to post a trade advertisement!'}
          </p>
          {filter === 'MY' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Create Trade Ad</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTrades.map((trade) => {
            const isOwner = trade.creatorId === currentUser.id;
            const isAcceptingThis = isAccepting === trade.id;
            const isInProgress = trade.status === 'IN_PROGRESS';

            const userVerdict = getTradeVerdictForUser(
              trade.offeredFruits || [],
              trade.requestedFruits || [],
              currentUser.id,
              trade.creatorId
            );

            return (
              <div
                key={trade.id}
                className={`flex flex-col bg-[#0b0e1e] rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg hover:border-purple-500/40 ${
                  isInProgress ? 'border-amber-500/40 bg-[#0d1024]' : 'border-purple-500/20'
                }`}
              >
                {/* Ad Header */}
                <div className="px-4 py-3 bg-[#0e1228] border-b border-purple-500/15 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => onViewTraderProfile && onViewTraderProfile(trade.creatorName)}
                      className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-500/40 flex items-center justify-center text-amber-300 text-sm hover:scale-105 transition-transform cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">
                        {trade.creatorAvatar || 'person'}
                      </span>
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          onClick={() => onViewTraderProfile && onViewTraderProfile(trade.creatorName)}
                          className="font-game font-bold text-xs text-white truncate hover:text-amber-300 cursor-pointer"
                        >
                          @{trade.creatorName}
                        </span>
                        <TrustBadge reputationScore={95} size="sm" />
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 block">
                        {getRelativeTime(trade.createdAt)} · {trade.server}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Perspective Verdict Pill */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-game font-bold uppercase tracking-wider border ${
                        userVerdict.verdict === 'WIN'
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : userVerdict.verdict === 'LOSS'
                          ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                          : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {userVerdict.verdict === 'WIN' ? 'WIN' : userVerdict.verdict === 'LOSS' ? 'LOSS' : 'FAIR'}
                    </span>

                    {isOwner && (
                      <button
                        onClick={() => handleCancelTrade(trade.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Cancel Trade Ad"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Offer vs Seeking Content */}
                <div className="p-4 grid grid-cols-2 gap-3 flex-1">
                  {/* OFFERING */}
                  <div className="p-2.5 rounded-xl bg-[#080b18] border border-purple-500/15 flex flex-col justify-between">
                    <div>
                      <div className="text-[9px] font-game font-bold text-purple-400 uppercase tracking-wider mb-2 flex justify-between">
                        <span>OFFERING</span>
                        <span className="text-purple-300 font-mono">
                          ${formatMoney(trade.offeredTotalValue)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {trade.offeredFruits.map((f, i) => (
                          <div
                            key={`off-${trade.id}-${i}-${f.id}`}
                            className="flex items-center gap-1.5 text-xs font-game text-slate-200 truncate"
                          >
                            <FruitImage fruit={f} size="xs" className="w-4 h-4 rounded shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </div>
                        ))}
                        {trade.offeredFruits.length === 0 && (
                          <span className="text-[10px] text-slate-600 italic">No fruits</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SEEKING */}
                  <div className="p-2.5 rounded-xl bg-[#080b18] border border-amber-500/15 flex flex-col justify-between">
                    <div>
                      <div className="text-[9px] font-game font-bold text-amber-400 uppercase tracking-wider mb-2 flex justify-between">
                        <span>SEEKING</span>
                        <span className="text-amber-300 font-mono">
                          ${formatMoney(trade.requestedTotalValue)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {trade.requestedFruits.map((f, i) => (
                          <div
                            key={`req-${trade.id}-${i}-${f.id}`}
                            className="flex items-center gap-1.5 text-xs font-game text-slate-200 truncate"
                          >
                            <FruitImage fruit={f} size="xs" className="w-4 h-4 rounded shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </div>
                        ))}
                        {trade.requestedFruits.length === 0 && (
                          <span className="text-[10px] text-slate-600 italic">No fruits</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note line if present */}
                {trade.note && (
                  <div className="px-4 pb-2 text-[10px] text-slate-400 font-sans italic truncate">
                    "{trade.note}"
                  </div>
                )}

                {/* Footer Action Bar */}
                <div className="px-4 py-3 bg-[#080b18] border-t border-purple-500/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onLoadTrade(trade.offeredFruits, trade.requestedFruits)}
                    className="text-[10px] font-game font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    LOAD IN CALC →
                  </button>

                  {isOwner ? (
                    <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-game font-bold uppercase">
                      YOUR TRADE AD
                    </span>
                  ) : isInProgress ? (
                    <span className="px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-game font-bold uppercase">
                      DEAL IN PROGRESS
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcceptTrade(trade)}
                      disabled={isAcceptingThis}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-game font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isAcceptingThis ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>ACCEPTING...</span>
                        </>
                      ) : (
                        <span>ACCEPT TRADE</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Trade Modal */}
      <CreateTradeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentUser={currentUser}
        onTradeCreated={() => {
          setIsCreateOpen(false);
          fetchTrades();
        }}
      />

      {/* Trader Profile Modal */}
      {isProfileOpen && (
        <TraderProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          username={currentUser.username}
        />
      )}

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
