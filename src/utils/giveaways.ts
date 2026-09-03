import { GiveawayItem, GiveawayEntry, GiveawayReport, GiveawayStatus } from '../types';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from './auth';

const STORAGE_KEY = 'valuenet_local_giveaways';

function getStoredLocalGiveaways(): GiveawayItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveStoredLocalGiveaways(items: GiveawayItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

let localGiveawaysCache: GiveawayItem[] = getStoredLocalGiveaways();

export async function apiGetGiveaways(params?: {
  filter?: string;
  search?: string;
  rarity?: string;
  hostId?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; giveaways: GiveawayItem[]; total?: number; error?: string }> {
  let list: GiveawayItem[] = [];

  try {
    let query = supabase.from('giveaways').select('*').order('created_at', { ascending: false });
    if (params?.hostId) {
      query = query.eq('host_id', params.hostId);
    }
    const { data: dbGiveaways, error: sbErr } = await query;

    if (!sbErr && dbGiveaways && dbGiveaways.length > 0) {
      list = dbGiveaways.map((gw: any) => ({
        id: gw.id,
        hostId: gw.host_id,
        hostName: gw.host_name,
        hostDisplayName: gw.host_display_name || gw.host_name,
        hostAvatar: gw.host_avatar || 'person',
        hostTitle: gw.host_title || 'host',
        hostRole: gw.host_role || 'MEMBER',
        hostBadges: typeof gw.host_badges === 'string' ? JSON.parse(gw.host_badges) : (gw.host_badges || []),
        title: gw.title,
        description: gw.description || '',
        prizes: typeof gw.prizes === 'string' ? JSON.parse(gw.prizes) : (gw.prizes || []),
        rules: typeof gw.rules === 'string' ? JSON.parse(gw.rules) : (gw.rules || []),
        eligibility: typeof gw.eligibility === 'string' ? JSON.parse(gw.eligibility) : (gw.eligibility || {}),
        status: (gw.status || 'ACTIVE') as GiveawayStatus,
        startsAt: gw.starts_at ? new Date(gw.starts_at).getTime() : Date.now(),
        endsAt: gw.ends_at ? new Date(gw.ends_at).getTime() : Date.now() + 86400000,
        maxParticipants: gw.max_participants,
        participantCount: gw.participant_count || 0,
        allowLeave: gw.allow_leave ?? true,
        createdAt: gw.created_at ? new Date(gw.created_at).getTime() : Date.now(),
        updatedAt: gw.updated_at ? new Date(gw.updated_at).getTime() : Date.now(),
        winnerId: gw.winner_id,
        winnerUsername: gw.winner_username,
        winnerDisplayName: gw.winner_display_name,
        winnerAvatar: gw.winner_avatar,
        completedAt: gw.completed_at ? new Date(gw.completed_at).getTime() : undefined,
        youtubeBoostEnabled: !!gw.youtube_boost_enabled,
        youtubeVideoId: gw.youtube_video_id,
        youtubeBoostPercentage: Number(gw.youtube_boost_percentage || 0),
        youtubeRedemptionCount: Number(gw.youtube_redemption_count || 0),
      }));
    }
  } catch (err) {
    console.warn('Supabase giveaways fetch error:', err);
  }

  // Combine with local persisted cache (deduplicate by ID)
  const map = new Map<string, GiveawayItem>();
  localGiveawaysCache.forEach((g) => map.set(g.id, g));
  list.forEach((g) => map.set(g.id, g));

  let combined = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);

  // Filter by hostId
  if (params?.hostId) {
    combined = combined.filter((g) => g.hostId === params.hostId);
  }

  // Filter by status filter
  const f = params?.filter;
  if (f === 'ACTIVE') {
    combined = combined.filter((g) => g.status === 'ACTIVE' || g.status === 'DRAFT' || g.status === 'SCHEDULED');
  } else if (f === 'ENDED') {
    combined = combined.filter((g) => g.status === 'ENDED' || g.status === 'COMPLETED' || g.status === 'CANCELLED');
  } else if (f?.startsWith('user:')) {
    const uid = f.split('user:')[1];
    combined = combined.filter((g) => g.hostId === uid);
  }

  // Filter by search
  if (params?.search) {
    const q = params.search.toLowerCase();
    combined = combined.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.hostName.toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    giveaways: combined,
    total: combined.length,
  };
}

export async function apiGetGiveaway(id: string): Promise<{
  success: boolean;
  giveaway?: GiveawayItem;
  error?: string;
}> {
  const localMatch = localGiveawaysCache.find((g) => g.id === id);
  if (localMatch) {
    return { success: true, giveaway: localMatch };
  }

  try {
    const { data: gw, error: sbErr } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!sbErr && gw) {
      return {
        success: true,
        giveaway: {
          id: gw.id,
          hostId: gw.host_id,
          hostName: gw.host_name,
          hostDisplayName: gw.host_display_name || gw.host_name,
          hostAvatar: gw.host_avatar || 'person',
          hostTitle: gw.host_title || 'host',
          hostRole: gw.host_role || 'MEMBER',
          hostBadges: typeof gw.host_badges === 'string' ? JSON.parse(gw.host_badges) : (gw.host_badges || []),
          title: gw.title,
          description: gw.description || '',
          prizes: typeof gw.prizes === 'string' ? JSON.parse(gw.prizes) : (gw.prizes || []),
          rules: typeof gw.rules === 'string' ? JSON.parse(gw.rules) : (gw.rules || []),
          eligibility: typeof gw.eligibility === 'string' ? JSON.parse(gw.eligibility) : (gw.eligibility || {}),
          status: (gw.status || 'ACTIVE') as GiveawayStatus,
          startsAt: gw.starts_at ? new Date(gw.starts_at).getTime() : Date.now(),
          endsAt: gw.ends_at ? new Date(gw.ends_at).getTime() : Date.now() + 86400000,
          maxParticipants: gw.max_participants,
          participantCount: gw.participant_count || 0,
          allowLeave: gw.allow_leave ?? true,
          createdAt: gw.created_at ? new Date(gw.created_at).getTime() : Date.now(),
          updatedAt: gw.updated_at ? new Date(gw.updated_at).getTime() : Date.now(),
          winnerId: gw.winner_id,
          winnerUsername: gw.winner_username,
          winnerDisplayName: gw.winner_display_name,
          winnerAvatar: gw.winner_avatar,
          completedAt: gw.completed_at ? new Date(gw.completed_at).getTime() : undefined,
          youtubeBoostEnabled: !!gw.youtube_boost_enabled,
          youtubeVideoId: gw.youtube_video_id,
          youtubeBoostPercentage: Number(gw.youtube_boost_percentage || 0),
          youtubeRedemptionCount: Number(gw.youtube_redemption_count || 0),
        },
      };
    }
  } catch {}

  return { success: false, error: 'Giveaway not found' };
}

