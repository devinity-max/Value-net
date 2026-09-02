import { GiveawayItem, GiveawayEntry, GiveawayReport } from '../types';
import { fetchApi } from './apiHelper';

export async function apiGetGiveaways(params?: {
  filter?: string;
  search?: string;
  rarity?: string;
  hostId?: string;
  page?: number;
  limit?: number;
}): Promise<{ success: boolean; giveaways: GiveawayItem[]; total?: number; error?: string }> {
  const query = new URLSearchParams();
  if (params?.filter) query.set('filter', params.filter);
  if (params?.search) query.set('search', params.search);
  if (params?.rarity) query.set('rarity', params.rarity);
  if (params?.hostId) query.set('hostId', params.hostId);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetchApi<{ success: boolean; giveaways: GiveawayItem[]; total?: number }>(
    `/api/giveaways?${query.toString()}`
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
  const query = new URLSearchParams();
  if (params?.query) query.set('query', params.query);
  if (params?.boostedOnly) query.set('boostedOnly', 'true');
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetchApi<{
    success: boolean;
    participants: GiveawayEntry[];
    total?: number;
    boostedCount?: number;
    totalWeight?: number;
  }>(`/api/giveaways/${giveawayId}/participants?${query.toString()}`);

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
