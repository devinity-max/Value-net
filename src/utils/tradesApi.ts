import { Fruit, TradeAd, TradeSession, TradeMessage } from '../types';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from './auth';
import { calculateTrade } from './calc';

// ─── UUID Helpers ────────────────────────────────────────────────────────────
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ─── Map DB row → TradeSession ───────────────────────────────────────────────
function mapDbSession(row: any, tradeAd?: TradeAd): TradeSession {
  const offeredFruits: Fruit[] =
    typeof row.offered_fruits === 'string'
      ? JSON.parse(row.offered_fruits)
      : row.offered_fruits || [];
  const requestedFruits: Fruit[] =
    typeof row.requested_fruits === 'string'
      ? JSON.parse(row.requested_fruits)
      : row.requested_fruits || [];

  const ad: TradeAd = tradeAd || {
    id: row.trade_ad_id,
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    creatorAvatar: row.creator_avatar || 'person',
    server: row.server || 'Second Sea (Cafe)',
    offeredFruits,
    requestedFruits,
    offeredTotalValue: Number(row.offered_total_value || 0),
    requestedTotalValue: Number(row.requested_total_value || 0),
    verdict: row.verdict || 'FAIR',
    note: '',
    status: 'IN_PROGRESS',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };

  return {
    id: row.id,
    tradeId: row.trade_ad_id,
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    creatorAvatar: row.creator_avatar || 'person',
    participantId: row.participant_id,
    participantName: row.participant_name,
    participantAvatar: row.participant_avatar || 'person',
    tradeAd: ad,
    creatorConfirmed: row.creator_confirmed ?? false,
    participantConfirmed: row.participant_confirmed ?? false,
    status: row.status || 'IN_PROGRESS',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    closedAt: row.closed_at ? new Date(row.closed_at).getTime() : undefined,
  };
}

// ─── Map DB row → TradeMessage ───────────────────────────────────────────────
function mapDbMessage(row: any): TradeMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    message: row.message,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    type: row.type || 'chat',
  };
}

// ─── Create Trade Ad ─────────────────────────────────────────────────────────
export async function apiCreateTradeAd(payload: {
  offeringFruits: Fruit[];
  seekingFruits: Fruit[];
  server: string;
  notes?: string;
}): Promise<{ success: boolean; trade?: TradeAd; error?: string }> {
  const user = getStoredUser();
  if (!user) {
    return { success: false, error: 'Must be logged in to create a trade ad.' };
  }

  if (
    (!payload.offeringFruits || payload.offeringFruits.length === 0) &&
    (!payload.seekingFruits || payload.seekingFruits.length === 0)
  ) {
    return { success: false, error: 'Must select at least one fruit to offer or seek.' };
  }

  // Canonical valuation — offering = "your" side, seeking = "their" side
  const analysis = calculateTrade(payload.offeringFruits || [], payload.seekingFruits || []);
  const offeredTotalValue = analysis.yourMarketValue;
  const requestedTotalValue = analysis.theirMarketValue;

  let verdict: 'WIN' | 'FAIR' | 'LOSS' = 'FAIR';
  if (analysis.grade === 'BW' || analysis.grade === 'W') {
    verdict = 'WIN';
  } else if (analysis.grade === 'BL' || analysis.grade === 'L') {
    verdict = 'LOSS';
  }

  // Derive creator_id from trusted Supabase session
  const { data: authData } = await supabase.auth.getUser();
  let creatorId = authData?.user?.id;
  if (!creatorId || !isValidUUID(creatorId)) {
    if (user && user.id && isValidUUID(user.id)) {
      creatorId = user.id;
    }
  }

  if (!creatorId || !isValidUUID(creatorId)) {
    return { success: false, error: 'You must be logged in to create a trade advertisement.' };
  }

  const id = generateUUID();
  const now = Date.now();

  const createdTrade: TradeAd = {
    id,
    creatorId,
    creatorName: user.username,
    creatorAvatar: user.avatarUrl || 'person',
    server: payload.server || 'Second Sea (Cafe)',
    offeredFruits: payload.offeringFruits || [],
    requestedFruits: payload.seekingFruits || [],
    offeredTotalValue,
    requestedTotalValue,
    verdict,
    note: payload.notes || '',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const dbPayload = {
      id,
      creator_id: creatorId,
      creator_name: user.username,
      creator_avatar: user.avatarUrl || 'person',
      server: payload.server || 'Second Sea (Cafe)',
      offered_fruits: JSON.stringify(payload.offeringFruits || []),
      requested_fruits: JSON.stringify(payload.seekingFruits || []),
      offered_total_value: offeredTotalValue,
      requested_total_value: requestedTotalValue,
      verdict,
      note: payload.notes || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: dbTrade, error: sbErr } = await supabase
      .from('trade_ads')
      .insert(dbPayload)
      .select()
      .maybeSingle();

    if (sbErr) {
      console.warn('Supabase createTradeAd error:', sbErr.message);
      return { success: false, error: sbErr.message || 'Failed to persist trade ad to database.' };
    }

    if (dbTrade) {
      return { success: true, trade: createdTrade };
    }
  } catch (err: any) {
    console.warn('Supabase createTradeAd catch error:', err);
    return { success: false, error: err.message || 'Database error creating trade ad.' };
  }

  return { success: true, trade: createdTrade };
}

