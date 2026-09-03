import { Fruit, TradeAd } from '../types';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from './auth';

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

  if ((!payload.offeringFruits || payload.offeringFruits.length === 0) &&
      (!payload.seekingFruits || payload.seekingFruits.length === 0)) {
    return { success: false, error: 'Must select at least one fruit to offer or seek.' };
  }

  const offeredTotalValue = (payload.offeringFruits || []).reduce((sum, f) => sum + (f.marketValue || f.beliPrice || 0), 0);
  const requestedTotalValue = (payload.seekingFruits || []).reduce((sum, f) => sum + (f.marketValue || f.beliPrice || 0), 0);

  let verdict: 'WIN' | 'FAIR' | 'LOSS' = 'FAIR';
  if (requestedTotalValue > offeredTotalValue * 1.1) {
    verdict = 'WIN';
  } else if (offeredTotalValue > requestedTotalValue * 1.1) {
    verdict = 'LOSS';
  }

  // Canonical RFC4122 v4 UUID (PostgreSQL compliant)
  const id = generateUUID();
  const now = Date.now();

  const createdTrade: TradeAd = {
    id,
    creatorId: user.id,
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
      creator_id: user.id,
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

export async function apiGetTradeAds(): Promise<{ success: boolean; trades: TradeAd[]; error?: string }> {
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
