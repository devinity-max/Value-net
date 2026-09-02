import { UserProfile, UserStats, TradeReview, TraderProfile } from '../types';
import { fetchApi } from './apiHelper';
import { supabase } from '../lib/supabaseClient';

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
  // Try Supabase directly first
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (!profileErr && profileData) {
        const profile: UserProfile = {
          id: profileData.id,
          username: profileData.username,
          displayName: profileData.display_name || profileData.username,
          email: profileData.email || '',
          avatarUrl: profileData.avatar_url || 'person',
          bannerUrl: profileData.banner_url || 'midnight',
          bio: profileData.bio || '',
          role: profileData.role || 'MEMBER',
          status: profileData.status || 'OFFLINE',
          titleId: profileData.title_id || 'trader',
          tradingStyle: profileData.trading_style || 'Fair Trades',
          lookingFor: profileData.looking_for || [],
          notInterestedIn: profileData.not_interested_in || [],
          profileTheme: profileData.profile_theme || 'midnight',
          showProfile: profileData.show_profile ?? true,
          showPreferences: profileData.show_preferences ?? true,
          showActivity: profileData.show_activity ?? true,
          showTradeStats: profileData.show_trade_stats ?? true,
          server: profileData.server || 'Sea 3',
          createdAt: profileData.created_at ? new Date(profileData.created_at).getTime() : Date.now(),
          updatedAt: profileData.updated_at ? new Date(profileData.updated_at).getTime() : Date.now(),
        };

        return {
          success: true,
          profile,
          stats: {
            tradesCompleted: 0,
            tradesRejected: 0,
            tradesCancelled: 0,
            tradeAdsPosted: 0,
            acceptanceRate: 100,
            reputationScore: 100,
            rating: 5.0,
          } as UserStats,
          reviews: [],
        };
      }
    } catch (err) {
      console.warn('Supabase profile fetch fallback:', err);
    }
  }

  // Fallback to Express API
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