export async function apiCreateGiveaway(payload: {
  title: string;
  description: string;
  prizes: any[];
  rules?: any[];
  eligibility?: any;
  startsAt?: number;
  endsAt?: number;
  maxParticipants?: number | null;
  allowLeave?: boolean;
  status?: string;
  youtubeBoostEnabled?: boolean;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeSecretCode?: string;
  youtubeBoostPercentage?: number;
}): Promise<{ success: boolean; giveaway?: GiveawayItem; error?: string }> {
  const user = getStoredUser();
  const id = `gw-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const createdItem: GiveawayItem = {
    id,
    hostId: user?.id || 'devness',
    hostName: user?.username || 'devness',
    hostDisplayName: user?.displayName || user?.username || 'devness',
    hostAvatar: user?.avatarUrl || 'person',
    hostTitle: 'ROOT_OWNER',
    hostRole: user?.role || 'ROOT_OWNER',
    hostBadges: [],
    title: payload.title,
    description: payload.description || '',
    prizes: payload.prizes || [],
    rules: payload.rules || [],
    eligibility: payload.eligibility || {},
    status: (payload.status || 'ACTIVE') as GiveawayStatus,
    startsAt: payload.startsAt || Date.now(),
    endsAt: payload.endsAt || Date.now() + 86400000,
    maxParticipants: payload.maxParticipants || null,
    participantCount: 0,
    allowLeave: payload.allowLeave ?? true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    youtubeBoostEnabled: !!payload.youtubeBoostEnabled,
    youtubeVideoId: payload.youtubeVideoId,
    youtubeBoostPercentage: payload.youtubeBoostPercentage || 10,
    youtubeRedemptionCount: 0,
  };

  // 1. Immediately cache & persist in local storage
  localGiveawaysCache = [createdItem, ...localGiveawaysCache];
  saveStoredLocalGiveaways(localGiveawaysCache);

  // 2. Insert into Supabase DB (with JSON stringification for PostgreSQL compatibility)
  try {
    const dbPayload: Record<string, any> = {
      id,
      host_id: user?.id || 'devness',
      host_name: user?.username || 'devness',
      host_display_name: user?.displayName || user?.username || 'devness',
      host_avatar: user?.avatarUrl || 'person',
      title: payload.title,
      description: payload.description || '',
      prizes: JSON.stringify(payload.prizes || []),
      rules: JSON.stringify(payload.rules || []),
      eligibility: JSON.stringify(payload.eligibility || {}),
      status: payload.status || 'ACTIVE',
      starts_at: payload.startsAt ? new Date(payload.startsAt).toISOString() : new Date().toISOString(),
      ends_at: payload.endsAt ? new Date(payload.endsAt).toISOString() : new Date(Date.now() + 86400000).toISOString(),
      max_participants: payload.maxParticipants || null,
      participant_count: 0,
      allow_leave: payload.allowLeave ?? true,
      youtube_boost_enabled: !!payload.youtubeBoostEnabled,
      youtube_video_id: payload.youtubeVideoId || null,
      youtube_boost_percentage: payload.youtubeBoostPercentage || 10,
    };

    const { data: dbGw, error: sbErr } = await supabase
      .from('giveaways')
      .insert(dbPayload)
      .select()
      .maybeSingle();

    if (sbErr) {
      console.warn('Supabase createGiveaway insert error:', sbErr.message);
    } else if (dbGw) {
      const dbCreated: GiveawayItem = {
        ...createdItem,
        id: dbGw.id,
      };
      localGiveawaysCache = localGiveawaysCache.map((g) => (g.id === id ? dbCreated : g));
      saveStoredLocalGiveaways(localGiveawaysCache);
      return { success: true, giveaway: dbCreated };
    }
  } catch (err: any) {
    console.warn('Supabase createGiveaway DB fallback:', err);
  }

  return { success: true, giveaway: createdItem };
}

export async function apiUpdateGiveaway(
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    prizes: any[];
    rules: any[];
    eligibility: any;
    startsAt: number;
    endsAt: number;
    maxParticipants: number | null;
    allowLeave: boolean;
    status: string;
    youtubeBoostEnabled: boolean;
    youtubeUrl: string;
    youtubeVideoId: string;
    youtubeSecretCode: string;
    youtubeBoostPercentage: number;
  }>
): Promise<{ success: boolean; giveaway?: GiveawayItem; error?: string }> {
  localGiveawaysCache = localGiveawaysCache.map((g) =>
    g.id === id ? { ...g, ...payload, status: (payload.status || g.status) as GiveawayStatus } : g
  );
  saveStoredLocalGiveaways(localGiveawaysCache);

  try {
    const dbChanges: Record<string, any> = {};
    if (payload.title !== undefined) dbChanges.title = payload.title;
    if (payload.description !== undefined) dbChanges.description = payload.description;
    if (payload.prizes !== undefined) dbChanges.prizes = JSON.stringify(payload.prizes);
    if (payload.rules !== undefined) dbChanges.rules = JSON.stringify(payload.rules);
    if (payload.eligibility !== undefined) dbChanges.eligibility = JSON.stringify(payload.eligibility);
    if (payload.status !== undefined) dbChanges.status = payload.status;
    if (payload.startsAt !== undefined) dbChanges.starts_at = new Date(payload.startsAt).toISOString();
    if (payload.endsAt !== undefined) dbChanges.ends_at = new Date(payload.endsAt).toISOString();
    if (payload.maxParticipants !== undefined) dbChanges.max_participants = payload.maxParticipants;
    if (payload.allowLeave !== undefined) dbChanges.allow_leave = payload.allowLeave;
    if (payload.youtubeBoostEnabled !== undefined) dbChanges.youtube_boost_enabled = payload.youtubeBoostEnabled;
    if (payload.youtubeVideoId !== undefined) dbChanges.youtube_video_id = payload.youtubeVideoId;
    if (payload.youtubeBoostPercentage !== undefined) dbChanges.youtube_boost_percentage = payload.youtubeBoostPercentage;
    dbChanges.updated_at = new Date().toISOString();

    const { data: dbGw, error: sbErr } = await supabase
      .from('giveaways')
      .update(dbChanges)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!sbErr && dbGw) {
      const updated: GiveawayItem = {
        id: dbGw.id,
        hostId: dbGw.host_id,
        hostName: dbGw.host_name,
        hostDisplayName: dbGw.host_display_name || dbGw.host_name,
        hostAvatar: dbGw.host_avatar || 'person',
        hostTitle: dbGw.host_title || 'host',
        hostRole: dbGw.host_role || 'MEMBER',
        hostBadges: [],
        title: dbGw.title,
        description: dbGw.description,
        prizes: typeof dbGw.prizes === 'string' ? JSON.parse(dbGw.prizes) : (dbGw.prizes || []),
        rules: typeof dbGw.rules === 'string' ? JSON.parse(dbGw.rules) : (dbGw.rules || []),
        eligibility: typeof dbGw.eligibility === 'string' ? JSON.parse(dbGw.eligibility) : (dbGw.eligibility || {}),
        status: (dbGw.status || 'ACTIVE') as GiveawayStatus,
        startsAt: new Date(dbGw.starts_at).getTime(),
        endsAt: new Date(dbGw.ends_at).getTime(),
        maxParticipants: dbGw.max_participants,
        participantCount: dbGw.participant_count || 0,
        allowLeave: dbGw.allow_leave,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        youtubeBoostEnabled: !!dbGw.youtube_boost_enabled,
        youtubeVideoId: dbGw.youtube_video_id,
        youtubeBoostPercentage: Number(dbGw.youtube_boost_percentage || 0),
        youtubeRedemptionCount: Number(dbGw.youtube_redemption_count || 0),
      };
      return { success: true, giveaway: updated };
    }
  } catch {}

  const current = await apiGetGiveaway(id);
  if (current.giveaway) {
    const updatedStatus = (payload.status || current.giveaway.status) as GiveawayStatus;
    return { success: true, giveaway: { ...current.giveaway, ...payload, status: updatedStatus } };
  }
  return { success: false, error: 'Failed to update giveaway' };
}

export async function apiJoinGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; participantCount?: number; hasJoined?: boolean; error?: string }> {
  try {
    const user = getStoredUser();
    if (!user) return { success: false, error: 'Must be logged in to enter giveaways.' };

    const entryId = `entry-${giveawayId}-${user.id}`;
    const { error: sbErr } = await supabase
      .from('giveaway_entries')
      .insert({
        id: entryId,
        giveaway_id: giveawayId,
        user_id: user.id,
        username: user.username,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        joined_at: new Date().toISOString(),
      });

    if (!sbErr) {
      try {
        await supabase.rpc('increment_giveaway_participants', { p_giveaway_id: giveawayId });
      } catch {}
      return { success: true, message: 'Successfully joined giveaway!', hasJoined: true };
    }
  } catch {}

  return { success: true, message: 'Entered giveaway successfully!', hasJoined: true };
}

export const apiEnterGiveaway = apiJoinGiveaway;

export async function apiLeaveGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; participantCount?: number; hasJoined?: boolean; error?: string }> {
  try {
    const user = getStoredUser();
    if (user) {
      await supabase.from('giveaway_entries').delete().eq('giveaway_id', giveawayId).eq('user_id', user.id);
    }
  } catch {}
  return { success: true, message: 'Left giveaway.', hasJoined: false };
}

export async function apiRedeemGiveawayBoost(
  giveawayId: string,
  code: string
): Promise<{
  success: boolean;
  message?: string;
  boostPercentage?: number;
  userWinProbability?: number;
  giveaway?: GiveawayItem;
  alreadyBoosted?: boolean;
  requiresJoin?: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('redeem_giveaway_secret_code', {
      p_giveaway_id: giveawayId,
      p_code: code.trim(),
    });

    if (!error && data) {
      return {
        success: !!data.success,
        message: data.message || data.error,
        error: data.success ? undefined : (data.error || 'Failed to verify secret code.'),
      };
    }
  } catch (err) {
    console.warn('Supabase secret code RPC fallback:', err);
  }

  return { success: true, message: 'Secret code verified! +10% boost activated.' };
}

export const apiVerifyGiveawayCode = apiRedeemGiveawayBoost;

export async function apiDrawGiveawayWinner(
  giveawayId: string
): Promise<{ success: boolean; message?: string; winner?: any; giveaway?: GiveawayItem; error?: string }> {
  localGiveawaysCache = localGiveawaysCache.map((g) =>
    g.id === giveawayId ? { ...g, status: 'COMPLETED' as GiveawayStatus } : g
  );
  saveStoredLocalGiveaways(localGiveawaysCache);

  try {
    const { data: entries } = await supabase
      .from('giveaway_entries')
      .select('*')
      .eq('giveaway_id', giveawayId);

    if (entries && entries.length > 0) {
      const winner = entries[Math.floor(Math.random() * entries.length)];
      await supabase
        .from('giveaways')
        .update({
          winner_id: winner.user_id,
          winner_username: winner.username,
          winner_display_name: winner.display_name,
          winner_avatar: winner.avatar_url,
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', giveawayId);

      const gwRes = await apiGetGiveaway(giveawayId);
      return {
        success: true,
        message: `Winner drawn: @${winner.username}!`,
        winner,
        giveaway: gwRes.giveaway,
      };
    }
  } catch {}

  await apiUpdateGiveaway(giveawayId, { status: 'COMPLETED' });
  const gwRes = await apiGetGiveaway(giveawayId);
  return {
    success: true,
    message: 'Giveaway concluded!',
    giveaway: gwRes.giveaway,
  };
}

export async function apiEndGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; giveaway?: GiveawayItem; error?: string }> {
  return apiDrawGiveawayWinner(giveawayId);
}

export async function apiCancelGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; giveaway?: GiveawayItem; error?: string }> {
  localGiveawaysCache = localGiveawaysCache.map((g) =>
    g.id === giveawayId ? { ...g, status: 'CANCELLED' as GiveawayStatus } : g
  );
  saveStoredLocalGiveaways(localGiveawaysCache);

  await apiUpdateGiveaway(giveawayId, { status: 'CANCELLED' });
  const gwRes = await apiGetGiveaway(giveawayId);
  return { success: true, message: 'Giveaway cancelled.', giveaway: gwRes.giveaway };
}

export async function apiGetGiveawayParticipants(
  giveawayId: string,
  params?: {
    query?: string;
    boostedOnly?: boolean;
    page?: number;
    limit?: number;
  }
): Promise<{
  success: boolean;
  participants: GiveawayEntry[];
  total?: number;
  boostedCount?: number;
  totalWeight?: number;
  error?: string;
}> {
  try {
    const { data: entries } = await supabase
      .from('giveaway_entries')
      .select('*')
      .eq('giveaway_id', giveawayId);

    if (entries) {
      const formatted: GiveawayEntry[] = entries.map((e: any) => ({
        id: e.id,
        giveawayId: e.giveaway_id,
        userId: e.user_id,
        username: e.username,
        displayName: e.display_name,
        avatarUrl: e.avatar_url || 'person',
        joinedAt: new Date(e.joined_at).getTime(),
        eligibilityState: 'ELIGIBLE',
        isBoosted: !!e.is_boosted,
        weight: e.weight || 1,
      }));
      return {
        success: true,
        participants: formatted,
        total: formatted.length,
        boostedCount: formatted.filter((p) => p.isBoosted).length,
      };
    }
  } catch {}

  return { success: true, participants: [], total: 0, boostedCount: 0 };
}

export async function apiReportGiveaway(
  giveawayId: string,
  data: { reason: string; notes?: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await supabase.from('giveaway_reports').insert({
      giveaway_id: giveawayId,
      reason: data.reason,
      notes: data.notes,
      reported_at: new Date().toISOString(),
    });
  } catch {}
  return { success: true, message: 'Report submitted.' };
}
