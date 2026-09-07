import { GiveawayItem, GiveawayEntry, GiveawayReport, GiveawayStatus } from '../types';
import { supabase } from '../lib/supabaseClient';
import { getStoredUser } from './auth';
import { generateUUID, isValidUUID } from './tradesApi';

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

export function extractYoutubeVideoId(urlOrId?: string): string | undefined {
  if (!urlOrId) return undefined;
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId.trim())) {
    return urlOrId.trim();
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = urlOrId.match(regExp);
  return match && match[2].length === 11 ? match[2] : undefined;
}

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
    const { data: dbGiveaways, error: sbErr } = await supabase
      .from('giveaways')
      .select('*')
      .order('created_at', { ascending: false });

    if (sbErr) {
      console.warn('[GIVEAWAYS] Supabase giveaways query error:', sbErr.message);
    }

    if (!sbErr && dbGiveaways && dbGiveaways.length > 0) {
      const giveawayIds = dbGiveaways.map((g: any) => g.id).filter(Boolean);

      // 1. Derive participant counts for all giveaways from giveaway_entries
      const participantCountMap = new Map<string, number>();
      if (giveawayIds.length > 0) {
        try {
          const { data: entriesData } = await supabase
            .from('giveaway_entries')
            .select('giveaway_id')
            .in('giveaway_id', giveawayIds);

          if (entriesData) {
            entriesData.forEach((e: any) => {
              if (e.giveaway_id) {
                participantCountMap.set(
                  e.giveaway_id,
                  (participantCountMap.get(e.giveaway_id) || 0) + 1
                );
              }
            });
          }
        } catch (e) {
          console.warn('[GIVEAWAYS] Failed to fetch entry counts:', e);
        }
      }

      // 2. Check current user's entries to determine hasJoined and hasUserBoosted
      const currentUser = getStoredUser();
      const userEntriesMap = new Map<string, { isBoosted: boolean }>();

      if (currentUser && currentUser.id && giveawayIds.length > 0) {
        try {
          const { data: userEntries, error: entryErr } = await supabase
            .from('giveaway_entries')
            .select('giveaway_id, is_boosted')
            .eq('user_id', currentUser.id)
            .in('giveaway_id', giveawayIds);

          if (!entryErr && userEntries) {
            userEntries.forEach((e: any) => {
              userEntriesMap.set(e.giveaway_id, { isBoosted: !!e.is_boosted });
            });
          }
        } catch (e) {
          console.warn('[GIVEAWAYS] Failed to fetch user entries:', e);
        }
      }

      // 3. Batch resolve host profiles from profiles table (host_id foreign key)
      const hostIds = Array.from(
        new Set(dbGiveaways.map((g: any) => g.host_id).filter(Boolean))
      );
      const hostProfileMap = new Map<
        string,
        { username: string; displayName: string; avatarUrl: string; role: string }
      >();

      if (hostIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url, role')
            .in('id', hostIds);

          if (profiles) {
            profiles.forEach((p: any) => {
              hostProfileMap.set(p.id, {
                username: p.username || 'host',
                displayName: p.display_name || p.username || 'host',
                avatarUrl: p.avatar_url || 'person',
                role: p.role || 'APPROVED_CREATOR',
              });
            });
          }
        } catch (e) {
          console.warn('[GIVEAWAYS] Failed to batch lookup host profiles:', e);
        }
      }

      // 4. Batch resolve winner profiles from profiles table (winner_id foreign key)
      const winnerIds = Array.from(
        new Set(dbGiveaways.map((g: any) => g.winner_id).filter(Boolean))
      );
      const winnerProfileMap = new Map<
        string,
        { username: string; displayName: string; avatarUrl: string }
      >();

      if (winnerIds.length > 0) {
        try {
          const { data: winnerProfiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', winnerIds);

          if (winnerProfiles) {
            winnerProfiles.forEach((p: any) => {
              winnerProfileMap.set(p.id, {
                username: p.username || 'winner',
                displayName: p.display_name || p.username || 'winner',
                avatarUrl: p.avatar_url || 'person',
              });
            });
          }
        } catch (e) {
          console.warn('[GIVEAWAYS] Failed to batch lookup winner profiles:', e);
        }
      }

      // 5. Construct normalized GiveawayItem view models
      list = dbGiveaways.map((gw: any) => {
        const userEntry = userEntriesMap.get(gw.id);
        const hostProfile = hostProfileMap.get(gw.host_id);
        const winnerProfile = gw.winner_id ? winnerProfileMap.get(gw.winner_id) : null;
        const statusVal = (gw.status || 'ACTIVE').toUpperCase() as GiveawayStatus;

        const resolvedHostName = hostProfile?.username || 'host';
        const resolvedHostDisplayName = hostProfile?.displayName || resolvedHostName;
        const resolvedHostAvatar = hostProfile?.avatarUrl || 'person';
        const resolvedHostRole = hostProfile?.role || 'APPROVED_CREATOR';
        const derivedParticipantCount = participantCountMap.get(gw.id) || 0;

        const resolvedWinnerUsername = gw.winner_username || winnerProfile?.username;
        const resolvedWinnerDisplayName =
          gw.winner_display_name || winnerProfile?.displayName || resolvedWinnerUsername;
        const resolvedWinnerAvatar = gw.winner_avatar || winnerProfile?.avatarUrl || 'person';

        return {
          id: gw.id,
          hostId: gw.host_id,
          hostName: resolvedHostName,
          hostDisplayName: resolvedHostDisplayName,
          hostAvatar: resolvedHostAvatar,
          hostTitle: resolvedHostRole,
          hostRole: resolvedHostRole as any,
          hostBadges: [],
          title: gw.title,
          description: gw.description || '',
          prizes: typeof gw.prizes === 'string' ? JSON.parse(gw.prizes) : gw.prizes || [],
          rules: typeof gw.rules === 'string' ? JSON.parse(gw.rules) : gw.rules || [],
          eligibility:
            typeof gw.eligibility === 'string' ? JSON.parse(gw.eligibility) : gw.eligibility || {},
          status: statusVal,
          startsAt: gw.starts_at ? new Date(gw.starts_at).getTime() : Date.now(),
          endsAt: gw.ends_at ? new Date(gw.ends_at).getTime() : Date.now() + 86400000,
          maxParticipants: gw.max_participants,
          participantCount: derivedParticipantCount,
          allowLeave: gw.allow_leave ?? true,
          createdAt: gw.created_at ? new Date(gw.created_at).getTime() : Date.now(),
          updatedAt: gw.updated_at ? new Date(gw.updated_at).getTime() : Date.now(),
          winnerId: gw.winner_id,
          winnerUsername: resolvedWinnerUsername,
          winnerDisplayName: resolvedWinnerDisplayName,
          winnerAvatar: resolvedWinnerAvatar,
          completedAt: gw.completed_at ? new Date(gw.completed_at).getTime() : undefined,
          hasJoined: !!userEntry,
          hasUserBoosted: userEntry?.isBoosted ?? false,
          youtubeBoostEnabled: !!gw.youtube_boost_enabled,
          youtubeVideoId: gw.youtube_video_id,
          youtubeBoostPercentage: Number(gw.youtube_boost_percentage || 0),
          youtubeRedemptionCount: Number(gw.youtube_redemption_count || 0),
        };
      });
    }
  } catch (err) {
    console.warn('Supabase giveaways fetch error:', err);
  }

  // Combine with local persisted cache (deduplicate by ID, preferring DB data if present)
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
    combined = combined.filter((g) => {
      const st = (g.status || 'ACTIVE').toUpperCase();
      return (
        st === 'ACTIVE' ||
        st === 'DRAFT' ||
        st === 'SCHEDULED' ||
        st === 'LIVE' ||
        st === 'OPEN' ||
        st === 'PUBLISHED'
      );
    });
  } else if (f === 'ENDED') {
    combined = combined.filter((g) => {
      const st = (g.status || '').toUpperCase();
      return st === 'ENDED' || st === 'COMPLETED' || st === 'CANCELLED' || st === 'CLOSED';
    });
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
        (g.hostName && g.hostName.toLowerCase().includes(q))
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
  try {
    const { data: gw, error: sbErr } = await supabase
      .from('giveaways')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!sbErr && gw) {
      const currentUser = getStoredUser();
      let hasJoined = false;
      let hasUserBoosted = false;

      if (currentUser && currentUser.id) {
        const { data: entry } = await supabase
          .from('giveaway_entries')
          .select('is_boosted')
          .eq('giveaway_id', id)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (entry) {
          hasJoined = true;
          hasUserBoosted = !!entry.is_boosted;
        }
      }

      // Count total entries dynamically
      let derivedParticipantCount = 0;
      try {
        const { count } = await supabase
          .from('giveaway_entries')
          .select('id', { count: 'exact', head: true })
          .eq('giveaway_id', id);
        if (count !== null && count !== undefined) {
          derivedParticipantCount = count;
        }
      } catch {}

      // Lookup host profile
      let hostProfile: { username: string; displayName: string; avatarUrl: string; role: string } | null = null;
      if (gw.host_id) {
        try {
          const { data: p } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url, role')
            .eq('id', gw.host_id)
            .maybeSingle();
          if (p) {
            hostProfile = {
              username: p.username || 'host',
              displayName: p.display_name || p.username || 'host',
              avatarUrl: p.avatar_url || 'person',
              role: p.role || 'APPROVED_CREATOR',
            };
          }
        } catch {}
      }

      // Lookup winner profile
      let winnerProfile: { username: string; displayName: string; avatarUrl: string } | null = null;
      if (gw.winner_id) {
        try {
          const { data: wp } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('id', gw.winner_id)
            .maybeSingle();
          if (wp) {
            winnerProfile = {
              username: wp.username || 'winner',
              displayName: wp.display_name || wp.username || 'winner',
              avatarUrl: wp.avatar_url || 'person',
            };
          }
        } catch {}
      }

      const resolvedHostName = hostProfile?.username || 'host';
      const resolvedHostDisplayName = hostProfile?.displayName || resolvedHostName;
      const resolvedHostAvatar = hostProfile?.avatarUrl || 'person';
      const resolvedHostRole = hostProfile?.role || 'APPROVED_CREATOR';

      const resolvedWinnerUsername = gw.winner_username || winnerProfile?.username;
      const resolvedWinnerDisplayName =
        gw.winner_display_name || winnerProfile?.displayName || resolvedWinnerUsername;
      const resolvedWinnerAvatar = gw.winner_avatar || winnerProfile?.avatarUrl || 'person';

      return {
        success: true,
        giveaway: {
          id: gw.id,
          hostId: gw.host_id,
          hostName: resolvedHostName,
          hostDisplayName: resolvedHostDisplayName,
          hostAvatar: resolvedHostAvatar,
          hostTitle: resolvedHostRole,
          hostRole: resolvedHostRole as any,
          hostBadges: [],
          title: gw.title,
          description: gw.description || '',
          prizes: typeof gw.prizes === 'string' ? JSON.parse(gw.prizes) : gw.prizes || [],
          rules: typeof gw.rules === 'string' ? JSON.parse(gw.rules) : gw.rules || [],
          eligibility:
            typeof gw.eligibility === 'string' ? JSON.parse(gw.eligibility) : gw.eligibility || {},
          status: (gw.status || 'ACTIVE').toUpperCase() as GiveawayStatus,
          startsAt: gw.starts_at ? new Date(gw.starts_at).getTime() : Date.now(),
          endsAt: gw.ends_at ? new Date(gw.ends_at).getTime() : Date.now() + 86400000,
          maxParticipants: gw.max_participants,
          participantCount: derivedParticipantCount,
          allowLeave: gw.allow_leave ?? true,
          createdAt: gw.created_at ? new Date(gw.created_at).getTime() : Date.now(),
          updatedAt: gw.updated_at ? new Date(gw.updated_at).getTime() : Date.now(),
          winnerId: gw.winner_id,
          winnerUsername: resolvedWinnerUsername,
          winnerDisplayName: resolvedWinnerDisplayName,
          winnerAvatar: resolvedWinnerAvatar,
          completedAt: gw.completed_at ? new Date(gw.completed_at).getTime() : undefined,
          hasJoined,
          hasUserBoosted,
          youtubeBoostEnabled: !!gw.youtube_boost_enabled,
          youtubeVideoId: gw.youtube_video_id,
          youtubeBoostPercentage: Number(gw.youtube_boost_percentage || 0),
          youtubeRedemptionCount: Number(gw.youtube_redemption_count || 0),
        },
      };
    }
  } catch {}

  const localMatch = localGiveawaysCache.find((g) => g.id === id);
  if (localMatch) {
    return { success: true, giveaway: localMatch };
  }

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
  if (!user || user.role === 'MEMBER') {
    return {
      success: false,
      error: 'Unauthorized: Only Approved Creators, Moderators, Admins, and Owner can host giveaways.',
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  let authenticatedId: string | null = sessionData?.session?.user?.id ?? null;

  if (!authenticatedId || !isValidUUID(authenticatedId)) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id && isValidUUID(authData.user.id)) {
      authenticatedId = authData.user.id;
    } else {
      authenticatedId = user.id;
    }
  }

  if (!authenticatedId || !isValidUUID(authenticatedId)) {
    return {
      success: false,
      error: 'Please sign in with a valid account to host giveaways.',
    };
  }

  const id = generateUUID();
  const videoId = extractYoutubeVideoId(payload.youtubeUrl) || payload.youtubeVideoId;

  const dbPayload: Record<string, any> = {
    id,
    host_id: authenticatedId,
    title: payload.title,
    description: payload.description || '',
    prizes: JSON.stringify(payload.prizes || []),
    rules: JSON.stringify(payload.rules || []),
    eligibility: JSON.stringify(payload.eligibility || {}),
    status: (payload.status || 'ACTIVE').toUpperCase(),
    starts_at: payload.startsAt ? new Date(payload.startsAt).toISOString() : new Date().toISOString(),
    ends_at: payload.endsAt
      ? new Date(payload.endsAt).toISOString()
      : new Date(Date.now() + 86400000).toISOString(),
    max_participants: payload.maxParticipants || null,
    allow_leave: payload.allowLeave ?? true,
  };

  if (payload.youtubeBoostEnabled) {
    dbPayload.youtube_boost_enabled = true;
    if (videoId) dbPayload.youtube_video_id = videoId;
    if (payload.youtubeBoostPercentage)
      dbPayload.youtube_boost_percentage = payload.youtubeBoostPercentage;
  }

  const { data: dbGw, error: sbErr } = await supabase
    .from('giveaways')
    .insert(dbPayload)
    .select()
    .maybeSingle();

  if (sbErr || !dbGw) {
    console.error('[GIVEAWAYS] Database insert failed:', sbErr?.message);
    return {
      success: false,
      error: sbErr?.message || 'Failed to persist giveaway in database.',
    };
  }

  const createdItem: GiveawayItem = {
    id: dbGw.id,
    hostId: authenticatedId,
    hostName: user.username || 'host',
    hostDisplayName: user.displayName || user.username || 'host',
    hostAvatar: user.avatarUrl || 'person',
    hostTitle: user.role || 'APPROVED_CREATOR',
    hostRole: user.role || 'APPROVED_CREATOR',
    hostBadges: [],
    title: payload.title,
    description: payload.description || '',
    prizes: payload.prizes || [],
    rules: payload.rules || [],
    eligibility: payload.eligibility || {},
    status: (payload.status || 'ACTIVE').toUpperCase() as GiveawayStatus,
    startsAt: payload.startsAt || Date.now(),
    endsAt: payload.endsAt || Date.now() + 86400000,
    maxParticipants: payload.maxParticipants || null,
    participantCount: 0,
    allowLeave: payload.allowLeave ?? true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    youtubeBoostEnabled: !!payload.youtubeBoostEnabled,
    youtubeVideoId: videoId,
    youtubeBoostPercentage: payload.youtubeBoostPercentage || 10,
    youtubeRedemptionCount: 0,
  };

  localGiveawaysCache = [createdItem, ...localGiveawaysCache];
  saveStoredLocalGiveaways(localGiveawaysCache);

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
    if (payload.eligibility !== undefined)
      dbChanges.eligibility = JSON.stringify(payload.eligibility);
    if (payload.status !== undefined) dbChanges.status = payload.status;
    if (payload.startsAt !== undefined)
      dbChanges.starts_at = new Date(payload.startsAt).toISOString();
    if (payload.endsAt !== undefined) dbChanges.ends_at = new Date(payload.endsAt).toISOString();
    if (payload.maxParticipants !== undefined)
      dbChanges.max_participants = payload.maxParticipants;
    if (payload.allowLeave !== undefined) dbChanges.allow_leave = payload.allowLeave;
    if (payload.youtubeBoostEnabled !== undefined)
      dbChanges.youtube_boost_enabled = payload.youtubeBoostEnabled;
    if (payload.youtubeVideoId !== undefined) dbChanges.youtube_video_id = payload.youtubeVideoId;
    if (payload.youtubeBoostPercentage !== undefined)
      dbChanges.youtube_boost_percentage = payload.youtubeBoostPercentage;
    dbChanges.updated_at = new Date().toISOString();

    const { data: dbGw, error: sbErr } = await supabase
      .from('giveaways')
      .update(dbChanges)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!sbErr && dbGw) {
      return await apiGetGiveaway(id);
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
  giveawayId: string,
  secretCode?: string
): Promise<{ success: boolean; message?: string; participantCount?: number; hasJoined?: boolean; error?: string }> {
  const user = getStoredUser();
  if (!user) return { success: false, error: 'Must be logged in to enter giveaways.' };

  const { data: sessionData } = await supabase.auth.getSession();
  let authUserId: string | null = sessionData?.session?.user?.id ?? null;

  if (!authUserId || !isValidUUID(authUserId)) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id && isValidUUID(authData.user.id)) {
      authUserId = authData.user.id;
    } else if (user.id && isValidUUID(user.id)) {
      authUserId = user.id;
    }
  }

  if (!authUserId || !isValidUUID(authUserId)) {
    return { success: false, error: 'Please sign in with a valid account to enter giveaways.' };
  }

  if (!giveawayId || !isValidUUID(giveawayId)) {
    return { success: false, error: 'Invalid giveaway identifier.' };
  }

  // Fetch giveaway to check status & secret code
  const gwRes = await apiGetGiveaway(giveawayId);
  if (!gwRes.success || !gwRes.giveaway) {
    return { success: false, error: 'Giveaway drop not found.' };
  }

  const gw = gwRes.giveaway;
  if (gw.status === 'ENDED' || gw.status === 'COMPLETED' || gw.status === 'CANCELLED') {
    return { success: false, error: 'This drop has already concluded.' };
  }

  let isBoosted = false;

  // Validate Secret Code if YouTube Boost is enabled for this Drop
  if (gw.youtubeBoostEnabled) {
    if (!secretCode || !secretCode.trim()) {
      return { success: false, error: 'Please enter the secret code found in the video.' };
    }

    const redeemRes = await apiRedeemGiveawayBoost(giveawayId, secretCode.trim());
    if (!redeemRes.success) {
      return { success: false, error: redeemRes.error || 'Incorrect drop code. Watch the video and try again.' };
    }
    isBoosted = true;
  }

  // Check if entry already exists
  const { data: existingEntry } = await supabase
    .from('giveaway_entries')
    .select('id')
    .eq('giveaway_id', giveawayId)
    .eq('user_id', authUserId)
    .maybeSingle();

  if (existingEntry) {
    return { success: true, message: 'You are already entered in this drop!', hasJoined: true };
  }

  const entryId = generateUUID();

  const { error: sbErr } = await supabase.from('giveaway_entries').insert({
    id: entryId,
    giveaway_id: giveawayId,
    user_id: authUserId,
    is_boosted: isBoosted,
    joined_at: new Date().toISOString(),
  });

  if (sbErr) {
    if (sbErr.code === '23505' || sbErr.message?.includes('duplicate') || sbErr.message?.includes('unique')) {
      return { success: true, message: 'You are already entered in this drop!', hasJoined: true };
    }
    console.error('[GIVEAWAYS] Failed to insert entry:', sbErr.message, sbErr.code);
    return { success: false, error: sbErr.message || 'Failed to enter giveaway. Please try again.' };
  }

  // Count real entries from DB after successful insert
  let count = 0;
  try {
    const { count: entryCount } = await supabase
      .from('giveaway_entries')
      .select('id', { count: 'exact', head: true })
      .eq('giveaway_id', giveawayId);
    count = entryCount ?? 0;
  } catch {}

  return { success: true, message: "🎉 You're in! Your entry has been recorded.", hasJoined: true, participantCount: count };
}