// ─── Get Trade Ads ────────────────────────────────────────────────────────────
export async function apiGetTradeAds(): Promise<{
  success: boolean;
  trades: TradeAd[];
  error?: string;
}> {
  try {
    const { data: dbTrades, error: sbErr } = await supabase
      .from('trade_ads')
      .select('*')
      .in('status', ['ACTIVE', 'IN_PROGRESS'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!sbErr && dbTrades) {
      const formatted: TradeAd[] = dbTrades.map((t: any) => ({
        id: t.id,
        creatorId: t.creator_id,
        creatorName: t.creator_name || 'Trader',
        creatorAvatar: t.creator_avatar || 'person',
        server: t.server || 'Second Sea (Cafe)',
        offeredFruits:
          typeof t.offered_fruits === 'string'
            ? JSON.parse(t.offered_fruits)
            : t.offered_fruits || [],
        requestedFruits:
          typeof t.requested_fruits === 'string'
            ? JSON.parse(t.requested_fruits)
            : t.requested_fruits || [],
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
      }));

      return { success: true, trades: formatted };
    }

    if (sbErr) {
      return { success: false, trades: [], error: sbErr.message };
    }
  } catch (err: any) {
    return { success: false, trades: [], error: err.message };
  }

  return { success: true, trades: [] };
}

// ─── Accept Trade Ad (creates a real persisted trade session) ─────────────────
export async function apiAcceptTradeAd(
  tradeId: string,
  participant: { id: string; username: string; avatarUrl?: string }
): Promise<{ success: boolean; session?: TradeSession; error?: string }> {
  try {
    // 1. Derive participant_id from trusted Supabase auth session or stored user
    const { data: authData } = await supabase.auth.getUser();
    let participantId = authData?.user?.id;
    if (!participantId || !isValidUUID(participantId)) {
      const storedUser = getStoredUser();
      if (storedUser && storedUser.id && isValidUUID(storedUser.id)) {
        participantId = storedUser.id;
      } else if (participant && participant.id && isValidUUID(participant.id)) {
        participantId = participant.id;
      }
    }

    if (!participantId || !isValidUUID(participantId)) {
      return {
        success: false,
        error: 'You must be logged in to accept trade advertisements.',
      };
    }

    // 2. Fetch the Trade Ad first to check eligibility and get creator info
    const { data: tradeAdRow, error: fetchErr } = await supabase
      .from('trade_ads')
      .select('*')
      .eq('id', tradeId)
      .maybeSingle();

    if (fetchErr || !tradeAdRow) {
      return { success: false, error: 'Trade ad not found.' };
    }

    if (tradeAdRow.status !== 'ACTIVE') {
      // Check if a session already exists for this trade (idempotency)
      if (tradeAdRow.session_id) {
        const { data: existingSession } = await supabase
          .from('trade_sessions')
          .select('*')
          .eq('id', tradeAdRow.session_id)
          .maybeSingle();

        if (existingSession) {
          const offeredFruits: Fruit[] =
            typeof tradeAdRow.offered_fruits === 'string'
              ? JSON.parse(tradeAdRow.offered_fruits)
              : tradeAdRow.offered_fruits || [];
          const requestedFruits: Fruit[] =
            typeof tradeAdRow.requested_fruits === 'string'
              ? JSON.parse(tradeAdRow.requested_fruits)
              : tradeAdRow.requested_fruits || [];
          const tradeAd: TradeAd = {
            id: tradeAdRow.id,
            creatorId: tradeAdRow.creator_id,
            creatorName: tradeAdRow.creator_name,
            creatorAvatar: tradeAdRow.creator_avatar || 'person',
            server: tradeAdRow.server || 'Second Sea (Cafe)',
            offeredFruits,
            requestedFruits,
            offeredTotalValue: Number(tradeAdRow.offered_total_value || 0),
            requestedTotalValue: Number(tradeAdRow.requested_total_value || 0),
            verdict: tradeAdRow.verdict || 'FAIR',
            note: tradeAdRow.note || '',
            status: tradeAdRow.status,
            sessionId: tradeAdRow.session_id,
            acceptedBy: tradeAdRow.accepted_by,
            acceptedByName: tradeAdRow.accepted_by_name,
            createdAt: tradeAdRow.created_at ? new Date(tradeAdRow.created_at).getTime() : Date.now(),
            updatedAt: tradeAdRow.updated_at ? new Date(tradeAdRow.updated_at).getTime() : Date.now(),
          };
          return { success: true, session: mapDbSession(existingSession, tradeAd) };
        }
      }
      return {
        success: false,
        error: 'Trade is no longer available or was accepted by another user.',
      };
    }

    if (tradeAdRow.creator_id === participantId) {
      return { success: false, error: 'You cannot accept your own trade advertisement.' };
    }

    // 3. Parse trade fruits for the session row
    const offeredFruits: Fruit[] =
      typeof tradeAdRow.offered_fruits === 'string'
        ? JSON.parse(tradeAdRow.offered_fruits)
        : tradeAdRow.offered_fruits || [];
    const requestedFruits: Fruit[] =
      typeof tradeAdRow.requested_fruits === 'string'
        ? JSON.parse(tradeAdRow.requested_fruits)
        : tradeAdRow.requested_fruits || [];

    // 4. Insert a real trade_sessions row in Supabase (with fallback if optional columns missing in live DB)
    const fullSessionPayload: Record<string, any> = {
      trade_ad_id: tradeId,
      creator_id: tradeAdRow.creator_id,
      creator_name: tradeAdRow.creator_name,
      creator_avatar: tradeAdRow.creator_avatar || 'person',
      participant_id: participantId,
      participant_name: participant.username,
      participant_avatar: participant.avatarUrl || 'person',
      offered_fruits: JSON.stringify(offeredFruits),
      requested_fruits: JSON.stringify(requestedFruits),
      offered_total_value: Number(tradeAdRow.offered_total_value || 0),
      requested_total_value: Number(tradeAdRow.requested_total_value || 0),
      verdict: tradeAdRow.verdict || 'FAIR',
      creator_confirmed: false,
      participant_confirmed: false,
      status: 'IN_PROGRESS',
    };

    let newSession: any = null;
    let sessionErr: any = null;

    const res = await supabase
      .from('trade_sessions')
      .insert(fullSessionPayload)
      .select()
      .maybeSingle();

    newSession = res.data;
    sessionErr = res.error;

    // Fallback: If live DB trade_sessions table lacks offered_fruits column, insert core columns only
    if (sessionErr && (sessionErr.message?.includes('offered_fruits') || sessionErr.message?.includes('schema cache'))) {
      console.warn('trade_sessions table lacks fruit metadata columns — retrying insert with core columns:', sessionErr.message);
      const corePayload = {
        trade_ad_id: tradeId,
        creator_id: tradeAdRow.creator_id,
        creator_name: tradeAdRow.creator_name,
        creator_avatar: tradeAdRow.creator_avatar || 'person',
        participant_id: participantId,
        participant_name: participant.username,
        participant_avatar: participant.avatarUrl || 'person',
        creator_confirmed: false,
        participant_confirmed: false,
        status: 'IN_PROGRESS',
      };

      const fallbackRes = await supabase
        .from('trade_sessions')
        .insert(corePayload)
        .select()
        .maybeSingle();

      newSession = fallbackRes.data;
      sessionErr = fallbackRes.error;
    }

    if (sessionErr || !newSession) {
      return {
        success: false,
        error: sessionErr?.message || 'Failed to create trade session.',
      };
    }

    // 5. Atomically update trade_ad → IN_PROGRESS + write session_id back
    const { error: updateErr } = await supabase
      .from('trade_ads')
      .update({
        status: 'IN_PROGRESS',
        accepted_by: participantId,
        accepted_by_name: participant.username,
        session_id: newSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .eq('status', 'ACTIVE');

    if (updateErr) {
      console.warn('trade_ads update after session insert error:', updateErr.message);
      // Non-fatal: session was created; ad update failure is logged
    }

    // 6. Build the TradeAd for the session object
    const tradeAd: TradeAd = {
      id: tradeAdRow.id,
      creatorId: tradeAdRow.creator_id,
      creatorName: tradeAdRow.creator_name,
      creatorAvatar: tradeAdRow.creator_avatar || 'person',
      server: tradeAdRow.server || 'Second Sea (Cafe)',
      offeredFruits,
      requestedFruits,
      offeredTotalValue: Number(tradeAdRow.offered_total_value || 0),
      requestedTotalValue: Number(tradeAdRow.requested_total_value || 0),
      verdict: tradeAdRow.verdict || 'FAIR',
      note: tradeAdRow.note || '',
      status: 'IN_PROGRESS',
      sessionId: newSession.id,
      acceptedBy: participantId,
      acceptedByName: participant.username,
      createdAt: tradeAdRow.created_at ? new Date(tradeAdRow.created_at).getTime() : Date.now(),
      updatedAt: Date.now(),
    };

    return { success: true, session: mapDbSession(newSession, tradeAd) };
  } catch (err: any) {
    return { success: false, error: err.message || 'Database error accepting trade.' };
  }
}

// ─── Get Active Trade Session for a User ─────────────────────────────────────
// Used as tab-focus fallback to restore state without Realtime
export async function apiGetActiveSession(userId: string): Promise<{
  success: boolean;
  session?: TradeSession;
  error?: string;
}> {
  try {
    const { data: rows, error } = await supabase
      .from('trade_sessions')
      .select('*')
      .eq('status', 'IN_PROGRESS')
      .or(`creator_id.eq.${userId},participant_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return { success: false, error: error.message };

    if (!rows || rows.length === 0) return { success: true };

    const row = rows[0];

    // Also fetch the trade_ad for full context
    const { data: tradeAdRow } = await supabase
      .from('trade_ads')
      .select('*')
      .eq('id', row.trade_ad_id)
      .maybeSingle();

    let tradeAd: TradeAd | undefined;
    if (tradeAdRow) {
      const offeredFruits: Fruit[] =
        typeof tradeAdRow.offered_fruits === 'string'
          ? JSON.parse(tradeAdRow.offered_fruits)
          : tradeAdRow.offered_fruits || [];
      const requestedFruits: Fruit[] =
        typeof tradeAdRow.requested_fruits === 'string'
          ? JSON.parse(tradeAdRow.requested_fruits)
          : tradeAdRow.requested_fruits || [];
      tradeAd = {
        id: tradeAdRow.id,
        creatorId: tradeAdRow.creator_id,
        creatorName: tradeAdRow.creator_name,
        creatorAvatar: tradeAdRow.creator_avatar || 'person',
        server: tradeAdRow.server || 'Second Sea (Cafe)',
        offeredFruits,
        requestedFruits,
        offeredTotalValue: Number(tradeAdRow.offered_total_value || 0),
        requestedTotalValue: Number(tradeAdRow.requested_total_value || 0),
        verdict: tradeAdRow.verdict || 'FAIR',
        note: tradeAdRow.note || '',
        status: tradeAdRow.status,
        sessionId: tradeAdRow.session_id,
        acceptedBy: tradeAdRow.accepted_by,
        acceptedByName: tradeAdRow.accepted_by_name,
        createdAt: tradeAdRow.created_at ? new Date(tradeAdRow.created_at).getTime() : Date.now(),
        updatedAt: tradeAdRow.updated_at ? new Date(tradeAdRow.updated_at).getTime() : Date.now(),
      };
    }

    return { success: true, session: mapDbSession(row, tradeAd) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Get Trade Messages for a Session ────────────────────────────────────────
export async function apiGetTradeMessages(sessionId: string): Promise<{
  success: boolean;
  messages: TradeMessage[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('trade_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) return { success: false, messages: [], error: error.message };

    return { success: true, messages: (data || []).map(mapDbMessage) };
  } catch (err: any) {
    return { success: false, messages: [], error: err.message };
  }
}

// ─── Send a Trade Chat Message ────────────────────────────────────────────────
export async function apiSendTradeMessage(
  sessionId: string,
  sender: { id: string; username: string },
  message: string
): Promise<{ success: boolean; message?: TradeMessage; error?: string }> {
  if (!message.trim()) return { success: false, error: 'Message cannot be empty.' };
  if (message.length > 500) return { success: false, error: 'Message too long (max 500 chars).' };

  try {
    // 1. Verify session is active (IN_PROGRESS)
    const { data: sessRow } = await supabase
      .from('trade_sessions')
      .select('status')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessRow && sessRow.status !== 'IN_PROGRESS') {
      return { success: false, error: 'Trade session is no longer active. Messages cannot be sent.' };
    }

    // 2. Derive sender from trusted Supabase session
    const { data: authData } = await supabase.auth.getUser();
    const senderId = authData?.user?.id || sender.id;

    const { data, error } = await supabase
      .from('trade_messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        sender_name: sender.username,
        message: message.trim(),
      })
      .select()
      .maybeSingle();

    if (error) return { success: false, error: error.message };

    return { success: true, message: data ? mapDbMessage(data) : undefined };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Confirm Trade Session ────────────────────────────────────────────────────
export async function apiConfirmTradeSession(
  sessionId: string,
  userId: string,
  role: 'creator' | 'participant'
): Promise<{ success: boolean; session?: TradeSession; error?: string }> {
  try {
    // 1. Fetch current session to check status and existing confirmation flags
    const { data: currentSession, error: fetchErr } = await supabase
      .from('trade_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (fetchErr || !currentSession) return { success: false, error: 'Session not found.' };

    // Terminal session check (immutable)
    if (['CONFIRMED', 'COMPLETED', 'REJECTED', 'DECLINED', 'CLOSED'].includes(currentSession.status)) {
      return { success: true, session: mapDbSession(currentSession) };
    }

    const field = role === 'creator' ? 'creator_confirmed' : 'participant_confirmed';
    const otherConfirmed =
      role === 'creator'
        ? (currentSession.participant_confirmed ?? false)
        : (currentSession.creator_confirmed ?? false);

    const updatePayload: Record<string, any> = {
      [field]: true,
      updated_at: new Date().toISOString(),
    };

    if (otherConfirmed) {
      updatePayload.status = 'CONFIRMED';
      updatePayload.closed_at = new Date().toISOString();
    }

    const { data: updatedSession, error: updateErr } = await supabase
      .from('trade_sessions')
      .update(updatePayload)
      .eq('id', sessionId)
      .select()
      .maybeSingle();

    if (updateErr) return { success: false, error: updateErr.message };

    // Also update trade_ad status if both confirmed
    if (otherConfirmed && currentSession.trade_ad_id) {
      await supabase
        .from('trade_ads')
        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
        .eq('id', currentSession.trade_ad_id);
    }

    return { success: true, session: updatedSession ? mapDbSession(updatedSession) : undefined };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Cancel / Close Trade Session ────────────────────────────────────────────
export async function apiCancelTradeSession(
  sessionId: string,
  tradeAdId: string
): Promise<{ success: boolean; session?: TradeSession; error?: string }> {
  try {
    const { data: currentSession } = await supabase
      .from('trade_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (currentSession && ['CONFIRMED', 'COMPLETED', 'REJECTED', 'DECLINED', 'CLOSED'].includes(currentSession.status)) {
      return { success: true, session: mapDbSession(currentSession) };
    }

    const { data: updatedSession, error: sessErr } = await supabase
      .from('trade_sessions')
      .update({
        status: 'REJECTED',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .maybeSingle();

    if (tradeAdId) {
      await supabase
        .from('trade_ads')
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq('id', tradeAdId);
    }

    if (sessErr) return { success: false, error: sessErr.message };

    return { success: true, session: updatedSession ? mapDbSession(updatedSession) : undefined };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Cancel Trade Ad ──────────────────────────────────────────────────────────
export async function apiCancelTradeAd(
  tradeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: sbErr } = await supabase
      .from('trade_ads')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', tradeId)
      .eq('creator_id', userId);

    if (sbErr) {
      return { success: false, error: sbErr.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to cancel trade.' };
  }
}
