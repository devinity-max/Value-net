import { GiveawayItem, GiveawayEntry, GiveawayReport } from '../types';
import { fetchApi } from './apiHelper';
import { supabase } from '../lib/supabaseClient';

export async function apiGetGiveaways(params?: {
  filter?: string;
  search?: string;
  rarity?: string;
  hostId?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; giveaways: GiveawayItem[]; total?: number; error?: string }> {
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      let query = supabase.from('giveaways').select('*').order('created_at', { ascending: false });
      if (params?.hostId) {
        query = query.eq('host_id', params.hostId);
      }
      const { data: dbGiveaways, error: sbErr } = await query;

      if (!sbErr && dbGiveaways) {
        const formatted: GiveawayItem[] = dbGiveaways.map((gw: any) => ({
          id: gw.id,
          hostId: gw.host_id,
          hostName: gw.host_name,
          hostDisplayName: gw.host_display_name,
          hostAvatar: gw.host_avatar || 'person',
          hostTitle: gw.host_title || 'host',
          hostRole: gw.host_role || 'MEMBER',
          hostBadges: gw.host_badges || [],
          title: gw.title,
          description: gw.description || '',
          prizes: typeof gw.prizes === 'string' ? JSON.parse(gw.prizes) : (gw.prizes || []),
          rules: typeof gw.rules === 'string' ? JSON.parse(gw.rules) : (gw.rules || []),
          eligibility: typeof gw.eligibility === 'string' ? JSON.parse(gw.eligibility) : (gw.eligibility || {}),
          status: gw.status || 'ACTIVE',
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

        return {
          success: true,
          giveaways: formatted,
          total: formatted.length,
        };
      }
    } catch (err) {
      console.warn('Supabase giveaways fetch fallback:', err);
    }
  }

  const queryParams = new URLSearchParams();
  if (params?.filter) queryParams.set('filter', params.filter);
  if (params?.search) queryParams.set('search', params.search);
  if (params?.rarity) queryParams.set('rarity', params.rarity);
  if (params?.hostId) queryParams.set('hostId', params.hostId);
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.limit) queryParams.set('limit', String(params.limit));

  const res = await fetchApi<{ success: boolean; giveaways: GiveawayItem[]; total?: number }>(
    `/api/giveaways?${queryParams.toString()}`
  );
  if (res.success && Array.isArray(res.giveaways)) {
    return {
      success: true,
      giveaways: res.giveaways as GiveawayItem[],
      total: typeof res.total === 'number' ? res.total : res.giveaways.length,
    };
  }
  return { success: false, giveaways: [], error: res.error || 'Failed to fetch giveaways' };
}

export async function apiGetGiveaway(id: string): Promise<{
  success: boolean;
  giveaway?: GiveawayItem;
  error?: string;
}> {
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
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
            hostDisplayName: gw.host_display_name,
            hostAvatar: gw.host_avatar || 'person',
            hostTitle: gw.host_title || 'host',
            hostRole: gw.host_role || 'MEMBER',
            hostBadges: gw.host_badges || [],
            title: gw.title,
            description: gw.description || '',
            prizes: typeof gw.prizes === 'string' ? JSON.parse(gw.prizes) : (gw.prizes || []),
            rules: typeof gw.rules === 'string' ? JSON.parse(gw.rules) : (gw.rules || []),
            eligibility: typeof gw.eligibility === 'string' ? JSON.parse(gw.eligibility) : (gw.eligibility || {}),
            status: gw.status || 'ACTIVE',
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
  }

  const res = await fetchApi<{ success: boolean; giveaway?: GiveawayItem }>(`/api/giveaways/${id}`);
  if (res.success && res.giveaway) {
    return { success: true, giveaway: res.giveaway as GiveawayItem };
  }
  return { success: false, error: res.error || 'Giveaway not found' };
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
  const res = await fetchApi<{ success: boolean; giveaway?: GiveawayItem }>('/api/giveaways', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.success && res.giveaway) {
    return { success: true, giveaway: res.giveaway as GiveawayItem };
  }
  return { success: false, error: res.error || 'Failed to create giveaway' };
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
  const res = await fetchApi<{ success: boolean; giveaway?: GiveawayItem }>(`/api/giveaways/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (res.success && res.giveaway) {
    return { success: true, giveaway: res.giveaway as GiveawayItem };
  }
  return { success: false, error: res.error || 'Failed to update giveaway' };
}

export async function apiJoinGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; participantCount?: number; hasJoined?: boolean; error?: string }> {
  const res = await fetchApi<{
    success: boolean;
    message?: string;
    participantCount?: number;
    hasJoined?: boolean;
  }>(`/api/giveaways/${giveawayId}/join`, {
    method: 'POST',
  });
  return {
    success: !!res.success,
    message: typeof res.message === 'string' ? res.message : undefined,
    participantCount: typeof res.participantCount === 'number' ? res.participantCount : undefined,
    hasJoined: typeof res.hasJoined === 'boolean' ? res.hasJoined : undefined,
    error: res.error,
  };
}

export const apiEnterGiveaway = apiJoinGiveaway;

export async function apiLeaveGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; participantCount?: number; hasJoined?: boolean; error?: string }> {
  const res = await fetchApi<{
    success: boolean;
    message?: string;
    participantCount?: number;
    hasJoined?: boolean;
  }>(`/api/giveaways/${giveawayId}/leave`, {
    method: 'POST',
  });
  return {
    success: !!res.success,
    message: typeof res.message === 'string' ? res.message : undefined,
    participantCount: typeof res.participantCount === 'number' ? res.participantCount : undefined,
    hasJoined: typeof res.hasJoined === 'boolean' ? res.hasJoined : undefined,
    error: res.error,
  };
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
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
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
  }

  const res = await fetchApi<{
    success: boolean;
    message?: string;
    boostPercentage?: number;
    userWinProbability?: number;
    giveaway?: GiveawayItem;
    alreadyBoosted?: boolean;
    requiresJoin?: boolean;
  }>(`/api/giveaways/${giveawayId}/redeem-boost`, {
    method: 'POST',
    body: JSON.stringify({ code: code.trim() }),
  });
  return {
    success: !!res.success,
    message: typeof res.message === 'string' ? res.message : undefined,
    boostPercentage: typeof res.boostPercentage === 'number' ? res.boostPercentage : undefined,
    userWinProbability: typeof res.userWinProbability === 'number' ? res.userWinProbability : undefined,
    giveaway: res.giveaway ? (res.giveaway as GiveawayItem) : undefined,
    alreadyBoosted: typeof res.alreadyBoosted === 'boolean' ? res.alreadyBoosted : undefined,
    requiresJoin: typeof res.requiresJoin === 'boolean' ? res.requiresJoin : undefined,
    error: res.error,
  };
}

export const apiVerifyGiveawayCode = apiRedeemGiveawayBoost;

export async function apiDrawGiveawayWinner(
  giveawayId: string
): Promise<{ success: boolean; message?: string; winner?: any; giveaway?: GiveawayItem; error?: string }> {
  const res = await fetchApi<{
    success: boolean;
    message?: string;
    winner?: any;
    giveaway?: GiveawayItem;
  }>(`/api/giveaways/${giveawayId}/draw-winner`, {
    method: 'POST',
  });
  return {
    success: !!res.success,
    message: typeof res.message === 'string' ? res.message : undefined,
    winner: res.winner,
    giveaway: res.giveaway ? (res.giveaway as GiveawayItem) : undefined,
    error: res.error,
  };
}

export async function apiEndGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; giveaway?: GiveawayItem; error?: string }> {
  const res = await fetchApi<{
    success: boolean;
    message?: string;
    giveaway?: GiveawayItem;
  }>(`/api/giveaways/${giveawayId}/end`, {
    method: 'POST',
  });
  return {
    success: !!res.success,
    message: typeof res.message === 'string' ? res.message : undefined,
    giveaway: res.giveaway ? (res.giveaway as GiveawayItem) : undefined,
    error: res.error,
  };
}

export async function apiCancelGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; giveaway?: GiveawayItem; error?: string }> {
  const res = await fetchApi<{
    success: boolean;
    message?: string;
    giveaway?: GiveawayItem;
  }>(`/api/giveaways/${giveawayId}/cancel`, {
    method: 'POST',
  });
  return {
    success: !!res.success,
    message: typeof res.message === 'string' ? res.message : undefined,
    giveaway: res.giveaway ? (res.giveaway as GiveawayItem) : undefined,
    error: res.error,
  };
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
  const queryParams = new URLSearchParams();
  if (params?.query) queryParams.set('query', params.query);
  if (params?.boostedOnly) queryParams.set('boostedOnly', 'true');
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.limit) queryParams.set('limit', String(params.limit));

  const res = await fetchApi<{
    success: boolean;
    participants: GiveawayEntry[];
    total?: number;
    boostedCount?: number;
    totalWeight?: number;
  }>(`/api/giveaways/${giveawayId}/participants?${queryParams.toString()}`);

  if (res.success && Array.isArray(res.participants)) {
    return {
      success: true,
      participants: res.participants as GiveawayEntry[],
      total: typeof res.total === 'number' ? res.total : res.participants.length,
      boostedCount: typeof res.boostedCount === 'number' ? res.boostedCount : 0,
      totalWeight: typeof res.totalWeight === 'number' ? res.totalWeight : 0,
    };
  }
  return { success: false, participants: [], error: res.error || 'Failed to fetch participants' };
}

export async function apiReportGiveaway(
  giveawayId: string,
  data: { reason: string; notes?: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetchApi<{ success: boolean; message?: string }>(
    `/api/giveaways/${giveawayId}/report`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
  return {
    success: !!res.success,
    message: typeof res.message === 'string' ? res.message : undefined,
    error: res.error,
  };
}