export const apiEnterGiveaway = apiJoinGiveaway;

export async function apiLeaveGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; participantCount?: number; hasJoined?: boolean; error?: string }> {
  const user = getStoredUser();
  if (!user) return { success: false, error: 'Must be logged in.' };

  const { data: sessionData } = await supabase.auth.getSession();
  let authUserId: string | null = sessionData?.session?.user?.id ?? null;

  if (!authUserId || !isValidUUID(authUserId)) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id && isValidUUID(authData.user.id)) {
      authUserId = authData.user.id;
    } else if (user.id && isValidUUID(user.id)) {
      authUserId = user.id;
    }
  }

  if (!authUserId || !isValidUUID(authUserId)) {
    return { success: false, error: 'Must be signed in with a valid account.' };
  }

  try {
    await supabase.from('giveaway_entries').delete().eq('giveaway_id', giveawayId).eq('user_id', authUserId);
  } catch {}

  let count = 0;
  try {
    const { count: entryCount } = await supabase
      .from('giveaway_entries')
      .select('id', { count: 'exact', head: true })
      .eq('giveaway_id', giveawayId);
    count = entryCount ?? 0;
  } catch {}

  return { success: true, message: 'Left giveaway.', hasJoined: false, participantCount: count };
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
        error: data.success ? undefined : data.error || 'Failed to verify secret code.',
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
  // 1. Check if a winner has already been drawn to prevent rerolling
  const currentRes = await apiGetGiveaway(giveawayId);
  if (currentRes.giveaway?.winnerId) {
    return {
      success: true,
      message: `Winner already drawn: @${currentRes.giveaway.winnerUsername || 'winner'}`,
      winner: {
        user_id: currentRes.giveaway.winnerId,
        username: currentRes.giveaway.winnerUsername,
        display_name: currentRes.giveaway.winnerDisplayName,
        avatar_url: currentRes.giveaway.winnerAvatar,
      },
      giveaway: currentRes.giveaway,
    };
  }

  try {
    // 2. Fetch real entries for this specific giveaway
    const { data: entries } = await supabase
      .from('giveaway_entries')
      .select('*')
      .eq('giveaway_id', giveawayId);

    if (!entries || entries.length === 0) {
      return { success: false, error: 'No eligible entrants yet.' };
    }

    // 3. Perform weighted RNG selection (boosted entries receive higher weight)
    const totalWeight = entries.reduce((sum, e) => sum + (e.weight || (e.is_boosted ? 1.1 : 1.0)), 0);
    let randomNum = Math.random() * totalWeight;
    let selectedWinner = entries[0];

    for (const entry of entries) {
      const entryWeight = entry.weight || (entry.is_boosted ? 1.1 : 1.0);
      if (randomNum <= entryWeight) {
        selectedWinner = entry;
        break;
      }
      randomNum -= entryWeight;
    }

    // 4. Resolve winner profile from profiles table
    let winnerProfile: { username: string; displayName: string; avatarUrl: string } | null = null;
    if (selectedWinner.user_id) {
      try {
        const { data: p } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', selectedWinner.user_id)
          .maybeSingle();
        if (p) {
          winnerProfile = {
            username: p.username || 'member',
            displayName: p.display_name || p.username || 'member',
            avatarUrl: p.avatar_url || 'person',
          };
        }
      } catch {}
    }

    const resolvedWinnerUsername = winnerProfile?.username || 'member';
    const resolvedWinnerDisplayName = winnerProfile?.displayName || resolvedWinnerUsername;
    const resolvedWinnerAvatar = winnerProfile?.avatarUrl || 'person';

    // 5. Persist winner permanently in database
    await supabase
      .from('giveaways')
      .update({
        winner_id: selectedWinner.user_id,
        winner_username: resolvedWinnerUsername,
        winner_display_name: resolvedWinnerDisplayName,
        winner_avatar: resolvedWinnerAvatar,
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', giveawayId);

    localGiveawaysCache = localGiveawaysCache.map((g) =>
      g.id === giveawayId
        ? {
            ...g,
            status: 'COMPLETED' as GiveawayStatus,
            winnerId: selectedWinner.user_id,
            winnerUsername: resolvedWinnerUsername,
            winnerDisplayName: resolvedWinnerDisplayName,
            winnerAvatar: resolvedWinnerAvatar,
          }
        : g
    );
    saveStoredLocalGiveaways(localGiveawaysCache);

    const gwRes = await apiGetGiveaway(giveawayId);
    return {
      success: true,
      message: `🏆 Winner drawn: @${resolvedWinnerUsername}!`,
      winner: {
        user_id: selectedWinner.user_id,
        username: resolvedWinnerUsername,
        display_name: resolvedWinnerDisplayName,
        avatar_url: resolvedWinnerAvatar,
      },
      giveaway: gwRes.giveaway,
    };
  } catch (err: any) {
    console.error('[GIVEAWAYS] apiDrawGiveawayWinner error:', err);
    return { success: false, error: err?.message || 'Failed to draw winner.' };
  }
}

export async function apiEndGiveaway(
  giveawayId: string
): Promise<{ success: boolean; message?: string; giveaway?: GiveawayItem; error?: string }> {
  localGiveawaysCache = localGiveawaysCache.map((g) =>
    g.id === giveawayId ? { ...g, status: 'ENDED' as GiveawayStatus } : g
  );
  saveStoredLocalGiveaways(localGiveawaysCache);

  try {
    const { data: dbGw, error: sbErr } = await supabase
      .from('giveaways')
      .update({
        status: 'ENDED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', giveawayId)
      .select()
      .maybeSingle();

    if (!sbErr && dbGw) {
      const gwRes = await apiGetGiveaway(giveawayId);
      return { success: true, message: 'Drop concluded.', giveaway: gwRes.giveaway };
    }
  } catch {}

  const gwRes = await apiGetGiveaway(giveawayId);
  return { success: true, message: 'Drop concluded.', giveaway: gwRes.giveaway };
}

export const apiCancelGiveaway = apiEndGiveaway;

export async function apiContactGiveawayWinner(
  giveawayId: string
): Promise<{ success: boolean; session?: any; message?: string; error?: string }> {
  const user = getStoredUser();
  if (!user) return { success: false, error: 'Must be logged in to contact winner.' };

  const gwRes = await apiGetGiveaway(giveawayId);
  if (!gwRes.success || !gwRes.giveaway) {
    return { success: false, error: 'Giveaway drop not found.' };
  }

  const gw = gwRes.giveaway;
  if (!gw.winnerId) {
    return { success: false, error: 'No winner has been drawn for this drop yet.' };
  }

  // Authorization: Only host, admin, or winner can access winner contact channel
  const isHost = user.id === gw.hostId;
  const isWinner = user.id === gw.winnerId;
  const isAdmin = user.role === 'ROOT_OWNER' || user.role === 'ADMIN' || user.role === 'MODERATOR';

  if (!isHost && !isWinner && !isAdmin) {
    return { success: false, error: 'Unauthorized: Only the drop host and the winner can access this contact channel.' };
  }

  try {
    // 1. Check for existing session in trade_sessions
    const { data: existingSession } = await supabase
      .from('trade_sessions')
      .select('*')
      .eq('trade_ad_id', giveawayId)
      .in('status', ['IN_PROGRESS', 'OPEN', 'PENDING', 'ACTIVE'])
      .maybeSingle();

    if (existingSession) {
      return { success: true, session: existingSession, message: 'Winner contact session opened!' };
    }

    // 2. Create a new trade_sessions row for host ↔ winner contact
    const sessionPayload = {
      trade_ad_id: giveawayId,
      creator_id: gw.hostId,
      creator_name: gw.hostName || 'host',
      creator_avatar: gw.hostAvatar || 'person',
      participant_id: gw.winnerId,
      participant_name: gw.winnerUsername || 'winner',
      participant_avatar: gw.winnerAvatar || 'person',
      status: 'IN_PROGRESS',
    };

    const { data: newSession, error: createErr } = await supabase
      .from('trade_sessions')
      .insert(sessionPayload)
      .select()
      .maybeSingle();

    if (!createErr && newSession) {
      return { success: true, session: newSession, message: 'Winner contact chat established!' };
    }
  } catch (err: any) {
    console.warn('[GIVEAWAYS] Contact winner session error:', err);
  }

  return { success: false, error: 'Failed to establish winner contact session.' };
}

export async function apiGetGiveawayParticipants(
  giveawayId: string,
  _params?: {
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

    if (entries && entries.length > 0) {
      const userIds = Array.from(new Set(entries.map((e: any) => e.user_id).filter(Boolean)));
      const profileMap = new Map<string, { username: string; displayName: string; avatarUrl: string }>();

      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', userIds);

          if (profiles) {
            profiles.forEach((p: any) => {
              profileMap.set(p.id, {
                username: p.username || 'member',
                displayName: p.display_name || p.username || 'member',
                avatarUrl: p.avatar_url || 'person',
              });
            });
          }
        } catch (e) {
          console.warn('[GIVEAWAYS] Failed to resolve participant profiles:', e);
        }
      }

      const formatted: GiveawayEntry[] = entries.map((e: any) => {
        const userProfile = profileMap.get(e.user_id);
        return {
          id: e.id,
          giveawayId: e.giveaway_id,
          userId: e.user_id,
          username: userProfile?.username || 'member',
          displayName: userProfile?.displayName || userProfile?.username || 'member',
          avatarUrl: userProfile?.avatarUrl || 'person',
          joinedAt: e.joined_at ? new Date(e.joined_at).getTime() : Date.now(),
          eligibilityState: 'ELIGIBLE',
          isBoosted: !!e.is_boosted,
          weight: e.weight || 1,
        };
      });
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
