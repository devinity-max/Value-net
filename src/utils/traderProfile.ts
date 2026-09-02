import { UserProfile, UserStats, TradeReview, TraderProfile } from '../types';
import { fetchApi } from './apiHelper';

export function getStoredTraderProfile(): TraderProfile {
  try {
    const raw = localStorage.getItem('valuenet_trader_profile');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    id: 'local-trader',
    username: 'BloxTrader',
    displayName: 'Blox Trader',
    server: 'Sea 3',
    rating: 5.0,
    completedTrades: 12,
    trustScore: 90,
  };
}

export function saveTraderProfile(profile: TraderProfile): void {
  try {
    localStorage.setItem('valuenet_trader_profile', JSON.stringify(profile));
  } catch {}
}

export async function fetchUserProfile(username: string): Promise<{
  success: boolean;
  profile?: UserProfile;
  stats?: UserStats;
  reviews?: TradeReview[];
  error?: string;
}> {
  const res = await fetchApi<{ profile: UserProfile; stats: UserStats; reviews: TradeReview[] }>(
    `/api/users/profile/${encodeURIComponent(username)}`
  );
  if (res.success && res.profile) {
    return {
      success: true,
      profile: res.profile as UserProfile,
      stats: res.stats as UserStats,
      reviews: (res.reviews as TradeReview[]) || [],
    };
  }
  return {
    success: false,
    error: res.error || 'Failed to load profile',
  };
}
