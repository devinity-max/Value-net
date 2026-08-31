import { GiveawayItem } from '../types';
import { safeFetchJson } from './apiHelper';
import { getAuthToken } from './auth';

export async function apiGetGiveaways(params?: {
  filter?: string;
  search?: string;
}): Promise<{ success: boolean; giveaways: GiveawayItem[]; error?: string }> {
  const query = new URLSearchParams();
  if (params?.filter) query.set('filter', params.filter);
  if (params?.search) query.set('search', params.search);

  const res = await safeFetchJson<{ success: boolean; giveaways: GiveawayItem[]; error?: string }>(
    `/api/giveaways?${query.toString()}`
  );

  if (!res.success || !res.data?.success || !res.data.giveaways) {
    return { success: false, giveaways: [], error: res.data?.error || res.error || 'Failed to load giveaways.' };
  }

  return { success: true, giveaways: res.data.giveaways };
}

export async function apiJoinGiveaway(
  giveawayId: string
): Promise<{ success: boolean; giveaway?: GiveawayItem; message?: string; error?: string }> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; giveaway: GiveawayItem; message?: string; error?: string }>(
    `/api/giveaways/${encodeURIComponent(giveawayId)}/join`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.success || !res.data?.success) {
    return { success: false, error: res.data?.error || res.error || 'Failed to enter giveaway.' };
  }

  return { success: true, giveaway: res.data.giveaway, message: res.data.message };
}

export async function apiLeaveGiveaway(
  giveawayId: string
): Promise<{ success: boolean; giveaway?: GiveawayItem; message?: string; error?: string }> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; giveaway: GiveawayItem; message?: string; error?: string }>(
    `/api/giveaways/${encodeURIComponent(giveawayId)}/leave`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.success || !res.data?.success) {
    return { success: false, error: res.data?.error || res.error || 'Failed to withdraw from giveaway.' };
  }

  return { success: true, giveaway: res.data.giveaway, message: res.data.message };
}

export async function apiRedeemGiveawayBoost(
  giveawayId: string,
  secretCode: string
): Promise<{
  success: boolean;
  boostPercentage?: number;
  userWinProbability?: number;
  message?: string;
  error?: string;
}> {
  const token = getAuthToken();
  const res = await safeFetchJson<{
    success: boolean;
    boostPercentage?: number;
    userWinProbability?: number;
    message?: string;
    error?: string;
  }>(`/api/giveaways/${encodeURIComponent(giveawayId)}/boost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ secretCode }),
  });

  if (!res.success || !res.data?.success) {
    return { success: false, error: res.data?.error || res.error || 'Invalid or expired video boost code.' };
  }

  return {
    success: true,
    boostPercentage: res.data.boostPercentage,
    userWinProbability: res.data.userWinProbability,
    message: res.data.message,
  };
}

export async function apiCreateGiveaway(
  data: Partial<GiveawayItem> & { prizes: any[] }
): Promise<{ success: boolean; giveaway?: GiveawayItem; error?: string }> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; giveaway: GiveawayItem; error?: string }>(
    '/api/giveaways',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.success || !res.data?.success) {
    return { success: false, error: res.data?.error || res.error || 'Failed to create giveaway.' };
  }

  return { success: true, giveaway: res.data.giveaway };
}

export async function apiCancelGiveaway(
  giveawayId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; error?: string }>(
    `/api/giveaways/${encodeURIComponent(giveawayId)}/cancel`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason }),
    }
  );

  if (!res.success || !res.data?.success) {
    return { success: false, error: res.data?.error || res.error || 'Failed to cancel giveaway.' };
  }

  return { success: true };
}

export async function apiDrawGiveawayWinner(
  giveawayId: string
): Promise<{ success: boolean; winner?: any; error?: string }> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; winner: any; error?: string }>(
    `/api/giveaways/${encodeURIComponent(giveawayId)}/draw`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.success || !res.data?.success) {
    return { success: false, error: res.data?.error || res.error || 'Failed to draw winners.' };
  }

  return { success: true, winner: res.data.winner };
}

export async function apiReportGiveaway(
  data: { giveawayId: string; reason: string; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; error?: string }>(
    '/api/giveaways/report',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.success || !res.data?.success) {
    return { success: false, error: res.data?.error || res.error || 'Failed to file giveaway report.' };
  }

  return { success: true };
}
