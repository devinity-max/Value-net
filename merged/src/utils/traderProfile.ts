import { TraderProfile } from '../types';
import { getStoredUser } from './auth';

const TRADER_PROFILE_KEY = 'valuenet_trader_profile';

export function getStoredTraderProfile(): TraderProfile {
  try {
    const authUser = getStoredUser();
    const raw = localStorage.getItem(TRADER_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (authUser) {
        return {
          ...parsed,
          id: authUser.id,
          username: authUser.username,
          displayName: authUser.displayName || authUser.username,
          avatarUrl: authUser.avatarUrl || parsed.avatarUrl || 'person',
          role: authUser.role,
        };
      }
      return parsed;
    }

    if (authUser) {
      const p = (authUser.profile || {}) as any;
      const profile: TraderProfile = {
        id: authUser.id,
        username: authUser.username,
        displayName: authUser.displayName || authUser.username,
        avatarIcon: authUser.avatarUrl || 'person',
        avatarUrl: authUser.avatarUrl || 'person',
        role: authUser.role,
        rating: p.rating || 5.0,
        totalTrades: p.totalTrades || p.tradesCompleted || 0,
        completedTrades: p.totalTrades || p.tradesCompleted || 0,
        vouchesCount: p.vouchesCount || 0,
        trustScore: p.trustScore || p.reputationScore || 100,
        badges: p.badges || ['community_member'],
        joinDate: p.joinDate || new Date().toISOString(),
        bio: p.bio || 'Blox Fruits trader.',
        server: p.server || 'US-East (Florida)',
        status: p.status || 'TRADING',
      };
      saveTraderProfile(profile);
      return profile;
    }
  } catch {}

  const defaultProfile: TraderProfile = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    username: 'Trader_' + Math.floor(1000 + Math.random() * 9000),
    displayName: 'Anonymous Trader',
    avatarIcon: 'person',
    avatarUrl: 'person',
    role: 'MEMBER',
    rating: 5.0,
    totalTrades: 12,
    completedTrades: 12,
    vouchesCount: 8,
    trustScore: 98,
    badges: ['community_member', 'verified_trader'],
    joinDate: '2024-01-15',
    bio: 'Looking for fair trades and mythical items.',
    server: 'US-East (Florida)',
    status: 'TRADING',
  };
  return defaultProfile;
}

export function saveTraderProfile(profile: TraderProfile): void {
  try {
    localStorage.setItem(TRADER_PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}
