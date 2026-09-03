import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

import { BLOX_FRUITS_DATA } from './src/data/fruits';

// Types
interface Fruit {
  id: string;
  name: string;
  rarity: string;
  beliPrice: number;
  marketValue: number;
  demand: number;
  trend: string;
  icon: string;
  type: string;
  description: string;
  hypeFactor: number;
  imageUrl?: string;
  image_url?: string;
  isPermanent?: boolean;
  isArchived?: boolean;
  archivedAt?: number;
  tradingNotes?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'UPCOMING' | 'REWORK_PENDING';
  sortOrder?: number;
  updatedAt?: number;
  updatedBy?: string;
}

export interface FruitAuditLog {
  id: string;
  fruitId: string;
  fruitName: string;
  action: 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'RESTORE' | 'DELETE' | 'BULK_UPDATE' | 'RESET_CATALOG';
  actorId: string;
  actorUsername: string;
  actorRole: UserRole;
  changesSummary: string;
  details?: Record<string, any>;
  timestamp: number;
}

export interface CatalogSettings {
  currencySymbol: string;
  baselineInflationMultiplier: number;
  autoRebalanceHype: boolean;
  demandScaleMax: number;
  allowCommunityValuationProposals: boolean;
  requireAdminApprovalForPriceChanges: boolean;
  updatedAt: number;
  updatedBy: string;
}

export interface AdminPanelBranding {
  panelName: string;
  shortTagline: string;
  logoIcon: string;
  accentTheme: 'amber' | 'crimson' | 'emerald' | 'cyan' | 'violet' | 'gold';
  footerText: string;
  navLabel: string;
  updatedAt: number;
  updatedBy: string;
}

export interface FruitCatalogStats {
  totalFruits: number;
  activeFruits: number;
  archivedFruits: number;
  totalEconomyValuation: number;
  rarityBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  avgDemand: number;
  risingCount: number;
  stableCount: number;
  fallingCount: number;
  lastUpdated: number;
}

type TradeAdStatus = 'ACTIVE' | 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
type TradeSessionStatus = 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED' | 'CLOSED';

type UserRole = 'ROOT_OWNER' | 'ADMIN' | 'MODERATOR' | 'APPROVED_CREATOR' | 'MEMBER';

type PermissionKey =
  | 'ACCESS_OWNER_PANEL'
  | 'ACCESS_ADMIN_PANEL'
  | 'ACCESS_MODERATION_PANEL'
  | 'ACCESS_CREATOR_PANEL'
  | 'ACCESS_CATALOG_ADMIN'
  | 'MANAGE_FRUITS'
  | 'ARCHIVE_FRUITS'
  | 'DELETE_FRUITS'
  | 'RESET_CATALOG'
  | 'MANAGE_ROLES'
  | 'ASSIGN_ADMIN'
  | 'ASSIGN_MODERATOR'
  | 'ASSIGN_CREATOR'
  | 'REVOKE_ROLES'
  | 'SEARCH_USER_BY_EMAIL'
  | 'VIEW_AUDIT_LOG'
  | 'MANAGE_USERS'
  | 'SUSPEND_USERS'
  | 'BAN_USERS'
  | 'MODERATE_PROFILES'
  | 'MODERATE_LIVE_TRADES'
  | 'MODERATE_GIVEAWAY_REPORTS'
  | 'CREATE_GIVEAWAY'
  | 'MANAGE_OWN_GIVEAWAY'
  | 'EDIT_ANY_GIVEAWAY'
  | 'CANCEL_ANY_GIVEAWAY'
  | 'MANAGE_CREATORS'
  | 'MANAGE_ALL_GIVEAWAYS'
  | 'MANAGE_SETTINGS';

const ROLE_WEIGHTS: Record<UserRole, number> = {
  ROOT_OWNER: 100,
  ADMIN: 80,
  MODERATOR: 60,
  APPROVED_CREATOR: 40,
  MEMBER: 20,
};

const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  ROOT_OWNER: [
    'ACCESS_OWNER_PANEL',
    'ACCESS_ADMIN_PANEL',
    'ACCESS_MODERATION_PANEL',
    'ACCESS_CREATOR_PANEL',
    'ACCESS_CATALOG_ADMIN',
    'MANAGE_FRUITS',
    'ARCHIVE_FRUITS',
    'DELETE_FRUITS',
    'RESET_CATALOG',
    'MANAGE_ROLES',
    'ASSIGN_ADMIN',
    'ASSIGN_MODERATOR',
    'ASSIGN_CREATOR',
    'REVOKE_ROLES',
    'SEARCH_USER_BY_EMAIL',
    'VIEW_AUDIT_LOG',
    'MANAGE_USERS',
    'SUSPEND_USERS',
    'BAN_USERS',
    'MODERATE_PROFILES',
    'MODERATE_LIVE_TRADES',
    'MODERATE_GIVEAWAY_REPORTS',
    'CREATE_GIVEAWAY',
    'MANAGE_OWN_GIVEAWAY',
    'EDIT_ANY_GIVEAWAY',
    'CANCEL_ANY_GIVEAWAY',
    'MANAGE_CREATORS',
    'MANAGE_ALL_GIVEAWAYS',
    'MANAGE_SETTINGS',
  ],
  ADMIN: [
    'ACCESS_ADMIN_PANEL',
    'ACCESS_MODERATION_PANEL',
    'ACCESS_CREATOR_PANEL',
    'ACCESS_CATALOG_ADMIN',
    'MANAGE_FRUITS',
    'ARCHIVE_FRUITS',
    'DELETE_FRUITS',
    'MANAGE_ROLES',
    'ASSIGN_MODERATOR',
    'ASSIGN_CREATOR',
    'REVOKE_ROLES',
    'SEARCH_USER_BY_EMAIL',
    'VIEW_AUDIT_LOG',
    'MANAGE_USERS',
    'SUSPEND_USERS',
    'MODERATE_PROFILES',
    'MODERATE_LIVE_TRADES',
    'MODERATE_GIVEAWAY_REPORTS',
    'CREATE_GIVEAWAY',
    'MANAGE_OWN_GIVEAWAY',
    'EDIT_ANY_GIVEAWAY',
    'CANCEL_ANY_GIVEAWAY',
    'MANAGE_CREATORS',
    'MANAGE_ALL_GIVEAWAYS',
    'MANAGE_SETTINGS',
  ],
  MODERATOR: [
    'ACCESS_MODERATION_PANEL',
    'ACCESS_CATALOG_ADMIN',
    'MANAGE_FRUITS',
    'ARCHIVE_FRUITS',
    'MODERATE_PROFILES',
    'MODERATE_LIVE_TRADES',
    'MODERATE_GIVEAWAY_REPORTS',
    'SUSPEND_USERS',
  ],
  APPROVED_CREATOR: [
    'ACCESS_CREATOR_PANEL',
    'CREATE_GIVEAWAY',
    'MANAGE_OWN_GIVEAWAY',
  ],
  MEMBER: [],
};

interface PlatformSettings {
  maintenanceMode: boolean;
  giveawaysEnabled: boolean;
  maxActiveGiveawaysPerCreator: number;
  minAccountAgeDaysForGiveaway: number;
  tradeAdExpirationHours: number;
  autoFlagReportsThreshold: number;
  allowDirectParticipantSearch: boolean;
  updatedAt: number;
  updatedBy: string;
}

interface AdminCreatorItem {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  status: string;
  isGiveawaySuspended: boolean;
  giveawaysHosted: number;
  activeGiveaways: number;
  totalParticipants: number;
  createdAt: number;
  roleAssignedAt?: number;
  roleAssignedBy?: string;
}

interface UnifiedAuditLog {
  id: string;
  type: 'ROLE' | 'MODERATION';
  actorId: string;
  actorUsername: string;
  actorRole: UserRole;
  targetId: string;
  targetName: string;
  targetEmail?: string;
  action: string;
  reason: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

const ROOT_OWNER_EMAILS = new Set([
  'owner@valuenet.gg',
  'techbrothers394@gmail.com',
  'dmg73364@gmail.com',
  ...(process.env.ROOT_OWNER_EMAIL ? [process.env.ROOT_OWNER_EMAIL.trim().toLowerCase()] : [])
]);
const ROOT_OWNER_EMAIL = (process.env.ROOT_OWNER_EMAIL || 'techbrothers394@gmail.com').trim().toLowerCase();
const ROOT_OWNER_INITIAL_PASSWORD = process.env.ROOT_OWNER_PASSWORD || 'RootOwner123!';


function sanitizeString(str: any): string {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

function isRootOwner(user: UserRecord | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'ROOT_OWNER' || ROOT_OWNER_EMAILS.has(user.normalizedEmail || (user.email || '').trim().toLowerCase());
}

function hasPermission(user: UserRecord | null | undefined, permission: PermissionKey): boolean {
  if (!user) return false;
  if (isRootOwner(user)) return true;
  const role = user.role;
  if (!role || !ROLE_PERMISSIONS[role]) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

interface RoleAuditLog {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: UserRole;
  targetId: string;
  targetUsername: string;
  targetEmail: string;
  previousRole: UserRole;
  newRole: UserRole;
  action: 'ROLE_ASSIGNED' | 'ROLE_REVOKED' | 'ROLE_INITIALIZED';
  reason: string;
  timestamp: number;
}

interface ModerationAuditLog {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: UserRole;
  targetId: string;
  targetName: string;
  action: 'USER_SUSPENDED' | 'USER_UNSUSPENDED' | 'GIVEAWAY_MODERATED' | 'GIVEAWAY_CANCELLED' | 'TRADE_REMOVED' | 'REPORT_ACTIONED' | 'REPORT_DISMISSED';
  reason: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

interface UserRecord {
  id: string;
  username: string;
  normalizedUsername: string;
  displayName: string;
  email: string;
  normalizedEmail: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  isSuspended?: boolean;
  suspendedReason?: string;
  suspendedAt?: number;
  suspendedBy?: string;
  isGiveawaySuspended?: boolean;
  roleAssignedAt?: number;
  roleAssignedBy?: string;
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  status: 'TRADING' | 'LOOKING FOR OFFERS' | 'GRINDING' | 'AWAY' | 'ONLINE' | 'BUSY' | 'CUSTOM';
  customStatus?: string;
  titleId: string;
  favoriteFruitId?: string | null;
  tradingStyle: 'Fair Trades' | 'W Trades' | 'Collector' | 'Fruit Hunter' | 'Value Trader' | 'Flexible';
  lookingFor: string[];
  notInterestedIn: string[];
  profileTheme: 'midnight' | 'violet' | 'gold' | 'ocean' | 'crimson' | 'void';
  showProfile: boolean;
  showPreferences: boolean;
  showActivity: boolean;
  showTradeStats: boolean;
  server: string;
  badges: string[];
  createdAt: number;
  updatedAt: number;
}

// Giveaway Models
type GiveawayStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'DRAWING' | 'COMPLETED' | 'CANCELLED';

interface GiveawayPrize {
  id: string;
  fruitId: string;
  quantity: number;
  name: string;
  rarity: string;
  icon: string;
  marketValue: number;
  beliPrice: number;
  type: string;
}

interface GiveawayRule {
  id: string;
  ruleType: 'account_required' | 'single_entry' | 'follow_host' | 'subscribe_host' | 'join_community' | 'available_on_contact' | 'no_alts' | 'custom';
  ruleText: string;
  sortOrder: number;
}

interface GiveawayEligibility {
  minAccountAgeDays?: number;
  minTrades?: number;
  verifiedAccountRequired?: boolean;
}

interface GiveawayItem {
  id: string;
  hostId: string;
  hostName: string;
  hostDisplayName: string;
  hostAvatar: string;
  hostTitle?: string;
  hostRole: UserRole;
  hostBadges?: string[];
  title: string;
  description: string;
  prizes: GiveawayPrize[];
  rules: GiveawayRule[];
  eligibility: GiveawayEligibility;
  status: GiveawayStatus;
  startsAt: number;
  endsAt: number;
  maxParticipants?: number | null;
  participantCount: number;
  allowLeave: boolean;
  createdAt: number;
  updatedAt: number;
  winnerId?: string;
  winnerUsername?: string;
  winnerDisplayName?: string;
  winnerAvatar?: string;
  completedAt?: number;
  reportCount?: number;
  // YouTube Code Boost fields
  youtubeBoostEnabled?: boolean;
  youtubeVideoId?: string;
  youtubeBoostPercentage?: number;
  youtubeCodeHash?: string;
  youtubeCodeSalt?: string;
  youtubeRedemptionCount?: number;
  hasUserBoosted?: boolean;
  userWinProbability?: number;
}

interface GiveawayEntry {
  id: string;
  giveawayId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: number;
  eligibilityState: 'ELIGIBLE' | 'FLAGGED';
  // YouTube Code Boost fields
  hasYoutubeBoost?: boolean;
  isBoosted?: boolean;
  boostPercentage?: number;
  boostRedeemedAt?: number;
  ticketWeight?: number;
  winProbability?: number;
}

interface GiveawayReport {
  id: string;
  giveawayId: string;
  giveawayTitle: string;
  hostId: string;
  hostName: string;
  reporterId: string;
  reporterName: string;
  reason: 'misleading' | 'inappropriate' | 'suspicious' | 'incorrect_prize' | 'other';
  notes?: string;
  status: 'PENDING' | 'DISMISSED' | 'ACTIONED';
  createdAt: number;
}

interface TradeAd {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  server: string;
  offeredFruits: Fruit[];
  requestedFruits: Fruit[];
  offeredTotalValue: number;
  requestedTotalValue: number;
  note?: string;
  status: TradeAdStatus;
  createdAt: number;
  updatedAt: number;
  acceptedBy?: string;
  acceptedByName?: string;
  sessionId?: string;
  verdict: 'WIN' | 'FAIR' | 'LOSS';
}

interface TradeSession {
  id: string;
  tradeId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  tradeAd: TradeAd;
  creatorConfirmed: boolean;
  participantConfirmed: boolean;
  status: TradeSessionStatus;
  createdAt: number;
  closedAt?: number;
  rejectionReason?: string;
}

interface TradeMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: number;
  type?: 'chat' | 'system';
}

interface TradeNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'acceptance' | 'confirmed' | 'rejected' | 'cancelled' | 'system' | 'giveaway_won' | 'giveaway_ended';
  tradeId?: string;
  sessionId?: string;
  giveawayId?: string;
  createdAt: number;
  read: boolean;
}

type TrustLevel =
  | 'UNRANKED'
  | 'NOVICE'
  | 'ESTABLISHED'
  | 'TRUSTED'
  | 'MASTER_TRADER'
  | 'APEX_TRADER';

interface TradeReview {
  id: string;
  tradeSessionId: string;
  tradeId: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatar: string;
  toUserId: string;
  rating: number; // 1 to 5
  praiseTags: string[];
  feedback?: string;
  weight: number; // Diminishing return weight
  createdAt: number;
}

interface TradeDispute {
  id: string;
  tradeSessionId: string;
  tradeId: string;
  reporterId: string;
  reporterUsername: string;
  targetUserId: string;
  targetUsername: string;
  reason: string;
  details: string;
  status: 'PENDING' | 'RESOLVED_VALID' | 'RESOLVED_DISMISSED';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  penaltyApplied?: number;
}

interface ReputationAuditLog {
  id: string;
  userId: string;
  username: string;
  action:
    | 'TRADE_COMPLETED'
    | 'REVIEW_RECEIVED'
    | 'DISPUTE_FILED'
    | 'DISPUTE_PENALTY'
    | 'ADMIN_ADJUSTMENT'
    | 'VELOCITY_PENALTY';
  change: number;
  previousScore: number;
  newScore: number;
  reason: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// Sample Fruit Catalog for Initial Seed
const SEED_FRUITS: Record<string, Fruit> = {
  kitsune: {
    id: 'kitsune',
    name: 'Kitsune',
    rarity: 'Mythical',
    beliPrice: 8000000,
    marketValue: 125000000,
    demand: 10,
    trend: 'Rising',
    icon: 'flare',
    type: 'Beast',
    description: 'Fox transformation with speed and azure flames.',
    hypeFactor: 10,
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon (Physical)',
    rarity: 'Mythical',
    beliPrice: 3500000,
    marketValue: 90000000,
    demand: 10,
    trend: 'Rising',
    icon: 'local_fire_department',
    type: 'Beast',
    description: 'Sky emperor dragon with massive impending rework value.',
    hypeFactor: 10,
  },
  leopard: {
    id: 'leopard',
    name: 'Leopard',
    rarity: 'Mythical',
    beliPrice: 5000000,
    marketValue: 40000000,
    demand: 9,
    trend: 'Stable',
    icon: 'pets',
    type: 'Beast',
    description: 'Hyper-speed beast form with high physical DPS combo strings.',
    hypeFactor: 8,
  },
  dough: {
    id: 'dough',
    name: 'Dough',
    rarity: 'Mythical',
    beliPrice: 2800000,
    marketValue: 25000000,
    demand: 9,
    trend: 'Stable',
    icon: 'cookie',
    type: 'Elemental',
    description: 'Awakened roller combo machine with extreme stun priority.',
    hypeFactor: 9,
  },
  buddha: {
    id: 'buddha',
    name: 'Buddha',
    rarity: 'Legendary',
    beliPrice: 1200000,
    marketValue: 8000000,
    demand: 10,
    trend: 'Stable',
    icon: 'person_shield',
    type: 'Beast',
    description: 'Giant hitbox with 50% damage reduction. King of grinding and raids.',
    hypeFactor: 9,
  },
  portal: {
    id: 'portal',
    name: 'Portal',
    rarity: 'Legendary',
    beliPrice: 1900000,
    marketValue: 6500000,
    demand: 9,
    trend: 'Rising',
    icon: 'radio_button_checked',
    type: 'Natural',
    description: 'World teleportation and dimensional rift trapping.',
    hypeFactor: 9,
  },
  'dark-blade': {
    id: 'dark-blade',
    name: 'Dark Blade (Yoru)',
    rarity: 'Gamepass',
    beliPrice: 0,
    marketValue: 55000000,
    demand: 9,
    trend: 'Stable',
    icon: 'sword',
    type: 'Gamepass',
    description: '1,200 Robux legendary sword.',
    hypeFactor: 8,
  },
  'fruit-notifier': {
    id: 'fruit-notifier',
    name: 'Fruit Notifier',
    rarity: 'Gamepass',
    beliPrice: 0,
    marketValue: 165000000,
    demand: 10,
    trend: 'Rising',
    icon: 'radar',
    type: 'Gamepass',
    description: '2,700 Robux server fruit radar tracker.',
    hypeFactor: 10,
  },
  trex: {
    id: 't-rex',
    name: 'T-Rex',
    rarity: 'Mythical',
    beliPrice: 2700000,
    marketValue: 20000000,
    demand: 8,
    trend: 'Stable',
    icon: 'cruelty_free',
    type: 'Beast',
    description: 'Ferocious prehistoric beast with armor-shredding tail whip.',
    hypeFactor: 8,
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard Berry',
    rarity: 'Legendary',
    beliPrice: 2400000,
    marketValue: 5000000,
    demand: 7,
    trend: 'Stable',
    icon: 'ac_unit',
    type: 'Elemental',
    description: 'Sub-zero domain whirlwind with continuous blizzard ticks.',
    hypeFactor: 7,
  },
  magma: {
    id: 'magma',
    name: 'Magma Melon',
    rarity: 'Rare',
    beliPrice: 850000,
    marketValue: 2000000,
    demand: 8,
    trend: 'Stable',
    icon: 'volcano',
    type: 'Elemental',
    description: 'Highest DPS fruit in the entire game when awakened.',
    hypeFactor: 8,
  },
};

// Authoritative In-Memory Store
const users = new Map<string, UserRecord>();
const authSessions = new Map<string, { userId: string; token: string; createdAt: number }>();
const passwordResetCodes = new Map<string, { email: string; code: string; expiresAt: number }>();

const roleAuditLogs: RoleAuditLog[] = [];
const moderationAuditLogs: ModerationAuditLog[] = [];

// Fruit Catalog Store & Settings
const fruitsMap = new Map<string, Fruit>();
const fruitAuditLogs: FruitAuditLog[] = [];

let catalogSettings: CatalogSettings = {
  currencySymbol: '¢',
  baselineInflationMultiplier: 1.0,
  autoRebalanceHype: true,
  demandScaleMax: 10,
  allowCommunityValuationProposals: false,
  requireAdminApprovalForPriceChanges: false,
  updatedAt: Date.now(),
  updatedBy: 'SYSTEM',
};

let adminPanelBranding: AdminPanelBranding = {
  panelName: 'FRUIT CATALOG ADMIN',
  shortTagline: 'Authoritative Blox Fruits Valuation & Liquidity Management',
  logoIcon: 'database',
  accentTheme: 'amber',
  footerText: 'VALUE.NET SECURE OPERATIONAL TERMINAL • ALL CATALOG MUTATIONS ARE AUDITED',
  navLabel: 'CATALOG ADMIN',
  updatedAt: Date.now(),
  updatedBy: 'SYSTEM',
};

function computeFruitStats(): FruitCatalogStats {
  const all = Array.from(fruitsMap.values());
  const active = all.filter((f) => !f.isArchived);
  const archived = all.filter((f) => f.isArchived);

  let totalValuation = 0;
  let totalDemand = 0;
  let rising = 0;
  let stable = 0;
  let falling = 0;

  const rarityBreakdown: Record<string, number> = {
    Mythical: 0,
    Legendary: 0,
    Rare: 0,
    Uncommon: 0,
    Common: 0,
    Gamepass: 0,
  };

  const typeBreakdown: Record<string, number> = {
    Beast: 0,
    Elemental: 0,
    Natural: 0,
    Gamepass: 0,
  };

  for (const f of active) {
    totalValuation += f.marketValue || 0;
    totalDemand += f.demand || 0;
    if (f.trend === 'Rising') rising++;
    else if (f.trend === 'Falling') falling++;
    else stable++;

    if (rarityBreakdown[f.rarity] !== undefined) rarityBreakdown[f.rarity]++;
    if (typeBreakdown[f.type] !== undefined) typeBreakdown[f.type]++;
  }

  return {
    totalFruits: all.length,
    activeFruits: active.length,
    archivedFruits: archived.length,
    totalEconomyValuation: totalValuation,
    rarityBreakdown,
    typeBreakdown,
    avgDemand: active.length > 0 ? Number((totalDemand / active.length).toFixed(1)) : 0,
    risingCount: rising,
    stableCount: stable,
    fallingCount: falling,
    lastUpdated: Date.now(),
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FRUITS_DB_FILE = path.join(DATA_DIR, 'fruit_catalog_db.json');

function saveFruitCatalogToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      fruits: Array.from(fruitsMap.values()),
      settings: catalogSettings,
      branding: adminPanelBranding,
      auditLogs: fruitAuditLogs.slice(0, 500),
      savedAt: Date.now(),
    };
    fs.writeFileSync(FRUITS_DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save fruit catalog to disk:', err);
  }
}

function loadFruitCatalogFromDisk(): boolean {
  try {
    if (fs.existsSync(FRUITS_DB_FILE)) {
      const content = fs.readFileSync(FRUITS_DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && Array.isArray(data.fruits) && data.fruits.length > 0) {
        fruitsMap.clear();
        for (const f of data.fruits) {
          fruitsMap.set(f.id, f);
        }
        if (data.settings) catalogSettings = { ...catalogSettings, ...data.settings };
        if (data.branding) adminPanelBranding = { ...adminPanelBranding, ...data.branding };
        if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
          fruitAuditLogs.length = 0;
          fruitAuditLogs.push(...data.auditLogs);
        }
        return true;
      }
    }
  } catch (err) {
    console.warn('Could not load fruit catalog from disk, will seed default baseline:', err);
  }
  return false;
}

function seedInitialFruits() {
  for (let i = 0; i < BLOX_FRUITS_DATA.length; i++) {
    const f = BLOX_FRUITS_DATA[i];
    fruitsMap.set(f.id, {
      ...f,
      isArchived: false,
      status: 'ACTIVE',
      sortOrder: i + 1,
      updatedAt: Date.now() - 86400000 * 7,
      updatedBy: 'SYSTEM',
    });
  }

  fruitAuditLogs.push({
    id: 'faudit-init-001',
    fruitId: 'kitsune',
    fruitName: 'Kitsune',
    action: 'CREATE',
    actorId: 'system',
    actorUsername: 'SYSTEM',
    actorRole: 'ROOT_OWNER',
    changesSummary: 'Initial Blox Fruits catalog ingestion and valuation baseline set',
    details: { marketValue: 125000000, demand: 10, trend: 'Rising' },
    timestamp: Date.now() - 86400000 * 30,
  });
  fruitAuditLogs.push({
    id: 'faudit-init-002',
    fruitId: 'dragon',
    fruitName: 'Dragon (Physical)',
    action: 'UPDATE',
    actorId: 'user_root_owner',
    actorUsername: 'RootOwner',
    actorRole: 'ROOT_OWNER',
    changesSummary: 'Updated marketValue from 85,000,000 to 90,000,000 (+5.8%) due to upcoming Dragon Rework speculation',
    details: { field: 'marketValue', oldValue: 85000000, newValue: 90000000 },
    timestamp: Date.now() - 86400000 * 5,
  });

  saveFruitCatalogToDisk();
}

if (!loadFruitCatalogFromDisk()) {
  seedInitialFruits();
}

const tradeAds = new Map<string, TradeAd>();
const tradeSessions = new Map<string, TradeSession>();
const sessionMessages = new Map<string, TradeMessage[]>();
const userNotifications = new Map<string, TradeNotification[]>();

const tradeReviews = new Map<string, TradeReview>();
const tradeDisputes = new Map<string, TradeDispute>();
const reputationAuditLogs: ReputationAuditLog[] = [];
const reputationAdjustments = new Map<string, number>();

const giveaways = new Map<string, GiveawayItem>();
const giveawayEntries = new Map<string, Map<string, GiveawayEntry>>();
const giveawayReports = new Map<string, GiveawayReport>();

// Monetization & Advertising State
interface MonetizationConfigServer {
  enabled: boolean;
  provider: 'display_network' | 'direct_sponsor' | 'house_ad' | 'none';
  density: 'conservative' | 'balanced' | 'elevated';
  enableMobileAds: boolean;
  enableCreatorPromotions: boolean;
  placements: {
    home_top: boolean;
    home_between_sections: boolean;
    trading_sidebar: boolean;
    trading_in_feed: boolean;
    marketplace_native: boolean;
    giveaway_banner: boolean;
    footer_banner: boolean;
  };
  displayNetwork: {
    clientScriptUrl?: string;
    clientPubId?: string;
    slotIds?: Record<string, string>;
    sandboxMode?: boolean;
  };
  directSponsors: Array<{
    id: string;
    sponsorName: string;
    tagline: string;
    description: string;
    targetUrl: string;
    imageUrl?: string;
    tier: 'COMMUNITY_SPONSOR' | 'FEATURED_SPONSOR' | 'EVENT_SPONSOR' | 'PARTNER';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'EXPIRED';
    placements: string[];
    startDate?: number;
    endDate?: number;
    category?: string;
    clicks?: number;
    impressions?: number;
    createdAt: number;
    updatedAt: number;
  }>;
  creatorPromotions: Array<{
    id: string;
    creatorId: string;
    creatorUsername: string;
    promoType: 'YOUTUBE' | 'DISCORD' | 'EVENT' | 'TRADING_LOBBY';
    title: string;
    description: string;
    targetUrl: string;
    badgeText?: string;
    status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
    createdAt: number;
  }>;
  updatedAt: number;
  updatedBy: string;
}

interface SponsorshipInquiryServer {
  id: string;
  companyOrCommunity: string;
  contactEmail: string;
  websiteUrl: string;
  campaignTier: 'COMMUNITY_SPONSOR' | 'FEATURED_SPONSOR' | 'EVENT_SPONSOR' | 'PARTNER';
  message: string;
  budgetRange?: string;
  status: 'UNREAD' | 'CONTACTED' | 'APPROVED' | 'ARCHIVED';
  createdAt: number;
  ipHash?: string;
}

const MONETIZATION_DB_FILE = path.join(DATA_DIR, 'monetization_db.json');

let monetizationConfig: MonetizationConfigServer = {
  enabled: true,
  provider: 'house_ad',
  density: 'balanced',
  enableMobileAds: false,
  enableCreatorPromotions: true,
  placements: {
    home_top: true,
    home_between_sections: true,
    trading_sidebar: true,
    trading_in_feed: true,
    marketplace_native: true,
    giveaway_banner: true,
    footer_banner: true,
  },
  displayNetwork: {
    sandboxMode: true,
  },
  directSponsors: [
    {
      id: 'sponsor-apex-fruits',
      sponsorName: 'Apex Blox Fruit Academy',
      tagline: 'Master PvP Combos & Awakened Raids',
      description: 'Join 50,000+ Blox Fruits duelists in competitive tournaments and raid carry squads.',
      targetUrl: 'https://discord.gg/valuenet',
      tier: 'FEATURED_SPONSOR',
      status: 'APPROVED',
      placements: ['home_top', 'trading_sidebar', 'marketplace_native'],
      category: 'Community Clan',
      clicks: 0,
      impressions: 0,
      createdAt: Date.now() - 86400000 * 7,
      updatedAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'sponsor-cloud-nodes',
      sponsorName: 'Titan Game Servers',
      tagline: 'Ultra Low Latency Private Roblox Hosting',
      description: 'Dedicated 10Gbps gaming servers with anti-DDoS protection for serious grinding sessions.',
      targetUrl: 'https://valuenet.gg',
      tier: 'PARTNER',
      status: 'APPROVED',
      placements: ['home_between_sections', 'trading_in_feed', 'footer_banner'],
      category: 'Server Infrastructure',
      clicks: 0,
      impressions: 0,
      createdAt: Date.now() - 86400000 * 14,
      updatedAt: Date.now() - 86400000 * 14,
    },
  ],
  creatorPromotions: [
    {
      id: 'promo-vortex',
      creatorId: 'trader_vortex',
      creatorUsername: 'Vortex_Samurai',
      promoType: 'YOUTUBE',
      title: 'Vortex Samurai Official Channel',
      description: 'Watch daily live high-tier Blox Fruits trading, PvP breakdowns, and secret code drops.',
      targetUrl: 'https://youtube.com',
      badgeText: 'Live Streamer',
      status: 'ACTIVE',
      createdAt: Date.now() - 86400000 * 5,
    },
  ],
  updatedAt: Date.now(),
  updatedBy: 'SYSTEM',
};

const sponsorshipInquiries: SponsorshipInquiryServer[] = [];
const inquiryRateLimitMap = new Map<string, number[]>();

function saveMonetizationToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      config: monetizationConfig,
      inquiries: sponsorshipInquiries.slice(0, 500),
      savedAt: Date.now(),
    };
    fs.writeFileSync(MONETIZATION_DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save monetization config to disk:', err);
  }
}

function loadMonetizationFromDisk(): boolean {
  try {
    if (fs.existsSync(MONETIZATION_DB_FILE)) {
      const content = fs.readFileSync(MONETIZATION_DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && data.config) {
        monetizationConfig = { ...monetizationConfig, ...data.config };
        if (Array.isArray(data.inquiries)) {
          sponsorshipInquiries.length = 0;
          sponsorshipInquiries.push(...data.inquiries);
        }
        return true;
      }
    }
  } catch (err) {
    console.warn('Could not load monetization config from disk:', err);
  }
  return false;
}

loadMonetizationFromDisk();

// Password Hashing Helper
function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// YouTube Giveaway Code Boost Security & Validation Helpers
function hashGiveawaySecretCode(code: string, salt: string): string {
  const normalized = code.trim().toLowerCase();
  return crypto.createHmac('sha256', salt).update(normalized).digest('hex');
}

function extractYoutubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function sanitizeGiveawayForClient(gw: GiveawayItem, authUser?: UserRecord | null): GiveawayItem {
  const entryMap = giveawayEntries.get(gw.id);
  const userEntry = authUser && entryMap ? entryMap.get(authUser.id) : undefined;
  const hasJoined = !!userEntry;
  const hasUserBoosted = !!userEntry?.hasYoutubeBoost;
  const isHost = authUser ? authUser.id === gw.hostId : false;

  let youtubeRedemptionCount = 0;
  let totalWeight = 0;
  let userWeight = 0;

  if (entryMap) {
    for (const entry of entryMap.values()) {
      if (entry.eligibilityState === 'ELIGIBLE') {
        const weight = entry.hasYoutubeBoost
          ? 1.0 + ((entry.boostPercentage || gw.youtubeBoostPercentage || 10) / 100)
          : 1.0;
        totalWeight += weight;
        if (entry.hasYoutubeBoost) {
          youtubeRedemptionCount++;
        }
        if (authUser && entry.userId === authUser.id) {
          userWeight = weight;
        }
      }
    }
  }

  const userWinProbability =
    totalWeight > 0 && userWeight > 0
      ? Number(((userWeight / totalWeight) * 100).toFixed(2))
      : 0;

  const clientGw: any = { ...gw };
  // CRITICAL SECURITY: Never expose plaintext or hashed secret code or salt to client
  delete clientGw.youtubeCodeHash;
  delete clientGw.youtubeCodeSalt;

  return {
    ...clientGw,
    hasJoined,
    isHost,
    hasUserBoosted,
    userWinProbability,
    youtubeRedemptionCount,
    participantCount: entryMap ? entryMap.size : gw.participantCount,
  };
}

// Seed Initial Users
function seedInitialUsers() {
  const seedList: Omit<UserRecord, 'passwordHash' | 'salt'>[] = [
    {
      id: 'user_root_owner',
      username: 'RootOwner',
      normalizedUsername: 'rootowner',
      displayName: 'VALUE.NET Owner',
      email: ROOT_OWNER_EMAIL,
      normalizedEmail: ROOT_OWNER_EMAIL,
      role: 'ROOT_OWNER',
      isSuspended: false,
      isGiveawaySuspended: false,
      avatarUrl: 'crown',
      bannerUrl: 'midnight',
      bio: 'Platform Owner & Primary Administrator of VALUE.NET.',
      status: 'ONLINE',
      titleId: 'dragon_emperor',
      favoriteFruitId: 'dragon',
      tradingStyle: 'Flexible',
      lookingFor: ['kitsune', 'dragon'],
      notInterestedIn: [],
      profileTheme: 'midnight',
      showProfile: true,
      showPreferences: true,
      showActivity: true,
      showTradeStats: true,
      server: 'US-EAST #001',
      badges: ['community_member', 'early_trader', 'mythical_collector', 'value_expert', 'verified_trader', 'master_negotiator'],
      createdAt: Date.now() - 86400000 * 120,
      updatedAt: Date.now(),
    },
    {
      id: 'trader_vortex',
      username: 'Vortex_Samurai',
      normalizedUsername: 'vortex_samurai',
      displayName: 'Vortex Samurai',
      email: 'vortex@valuenet.gg',
      normalizedEmail: 'vortex@valuenet.gg',
      role: 'APPROVED_CREATOR',
      isGiveawaySuspended: false,
      avatarUrl: 'swords',
      bannerUrl: 'midnight',
      bio: 'Speed duels & high-tier fruit trades. Top trader at Cafe tables.',
      status: 'TRADING',
      titleId: 'elite_trader',
      favoriteFruitId: 'dough',
      tradingStyle: 'W Trades',
      lookingFor: ['leopard', 'dragon'],
      notInterestedIn: ['spin', 'bomb'],
      profileTheme: 'midnight',
      showProfile: true,
      showPreferences: true,
      showActivity: true,
      showTradeStats: true,
      server: 'US-EAST #412',
      badges: ['community_member', 'early_trader', 'verified_trader', 'trade_scout', 'master_negotiator'],
      createdAt: Date.now() - 86400000 * 45,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'trader_kai',
      username: 'GrandMaster_Kai',
      normalizedUsername: 'grandmaster_kai',
      displayName: 'GrandMaster Kai',
      email: 'kai@valuenet.gg',
      normalizedEmail: 'kai@valuenet.gg',
      role: 'APPROVED_CREATOR',
      isGiveawaySuspended: false,
      avatarUrl: 'shield_person',
      bannerUrl: 'violet',
      bio: 'Dragon rework investor & permanent item collector. Serious fair offers only.',
      status: 'LOOKING FOR OFFERS',
      titleId: 'value_expert',
      favoriteFruitId: 'kitsune',
      tradingStyle: 'Collector',
      lookingFor: ['dragon', 'dark-blade'],
      notInterestedIn: [],
      profileTheme: 'violet',
      showProfile: true,
      showPreferences: true,
      showActivity: true,
      showTradeStats: true,
      server: 'EU-CENTRAL #09',
      badges: ['community_member', 'early_trader', 'mythical_collector', 'value_expert'],
      createdAt: Date.now() - 86400000 * 60,
      updatedAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'trader_ghost',
      username: 'Riptide_Ghost',
      normalizedUsername: 'riptide_ghost',
      displayName: 'Riptide Ghost',
      email: 'ghost@valuenet.gg',
      normalizedEmail: 'ghost@valuenet.gg',
      role: 'MODERATOR',
      isGiveawaySuspended: false,
      avatarUrl: 'skull',
      bannerUrl: 'ocean',
      bio: 'Community moderation & second sea fair trader. Terminal monitor.',
      status: 'ONLINE',
      titleId: 'trade_scout',
      favoriteFruitId: 'portal',
      tradingStyle: 'Fair Trades',
      lookingFor: ['buddha', 'magma'],
      notInterestedIn: [],
      profileTheme: 'ocean',
      showProfile: true,
      showPreferences: true,
      showActivity: true,
      showTradeStats: true,
      server: 'ASIA-EAST #88',
      badges: ['community_member', 'early_trader', 'trade_scout'],
      createdAt: Date.now() - 86400000 * 25,
      updatedAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'trader_shadow',
      username: 'ShadowHunter_99',
      normalizedUsername: 'shadowhunter_99',
      displayName: 'Shadow Hunter',
      email: 'shadow@valuenet.gg',
      normalizedEmail: 'shadow@valuenet.gg',
      role: 'MEMBER',
      isGiveawaySuspended: false,
      avatarUrl: 'visibility',
      bannerUrl: 'crimson',
      bio: 'PvP combo specialist searching for meta fruits. W trades preferred.',
      status: 'GRINDING',
      titleId: 'value_hunter',
      favoriteFruitId: 't-rex',
      tradingStyle: 'Value Trader',
      lookingFor: ['dough'],
      notInterestedIn: [],
      profileTheme: 'crimson',
      showProfile: true,
      showPreferences: true,
      showActivity: true,
      showTradeStats: true,
      server: 'US-WEST #201',
      badges: ['community_member', 'early_trader'],
      createdAt: Date.now() - 86400000 * 15,
      updatedAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'trader_pirate',
      username: 'PirateKing_77',
      normalizedUsername: 'pirateking_77',
      displayName: 'Pirate King',
      email: 'pirateking@valuenet.gg',
      normalizedEmail: 'pirateking@valuenet.gg',
      role: 'ADMIN',
      isGiveawaySuspended: false,
      avatarUrl: 'local_fire_department',
      bannerUrl: 'gold',
      bio: 'King of the Pirates. Trading mythical fruits across all seas.',
      status: 'TRADING',
      titleId: 'dragon_emperor',
      favoriteFruitId: 'dragon',
      tradingStyle: 'Flexible',
      lookingFor: ['kitsune', 'fruit-notifier'],
      notInterestedIn: [],
      profileTheme: 'gold',
      showProfile: true,
      showPreferences: true,
      showActivity: true,
      showTradeStats: true,
      server: 'US-EAST #412',
      badges: ['community_member', 'early_trader', 'mythical_collector', 'verified_trader'],
      createdAt: Date.now() - 86400000 * 90,
      updatedAt: Date.now() - 86400000 * 1,
    },
  ];

  for (const item of seedList) {
    const salt = crypto.randomBytes(16).toString('hex');
    const rawPassword = item.id === 'user_root_owner' ? ROOT_OWNER_INITIAL_PASSWORD : 'Password123';
    const passwordHash = hashPassword(rawPassword, salt);
    users.set(item.id, {
      ...item,
      salt,
      passwordHash,
    });
  }

  // Initialize initial role audit entry
  roleAuditLogs.push({
    id: 'audit-init-001',
    actorId: 'system',
    actorUsername: 'SYSTEM',
    actorRole: 'ROOT_OWNER',
    targetId: 'user_root_owner',
    targetUsername: 'RootOwner',
    targetEmail: ROOT_OWNER_EMAIL,
    previousRole: 'MEMBER',
    newRole: 'ROOT_OWNER',
    action: 'ROLE_INITIALIZED',
    reason: 'Permanent platform root ownership bound to configured owner email',
    timestamp: Date.now() - 86400000 * 120,
  });
  roleAuditLogs.push({
    id: 'audit-init-002',
    actorId: 'user_root_owner',
    actorUsername: 'RootOwner',
    actorRole: 'ROOT_OWNER',
    targetId: 'trader_pirate',
    targetUsername: 'PirateKing_77',
    targetEmail: 'pirateking@valuenet.gg',
    previousRole: 'MEMBER',
    newRole: 'ADMIN',
    action: 'ROLE_ASSIGNED',
    reason: 'System administration delegation by platform owner',
    timestamp: Date.now() - 86400000 * 90,
  });
  roleAuditLogs.push({
    id: 'audit-init-003',
    actorId: 'trader_pirate',
    actorUsername: 'PirateKing_77',
    actorRole: 'ADMIN',
    targetId: 'trader_ghost',
    targetUsername: 'Riptide_Ghost',
    targetEmail: 'ghost@valuenet.gg',
    previousRole: 'MEMBER',
    newRole: 'MODERATOR',
    action: 'ROLE_ASSIGNED',
    reason: 'Community moderation appointment',
    timestamp: Date.now() - 86400000 * 25,
  });
  roleAuditLogs.push({
    id: 'audit-init-004',
    actorId: 'trader_pirate',
    actorUsername: 'PirateKing_77',
    actorRole: 'ADMIN',
    targetId: 'trader_vortex',
    targetUsername: 'Vortex_Samurai',
    targetEmail: 'vortex@valuenet.gg',
    previousRole: 'MEMBER',
    newRole: 'APPROVED_CREATOR',
    action: 'ROLE_ASSIGNED',
    reason: 'Verified creator status granted for hosting public giveaways',
    timestamp: Date.now() - 86400000 * 45,
  });
}

seedInitialUsers();

// Seed Initial Giveaways
function seedInitialGiveaways() {
  const seedGwList: GiveawayItem[] = [
    {
      id: 'gw-dragon-rework',
      hostId: 'trader_vortex',
      hostName: 'Vortex_Samurai',
      hostDisplayName: 'Vortex Samurai',
      hostAvatar: 'swords',
      hostTitle: 'ELITE TRADER',
      hostRole: 'APPROVED_CREATOR',
      hostBadges: ['verified_trader', 'master_negotiator'],
      title: 'DRAGON REWORK CELEBRATION DROP',
      description: 'Commemorating the impending Dragon Fruit awakening! Open to all verified VALUE.NET community members. One lucky trader takes both the Physical Dragon and Dough fruit package.',
      prizes: [
        {
          id: 'pz-1',
          fruitId: 'dragon',
          quantity: 1,
          name: 'Dragon (Physical)',
          rarity: 'Mythical',
          icon: 'local_fire_department',
          marketValue: 180000000,
          beliPrice: 5000000,
          type: 'Beast',
        },
        {
          id: 'pz-2',
          fruitId: 'dough',
          quantity: 1,
          name: 'Dough',
          rarity: 'Mythical',
          icon: 'grain',
          marketValue: 25000000,
          beliPrice: 2800000,
          type: 'Elemental',
        },
      ],
      rules: [
        { id: 'r1', ruleType: 'account_required', ruleText: 'VALUE.NET account required', sortOrder: 1 },
        { id: 'r2', ruleType: 'single_entry', ruleText: 'One entry per player', sortOrder: 2 },
        { id: 'r3', ruleType: 'follow_host', ruleText: 'Follow @Vortex_Samurai in the Terminal', sortOrder: 3 },
        { id: 'r4', ruleType: 'available_on_contact', ruleText: 'Must be available in Trade Chat when contacted', sortOrder: 4 },
      ],
      eligibility: {
        minAccountAgeDays: 0,
        minTrades: 0,
        verifiedAccountRequired: true,
      },
      status: 'ACTIVE',
      startsAt: Date.now() - 3600000 * 14,
      endsAt: Date.now() + 3600000 * 46, // ~2 days remaining
      maxParticipants: 250,
      participantCount: 48,
      allowLeave: true,
      createdAt: Date.now() - 3600000 * 14,
      updatedAt: Date.now() - 3600000 * 14,
      // YouTube Video & Secret Code Boost
      youtubeBoostEnabled: true,
      youtubeVideoId: 'dQw4w9WgXcQ',
      youtubeBoostPercentage: 10,
      youtubeCodeSalt: 'dragon_salt_99',
      youtubeCodeHash: hashGiveawaySecretCode('DRAGON2025', 'dragon_salt_99'),
    },
    {
      id: 'gw-kitsune-shrine',
      hostId: 'trader_pirate',
      hostName: 'PirateKing_77',
      hostDisplayName: 'Pirate King',
      hostAvatar: 'local_fire_department',
      hostTitle: 'DRAGON EMPEROR',
      hostRole: 'ADMIN',
      hostBadges: ['early_trader', 'mythical_collector', 'verified_trader'],
      title: 'MYTHICAL KITSUNE TERMINAL DROP',
      description: 'Official VALUE.NET community event! High-liquidity Kitsune mythical asset dispatched directly to the winner. Free entry for all verified traders.',
      prizes: [
        {
          id: 'pz-3',
          fruitId: 'kitsune',
          quantity: 1,
          name: 'Kitsune',
          rarity: 'Mythical',
          icon: 'pets',
          marketValue: 130000000,
          beliPrice: 8000000,
          type: 'Beast',
        },
      ],
      rules: [
        { id: 'r5', ruleType: 'account_required', ruleText: 'VALUE.NET account required', sortOrder: 1 },
        { id: 'r6', ruleType: 'single_entry', ruleText: 'One entry per verified trader', sortOrder: 2 },
        { id: 'r7', ruleType: 'join_community', ruleText: 'Join the VALUE.NET community network', sortOrder: 3 },
      ],
      eligibility: {
        minAccountAgeDays: 0,
        minTrades: 0,
        verifiedAccountRequired: true,
      },
      status: 'ACTIVE',
      startsAt: Date.now() - 3600000 * 8,
      endsAt: Date.now() + 3600000 * 16, // 16 hours remaining
      maxParticipants: null,
      participantCount: 94,
      allowLeave: true,
      createdAt: Date.now() - 3600000 * 8,
      updatedAt: Date.now() - 3600000 * 8,
    },
    {
      id: 'gw-leopard-bounty',
      hostId: 'trader_kai',
      hostName: 'GrandMaster_Kai',
      hostDisplayName: 'GrandMaster Kai',
      hostAvatar: 'shield_person',
      hostTitle: 'VALUE EXPERT',
      hostRole: 'APPROVED_CREATOR',
      hostBadges: ['mythical_collector', 'value_expert'],
      title: 'WEEKEND TWIN LEOPARD BOUNTY',
      description: 'Apex predator bounty! 2x Physical Leopard fruits. Giveaway is scheduled and will automatically unlock for entries tomorrow at 18:00 UTC.',
      prizes: [
        {
          id: 'pz-4',
          fruitId: 'leopard',
          quantity: 2,
          name: 'Leopard (x2)',
          rarity: 'Mythical',
          icon: 'cruelty_free',
          marketValue: 90000000,
          beliPrice: 10000000,
          type: 'Beast',
        },
      ],
      rules: [
        { id: 'r8', ruleType: 'account_required', ruleText: 'VALUE.NET account required', sortOrder: 1 },
        { id: 'r9', ruleType: 'single_entry', ruleText: 'One entry per player', sortOrder: 2 },
        { id: 'r10', ruleType: 'subscribe_host', ruleText: 'Follow @GrandMaster_Kai for weekend trading updates', sortOrder: 3 },
      ],
      eligibility: {
        minAccountAgeDays: 0,
        minTrades: 0,
        verifiedAccountRequired: true,
      },
      status: 'SCHEDULED',
      startsAt: Date.now() + 3600000 * 22,
      endsAt: Date.now() + 3600000 * 94,
      maxParticipants: 500,
      participantCount: 0,
      allowLeave: true,
      createdAt: Date.now() - 3600000 * 2,
      updatedAt: Date.now() - 3600000 * 2,
    },
    {
      id: 'gw-portal-buddha',
      hostId: 'trader_vortex',
      hostName: 'Vortex_Samurai',
      hostDisplayName: 'Vortex Samurai',
      hostAvatar: 'swords',
      hostTitle: 'ELITE TRADER',
      hostRole: 'APPROVED_CREATOR',
      hostBadges: ['trade_scout', 'master_negotiator'],
      title: 'SECOND SEA STARTER SPEED PACK',
      description: 'The ultimate grinding package featuring awakened Buddha and high-mobility Portal. Giveaway has concluded and the prize was awarded to @Riptide_Ghost.',
      prizes: [
        {
          id: 'pz-5',
          fruitId: 'portal',
          quantity: 1,
          name: 'Portal',
          rarity: 'Legendary',
          icon: 'blur_on',
          marketValue: 6500000,
          beliPrice: 1900000,
          type: 'Natural',
        },
        {
          id: 'pz-6',
          fruitId: 'buddha',
          quantity: 1,
          name: 'Buddha',
          rarity: 'Legendary',
          icon: 'spa',
          marketValue: 8000000,
          beliPrice: 1200000,
          type: 'Beast',
        },
      ],
      rules: [
        { id: 'r11', ruleType: 'account_required', ruleText: 'VALUE.NET account required', sortOrder: 1 },
        { id: 'r12', ruleType: 'single_entry', ruleText: 'One entry per player', sortOrder: 2 },
      ],
      eligibility: {
        minAccountAgeDays: 0,
        minTrades: 0,
        verifiedAccountRequired: true,
      },
      status: 'COMPLETED',
      startsAt: Date.now() - 86400000 * 4,
      endsAt: Date.now() - 86400000 * 1,
      completedAt: Date.now() - 86400000 * 1,
      winnerId: 'trader_ghost',
      winnerUsername: 'Riptide_Ghost',
      winnerDisplayName: 'Riptide Ghost',
      winnerAvatar: 'skull',
      maxParticipants: 100,
      participantCount: 76,
      allowLeave: true,
      createdAt: Date.now() - 86400000 * 4,
      updatedAt: Date.now() - 86400000 * 1,
    },
  ];

  for (const gw of seedGwList) {
    giveaways.set(gw.id, gw);

    // Populate participant map
    const entryMap = new Map<string, GiveawayEntry>();
    if (gw.id === 'gw-dragon-rework') {
      // Seed some real test entries
      entryMap.set('trader_ghost', {
        id: `ent-${Date.now()}-1`,
        giveawayId: gw.id,
        userId: 'trader_ghost',
        username: 'Riptide_Ghost',
        displayName: 'Riptide Ghost',
        avatarUrl: 'skull',
        joinedAt: Date.now() - 3600000 * 10,
        eligibilityState: 'ELIGIBLE',
        hasYoutubeBoost: true,
        boostPercentage: 10,
        boostRedeemedAt: Date.now() - 3600000 * 9,
      });
      entryMap.set('trader_shadow', {
        id: `ent-${Date.now()}-2`,
        giveawayId: gw.id,
        userId: 'trader_shadow',
        username: 'ShadowHunter_99',
        displayName: 'Shadow Hunter',
        avatarUrl: 'visibility',
        joinedAt: Date.now() - 3600000 * 8,
        eligibilityState: 'ELIGIBLE',
      });
    } else if (gw.id === 'gw-portal-buddha') {
      entryMap.set('trader_ghost', {
        id: `ent-${Date.now()}-3`,
        giveawayId: gw.id,
        userId: 'trader_ghost',
        username: 'Riptide_Ghost',
        displayName: 'Riptide Ghost',
        avatarUrl: 'skull',
        joinedAt: Date.now() - 86400000 * 3,
        eligibilityState: 'ELIGIBLE',
      });
    }
    giveawayEntries.set(gw.id, entryMap);
  }
}

seedInitialGiveaways();

// Seed Initial Public Active Trades & Historical Sessions
function seedInitialTrades() {
  const initial: TradeAd[] = [
    {
      id: 'ad-101',
      creatorId: 'trader_vortex',
      creatorName: 'Vortex_Samurai',
      creatorAvatar: 'swords',
      server: 'US-EAST #412',
      offeredFruits: [SEED_FRUITS.dough, SEED_FRUITS.buddha],
      requestedFruits: [SEED_FRUITS.leopard],
      offeredTotalValue: SEED_FRUITS.dough.marketValue + SEED_FRUITS.buddha.marketValue,
      requestedTotalValue: SEED_FRUITS.leopard.marketValue,
      note: 'Fast trade in Cafe / Looking for instant trade or Dark Blade adds',
      status: 'ACTIVE',
      createdAt: Date.now() - 45000,
      updatedAt: Date.now() - 45000,
      verdict: 'WIN',
    },
    {
      id: 'ad-102',
      creatorId: 'trader_kai',
      creatorName: 'GrandMaster_Kai',
      creatorAvatar: 'shield_person',
      server: 'EU-CENTRAL #09',
      offeredFruits: [SEED_FRUITS.kitsune],
      requestedFruits: [SEED_FRUITS.dragon, SEED_FRUITS['dark-blade']],
      offeredTotalValue: SEED_FRUITS.kitsune.marketValue,
      requestedTotalValue: SEED_FRUITS.dragon.marketValue + SEED_FRUITS['dark-blade'].marketValue,
      note: 'Permanent Kitsune physical in stock. Looking for Dragon + Yoru',
      status: 'ACTIVE',
      createdAt: Date.now() - 120000,
      updatedAt: Date.now() - 120000,
      verdict: 'WIN',
    },
    {
      id: 'ad-103',
      creatorId: 'trader_ghost',
      creatorName: 'Riptide_Ghost',
      creatorAvatar: 'skull',
      server: 'ASIA-EAST #88',
      offeredFruits: [SEED_FRUITS.portal, SEED_FRUITS.blizzard],
      requestedFruits: [SEED_FRUITS.buddha, SEED_FRUITS.magma],
      offeredTotalValue: SEED_FRUITS.portal.marketValue + SEED_FRUITS.blizzard.marketValue,
      requestedTotalValue: SEED_FRUITS.buddha.marketValue + SEED_FRUITS.magma.marketValue,
      note: 'Fair value trade at Second Sea Mansion table',
      status: 'ACTIVE',
      createdAt: Date.now() - 300000,
      updatedAt: Date.now() - 300000,
      verdict: 'FAIR',
    },
    {
      id: 'ad-104',
      creatorId: 'trader_shadow',
      creatorName: 'ShadowHunter_99',
      creatorAvatar: 'visibility',
      server: 'US-WEST #201',
      offeredFruits: [SEED_FRUITS.trex],
      requestedFruits: [SEED_FRUITS.dough],
      offeredTotalValue: SEED_FRUITS.trex.marketValue,
      requestedTotalValue: SEED_FRUITS.dough.marketValue,
      note: 'Need Dough for PvP combo test. Online right now!',
      status: 'ACTIVE',
      createdAt: Date.now() - 500000,
      updatedAt: Date.now() - 500000,
      verdict: 'FAIR',
    },
  ];

  for (const ad of initial) {
    tradeAds.set(ad.id, ad);
  }

  // Seed confirmed historical sessions across diverse counterparties
  const seedHistoricalList = [
    {
      id: 'sess-hist-1',
      tradeId: 'ad-hist-1',
      creatorId: 'trader_vortex',
      creatorName: 'Vortex_Samurai',
      creatorAvatar: 'swords',
      participantId: 'trader_pirate',
      participantName: 'PirateKing_77',
      participantAvatar: 'local_fire_department',
      offeredFruits: [SEED_FRUITS.buddha],
      requestedFruits: [SEED_FRUITS.portal],
      offeredTotalValue: 8000000,
      requestedTotalValue: 6500000,
      daysAgo: 40,
    },
    {
      id: 'sess-hist-2',
      tradeId: 'ad-hist-2',
      creatorId: 'trader_vortex',
      creatorName: 'Vortex_Samurai',
      creatorAvatar: 'swords',
      participantId: 'trader_kai',
      participantName: 'GrandMaster_Kai',
      participantAvatar: 'shield_person',
      offeredFruits: [SEED_FRUITS.dough],
      requestedFruits: [SEED_FRUITS.trex, SEED_FRUITS.spirit],
      offeredTotalValue: 25000000,
      requestedTotalValue: 24000000,
      daysAgo: 32,
    },
    {
      id: 'sess-hist-3',
      tradeId: 'ad-hist-3',
      creatorId: 'trader_vortex',
      creatorName: 'Vortex_Samurai',
      creatorAvatar: 'swords',
      participantId: 'trader_ghost',
      participantName: 'Riptide_Ghost',
      participantAvatar: 'skull',
      offeredFruits: [SEED_FRUITS.mammoth],
      requestedFruits: [SEED_FRUITS.shadow, SEED_FRUITS.blizzard],
      offeredTotalValue: 12000000,
      requestedTotalValue: 11000000,
      daysAgo: 20,
    },
    {
      id: 'sess-hist-4',
      tradeId: 'ad-hist-4',
      creatorId: 'trader_vortex',
      creatorName: 'Vortex_Samurai',
      creatorAvatar: 'swords',
      participantId: 'trader_shadow',
      participantName: 'ShadowHunter_99',
      participantAvatar: 'visibility',
      offeredFruits: [SEED_FRUITS.venom],
      requestedFruits: [SEED_FRUITS.control],
      offeredTotalValue: 9000000,
      requestedTotalValue: 8500000,
      daysAgo: 10,
    },
    {
      id: 'sess-hist-5',
      tradeId: 'ad-hist-5',
      creatorId: 'user_root_owner',
      creatorName: 'RootOwner',
      creatorAvatar: 'crown',
      participantId: 'trader_vortex',
      participantName: 'Vortex_Samurai',
      participantAvatar: 'swords',
      offeredFruits: [SEED_FRUITS.dragon],
      requestedFruits: [SEED_FRUITS.kitsune],
      offeredTotalValue: 90000000,
      requestedTotalValue: 125000000,
      daysAgo: 5,
    },
    {
      id: 'sess-hist-6',
      tradeId: 'ad-hist-6',
      creatorId: 'user_root_owner',
      creatorName: 'RootOwner',
      creatorAvatar: 'crown',
      participantId: 'trader_kai',
      participantName: 'GrandMaster_Kai',
      participantAvatar: 'shield_person',
      offeredFruits: [SEED_FRUITS.kitsune],
      requestedFruits: [SEED_FRUITS.dragon, SEED_FRUITS.leopard],
      offeredTotalValue: 125000000,
      requestedTotalValue: 135000000,
      daysAgo: 60,
    },
    {
      id: 'sess-hist-7',
      tradeId: 'ad-hist-7',
      creatorId: 'user_root_owner',
      creatorName: 'RootOwner',
      creatorAvatar: 'crown',
      participantId: 'trader_pirate',
      participantName: 'PirateKing_77',
      participantAvatar: 'local_fire_department',
      offeredFruits: [SEED_FRUITS.leopard],
      requestedFruits: [SEED_FRUITS.dough, SEED_FRUITS.trex],
      offeredTotalValue: 45000000,
      requestedTotalValue: 45000000,
      daysAgo: 70,
    },
    {
      id: 'sess-hist-8',
      tradeId: 'ad-hist-8',
      creatorId: 'trader_kai',
      creatorName: 'GrandMaster_Kai',
      creatorAvatar: 'shield_person',
      participantId: 'trader_ghost',
      participantName: 'Riptide_Ghost',
      participantAvatar: 'skull',
      offeredFruits: [SEED_FRUITS.portal],
      requestedFruits: [SEED_FRUITS.sound, SEED_FRUITS.phoenix],
      offeredTotalValue: 6500000,
      requestedTotalValue: 6000000,
      daysAgo: 18,
    },
    {
      id: 'sess-hist-9',
      tradeId: 'ad-hist-9',
      creatorId: 'trader_pirate',
      creatorName: 'PirateKing_77',
      creatorAvatar: 'local_fire_department',
      participantId: 'trader_shadow',
      participantName: 'ShadowHunter_99',
      participantAvatar: 'visibility',
      offeredFruits: [SEED_FRUITS.trex],
      requestedFruits: [SEED_FRUITS.mammoth, SEED_FRUITS.buddha],
      offeredTotalValue: 20000000,
      requestedTotalValue: 20000000,
      daysAgo: 14,
    },
  ];

  for (const h of seedHistoricalList) {
    const historicalSession: TradeSession = {
      id: h.id,
      tradeId: h.tradeId,
      creatorId: h.creatorId,
      creatorName: h.creatorName,
      creatorAvatar: h.creatorAvatar,
      participantId: h.participantId,
      participantName: h.participantName,
      participantAvatar: h.participantAvatar,
      tradeAd: {
        id: h.tradeId,
        creatorId: h.creatorId,
        creatorName: h.creatorName,
        creatorAvatar: h.creatorAvatar,
        server: 'US-EAST #001',
        offeredFruits: h.offeredFruits,
        requestedFruits: h.requestedFruits,
        offeredTotalValue: h.offeredTotalValue,
        requestedTotalValue: h.requestedTotalValue,
        status: 'CONFIRMED',
        createdAt: Date.now() - 86400000 * h.daysAgo,
        updatedAt: Date.now() - 86400000 * h.daysAgo,
        verdict: 'FAIR',
      },
      creatorConfirmed: true,
      participantConfirmed: true,
      status: 'CONFIRMED',
      createdAt: Date.now() - 86400000 * h.daysAgo,
      closedAt: Date.now() - 86400000 * h.daysAgo + 60000,
    };
    tradeSessions.set(historicalSession.id, historicalSession);
  }

  // Seed authentic verified reviews
  const seedReviewsList: TradeReview[] = [
    {
      id: 'rev-001',
      tradeSessionId: 'sess-hist-1',
      tradeId: 'ad-hist-1',
      fromUserId: 'trader_pirate',
      fromUsername: 'PirateKing_77',
      fromAvatar: 'local_fire_department',
      toUserId: 'trader_vortex',
      rating: 5,
      praiseTags: ['FAST_TRADER', 'FAIR_OFFERS', 'EXACT_ITEMS'],
      feedback: 'Instant accept and joined private server fast. 10/10 trader!',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 39,
    },
    {
      id: 'rev-002',
      tradeSessionId: 'sess-hist-2',
      tradeId: 'ad-hist-2',
      fromUserId: 'trader_kai',
      fromUsername: 'GrandMaster_Kai',
      fromAvatar: 'shield_person',
      toUserId: 'trader_vortex',
      rating: 5,
      praiseTags: ['HIGH_VALUE', 'POLITE_COMMUNICATION', 'FAST_TRADER'],
      feedback: 'Very fair value comparison and clean negotiation at Cafe.',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 31,
    },
    {
      id: 'rev-003',
      tradeSessionId: 'sess-hist-3',
      tradeId: 'ad-hist-3',
      fromUserId: 'trader_ghost',
      fromUsername: 'Riptide_Ghost',
      fromAvatar: 'skull',
      toUserId: 'trader_vortex',
      rating: 5,
      praiseTags: ['FAIR_OFFERS', 'PATIENT'],
      feedback: 'Honest trade, gave exact fruit models as listed.',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 19,
    },
    {
      id: 'rev-004',
      tradeSessionId: 'sess-hist-5',
      tradeId: 'ad-hist-5',
      fromUserId: 'user_root_owner',
      fromUsername: 'RootOwner',
      fromAvatar: 'crown',
      toUserId: 'trader_vortex',
      rating: 5,
      praiseTags: ['HIGH_VALUE', 'FAST_TRADER', 'EXACT_ITEMS'],
      feedback: 'Elite high-tier mythical transaction. Completely trustworthy.',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'rev-005',
      tradeSessionId: 'sess-hist-5',
      tradeId: 'ad-hist-5',
      fromUserId: 'trader_vortex',
      fromUsername: 'Vortex_Samurai',
      fromAvatar: 'swords',
      toUserId: 'user_root_owner',
      rating: 5,
      praiseTags: ['HIGH_VALUE', 'FAIR_OFFERS', 'POLITE_COMMUNICATION'],
      feedback: 'Root Owner fair trade. Legendary investor!',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'rev-006',
      tradeSessionId: 'sess-hist-6',
      tradeId: 'ad-hist-6',
      fromUserId: 'trader_kai',
      fromUsername: 'GrandMaster_Kai',
      fromAvatar: 'shield_person',
      toUserId: 'user_root_owner',
      rating: 5,
      praiseTags: ['HIGH_VALUE', 'EXACT_ITEMS'],
      feedback: 'Mythical bundle transaction completed smoothly.',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 59,
    },
    {
      id: 'rev-007',
      tradeSessionId: 'sess-hist-7',
      tradeId: 'ad-hist-7',
      fromUserId: 'trader_pirate',
      fromUsername: 'PirateKing_77',
      fromAvatar: 'local_fire_department',
      toUserId: 'user_root_owner',
      rating: 5,
      praiseTags: ['FAIR_OFFERS', 'FAST_TRADER'],
      feedback: 'Smooth trade, exact value matches.',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 69,
    },
    {
      id: 'rev-008',
      tradeSessionId: 'sess-hist-2',
      tradeId: 'ad-hist-2',
      fromUserId: 'trader_vortex',
      fromUsername: 'Vortex_Samurai',
      fromAvatar: 'swords',
      toUserId: 'trader_kai',
      rating: 5,
      praiseTags: ['HELPFUL', 'FAIR_OFFERS', 'PATIENT'],
      feedback: 'Great trader to deal with, super quick responses.',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 31,
    },
    {
      id: 'rev-009',
      tradeSessionId: 'sess-hist-1',
      tradeId: 'ad-hist-1',
      fromUserId: 'trader_vortex',
      fromUsername: 'Vortex_Samurai',
      fromAvatar: 'swords',
      toUserId: 'trader_pirate',
      rating: 5,
      praiseTags: ['FAST_TRADER', 'EXACT_ITEMS'],
      feedback: 'Quick swap, no delays.',
      weight: 1.0,
      createdAt: Date.now() - 86400000 * 39,
    },
  ];

  for (const r of seedReviewsList) {
    tradeReviews.set(r.id, r);
  }
}

seedInitialTrades();

// =========================================================================
// ANTI-ABUSE REPUTATION & TRUST SYSTEM ENGINE
// =========================================================================

interface TrustCalculationResult {
  score: number;
  trustLevel: TrustLevel;
  completedTrades: number;
  uniqueCounterparties: number;
  diversityRatio: number;
  averageRating: number;
  totalReviews: number;
  positiveRatingPercent: number;
  praiseTagCounts: Record<string, number>;
  disputeCount: number;
  velocityFlags: number;
  accountAgeDays: number;
  breakdown: {
    baseTrust: number;
    volumeComponent: number;
    reviewComponent: number;
    diversityComponent: number;
    maturityBonus: number;
    penalties: number;
  };
  recentReviews: TradeReview[];
}

function calculateUserTrustEngine(userId: string): TrustCalculationResult {
  const user = users.get(userId);
  const now = Date.now();
  const createdAt = user ? user.createdAt : now - 86400000;
  const accountAgeDays = Math.max(0, Math.floor((now - createdAt) / 86400000));

  // 1. Gather all trade sessions for user
  const userSessions = Array.from(tradeSessions.values()).filter(
    (s) => s.creatorId === userId || s.participantId === userId
  );

  const completedSessions = userSessions.filter((s) => s.status === 'CONFIRMED');
  const rejectedSessions = userSessions.filter((s) => s.status === 'REJECTED');

  // Cancelled Ads
  const cancelledAds = Array.from(tradeAds.values()).filter(
    (a) => a.creatorId === userId && a.status === 'CANCELLED'
  );

  // 2. Counterparty Diversity & Diminishing Returns calculation
  const partnerTradeCounts = new Map<string, number>();
  const partnerTradeTimestamps = new Map<string, number[]>();

  for (const sess of completedSessions) {
    const partnerId = sess.creatorId === userId ? sess.participantId : sess.creatorId;
    if (!partnerId) continue;

    const count = (partnerTradeCounts.get(partnerId) || 0) + 1;
    partnerTradeCounts.set(partnerId, count);

    const tsList = partnerTradeTimestamps.get(partnerId) || [];
    tsList.push(sess.closedAt || sess.createdAt);
    partnerTradeTimestamps.set(partnerId, tsList);
  }

  let effectiveTradeVolume = 0;
  let velocityFlags = 0;

  for (const [partnerId, count] of partnerTradeCounts.entries()) {
    // Check velocity with same counterparty (> 5 trades within 1 hour = farming anomaly)
    const timestamps = partnerTradeTimestamps.get(partnerId) || [];
    timestamps.sort((a, b) => a - b);
    for (let i = 4; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 4] < 3600000) {
        velocityFlags++;
      }
    }

    // Apply Diminishing Returns per counterparty:
    // Trade 1: 1.0 (100%), Trade 2: 0.6 (60%), Trade 3: 0.3 (30%), Trade 4+: 0.1 (10%)
    for (let t = 1; t <= count; t++) {
      if (t === 1) effectiveTradeVolume += 1.0;
      else if (t === 2) effectiveTradeVolume += 0.6;
      else if (t === 3) effectiveTradeVolume += 0.3;
      else effectiveTradeVolume += 0.1;
    }
  }

  const uniqueCounterparties = partnerTradeCounts.size;
  const diversityRatio = completedSessions.length > 0
    ? Math.round((uniqueCounterparties / completedSessions.length) * 100) / 100
    : 1.0;

  // 3. User Reviews Analysis
  const userReviews = Array.from(tradeReviews.values()).filter((r) => r.toUserId === userId);
  userReviews.sort((a, b) => b.createdAt - a.createdAt);

  const praiseTagCounts: Record<string, number> = {};
  let totalReviewWeight = 0;
  let weightedRatingSum = 0;
  let positiveReviewCount = 0;

  for (const rev of userReviews) {
    const w = rev.weight || 1.0;
    totalReviewWeight += w;
    weightedRatingSum += rev.rating * w;

    if (rev.rating >= 4) {
      positiveReviewCount++;
    }

    if (Array.isArray(rev.praiseTags)) {
      for (const tag of rev.praiseTags) {
        praiseTagCounts[tag] = (praiseTagCounts[tag] || 0) + 1;
      }
    }
  }

  const totalReviews = userReviews.length;
  const averageRating = totalReviewWeight > 0
    ? Math.round((weightedRatingSum / totalReviewWeight) * 10) / 10
    : 5.0;

  const positiveRatingPercent = totalReviews > 0
    ? Math.round((positiveReviewCount / totalReviews) * 100)
    : 100;

  // 4. Account Age Maturity Multiplier
  let maturityMultiplier = 1.0;
  let maturityBonus = 0;
  if (accountAgeDays < 3) {
    maturityMultiplier = 0.75;
  } else if (accountAgeDays < 14) {
    maturityMultiplier = 0.85;
  } else if (accountAgeDays >= 60) {
    maturityMultiplier = 1.05;
    maturityBonus = 4;
  }

  // 5. Disputes & Penalties
  const validDisputes = Array.from(tradeDisputes.values()).filter(
    (d) => d.targetUserId === userId && d.status === 'RESOLVED_VALID'
  );
  const disputePenaltyTotal = validDisputes.reduce((acc, d) => acc + (d.penaltyApplied || 15), 0);
  const manualAdjustment = reputationAdjustments.get(userId) || 0;

  // 6. Score Composition Math (Range: 0 to 100)
  const baseTrust = 50;
  const volumeComponent = Math.round(Math.min(25, effectiveTradeVolume * 1.8) * maturityMultiplier);
  const diversityComponent = Math.round(Math.min(10, uniqueCounterparties * 1.0 * (diversityRatio >= 0.5 ? 1.0 : 0.6)));

  let reviewComponent = 0;
  if (totalReviews > 0) {
    reviewComponent = Math.round((averageRating - 3.0) * 5);
  } else if (completedSessions.length >= 2) {
    reviewComponent = 3;
  }

  const penalties = Math.round(
    rejectedSessions.length * 0.5 +
    cancelledAds.length * 0.25 +
    velocityFlags * 2.0 +
    disputePenaltyTotal
  );

  const rawScore = baseTrust + volumeComponent + diversityComponent + reviewComponent + maturityBonus - penalties + manualAdjustment;
  const score = Math.min(100, Math.max(1, Math.round(rawScore)));

  // 7. Determine Trust Level
  let trustLevel: TrustLevel = 'UNRANKED';
  if (
    score >= 96 &&
    completedSessions.length >= 50 &&
    uniqueCounterparties >= 25 &&
    positiveRatingPercent >= 97 &&
    validDisputes.length === 0
  ) {
    trustLevel = 'APEX_TRADER';
  } else if (
    score >= 90 &&
    completedSessions.length >= 20 &&
    uniqueCounterparties >= 10 &&
    positiveRatingPercent >= 94 &&
    validDisputes.length === 0
  ) {
    trustLevel = 'MASTER_TRADER';
  } else if (
    score >= 75 &&
    completedSessions.length >= 8 &&
    uniqueCounterparties >= 4 &&
    positiveRatingPercent >= 90 &&
    validDisputes.length === 0
  ) {
    trustLevel = 'TRUSTED';
  } else if (
    score >= 60 &&
    completedSessions.length >= 4 &&
    uniqueCounterparties >= 2 &&
    validDisputes.length === 0
  ) {
    trustLevel = 'ESTABLISHED';
  } else if (score >= 40 && completedSessions.length >= 2) {
    trustLevel = 'NOVICE';
  } else {
    trustLevel = 'UNRANKED';
  }

  return {
    score,
    trustLevel,
    completedTrades: completedSessions.length,
    uniqueCounterparties,
    diversityRatio,
    averageRating,
    totalReviews,
    positiveRatingPercent,
    praiseTagCounts,
    disputeCount: validDisputes.length,
    velocityFlags,
    accountAgeDays,
    breakdown: {
      baseTrust,
      volumeComponent,
      reviewComponent,
      diversityComponent,
      maturityBonus,
      penalties,
    },
    recentReviews: userReviews.slice(0, 10),
  };
}

// Calculate verified trade stats for a given user based on actual authoritative records
function calculateUserStats(userId: string) {
  let completed = 0;
  let rejected = 0;

  for (const session of tradeSessions.values()) {
    if (session.creatorId === userId || session.participantId === userId) {
      if (session.status === 'CONFIRMED') completed++;
      else if (session.status === 'REJECTED') rejected++;
    }
  }

  let cancelled = 0;
  let posted = 0;
  for (const ad of tradeAds.values()) {
    if (ad.creatorId === userId) {
      posted++;
      if (ad.status === 'CANCELLED') cancelled++;
    }
  }

  let hosted = 0;
  for (const gw of giveaways.values()) {
    if (gw.hostId === userId && gw.status !== 'DRAFT' && gw.status !== 'CANCELLED') {
      hosted++;
    }
  }

  const totalFinished = completed + rejected;
  const acceptanceRate = totalFinished > 0 ? Math.round((completed / totalFinished) * 100) : 100;

  const trustEngine = calculateUserTrustEngine(userId);

  return {
    tradesCompleted: completed,
    tradesRejected: rejected,
    tradesCancelled: cancelled,
    tradeAdsPosted: posted,
    giveawaysHosted: hosted,
    acceptanceRate,
    reputationScore: trustEngine.score,
    rating: trustEngine.averageRating,
    trustLevel: trustEngine.trustLevel,
    uniqueCounterparties: trustEngine.uniqueCounterparties,
    diversityRatio: trustEngine.diversityRatio,
    totalReviews: trustEngine.totalReviews,
    positiveRatingPercent: trustEngine.positiveRatingPercent,
    reputationSummary: {
      userId,
      username: users.get(userId)?.username || userId,
      score: trustEngine.score,
      trustLevel: trustEngine.trustLevel,
      completedTrades: trustEngine.completedTrades,
      uniqueCounterparties: trustEngine.uniqueCounterparties,
      diversityRatio: trustEngine.diversityRatio,
      averageRating: trustEngine.averageRating,
      totalReviews: trustEngine.totalReviews,
      positiveRatingPercent: trustEngine.positiveRatingPercent,
      praiseTagCounts: trustEngine.praiseTagCounts,
      disputeCount: trustEngine.disputeCount,
      velocityFlags: trustEngine.velocityFlags,
      accountAgeDays: trustEngine.accountAgeDays,
      breakdown: trustEngine.breakdown,
      recentReviews: trustEngine.recentReviews,
    },
  };
}

// Convert user record to safe public / authenticated profile
function userToProfile(user: UserRecord, isSelf: boolean = false) {
  const role: UserRole = user.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (user.role || 'MEMBER');
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role,
    isSuspended: !!user.isSuspended,
    suspendedReason: user.isSuspended ? user.suspendedReason : undefined,
    isGiveawaySuspended: !!user.isGiveawaySuspended,
    roleAssignedAt: user.roleAssignedAt,
    roleAssignedBy: user.roleAssignedBy,
    ...(isSelf ? { email: user.email } : {}),
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    status: user.status,
    customStatus: user.customStatus,
    titleId: user.titleId,
    favoriteFruitId: user.favoriteFruitId,
    tradingStyle: user.tradingStyle,
    lookingFor: user.lookingFor,
    notInterestedIn: user.notInterestedIn,
    profileTheme: user.profileTheme,
    showProfile: user.showProfile,
    showPreferences: user.showPreferences,
    showActivity: user.showActivity,
    showTradeStats: user.showTradeStats,
    server: user.server,
    badges: user.badges,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// Extract Bearer token from header
function getAuthUserFromRequest(req: express.Request): UserRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const session = authSessions.get(token);
  if (!session) return null;
  const user = users.get(session.userId) || null;
  if (user && user.normalizedEmail === ROOT_OWNER_EMAIL && user.role !== 'ROOT_OWNER') {
    user.role = 'ROOT_OWNER';
  }
  return user;
}

// Helper to push notifications
function addNotification(userId: string, notif: Omit<TradeNotification, 'id' | 'createdAt' | 'read'>) {
  const fullNotif: TradeNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: Date.now(),
    read: false,
  };
  const list = userNotifications.get(userId) || [];
  list.unshift(fullNotif);
  userNotifications.set(userId, list.slice(0, 30));
  return fullNotif;
}

// Compute verdict helper
function computeVerdict(offeredVal: number, requestedVal: number): 'WIN' | 'FAIR' | 'LOSS' {
  const diff = requestedVal - offeredVal;
  if (diff > offeredVal * 0.1) return 'WIN';
  if (diff < -offeredVal * 0.1) return 'LOSS';
  return 'FAIR';
}

// =========================================================================
// RESOURCE PROTECTION & GRACEFUL DEGRADATION ENGINE (SURVIVAL MODE)
// =========================================================================
type LoadState = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'PROTECTION';

let manualEmergencyMode = false;
let manualEmergencyReason = '';
const serverStartTime = Date.now();
const requestTimestamps: number[] = [];
let totalRateLimitHits = 0;

// Dynamic In-Memory Rate Limiter Store
interface RateBucket {
  count: number;
  resetAt: number;
  lastActionAt?: number;
}
const rateLimitStore = new Map<string, RateBucket>();

// Safety Reports & Contact Desk In-Memory Store
interface SafetyReportRecord {
  id: string;
  category: string;
  target: string;
  reason: string;
  details: string;
  reporterIp: string;
  reporterUserId?: string;
  timestamp: number;
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED';
}
const safetyReports: SafetyReportRecord[] = [];

interface ContactTicketRecord {
  id: string;
  category: string;
  name: string;
  email?: string;
  subject: string;
  message: string;
  ip: string;
  timestamp: number;
  status: 'OPEN' | 'RESOLVED';
}
const contactTickets: ContactTicketRecord[] = [];

function getSystemLoadState(): LoadState {
  if (manualEmergencyMode) return 'PROTECTION';
  const now = Date.now();
  // Filter timestamps within last 60 seconds
  const cutoff = now - 60000;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
  const rpm = requestTimestamps.length;
  if (rpm >= 1100) return 'PROTECTION';
  if (rpm >= 650) return 'HIGH';
  if (rpm >= 300) return 'ELEVATED';
  return 'NORMAL';
}

function checkRateLimit(key: string, maxRequests: number, windowMs: number = 60000, minIntervalMs: number = 0): { allowed: boolean; retryAfterMs: number; error?: string } {
  const now = Date.now();
  let bucket = rateLimitStore.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 1, resetAt: now + windowMs, lastActionAt: now };
    rateLimitStore.set(key, bucket);
    return { allowed: true, retryAfterMs: 0 };
  }

  // Minimum interval protection (e.g. chat spam throttling)
  if (minIntervalMs > 0 && bucket.lastActionAt && now - bucket.lastActionAt < minIntervalMs) {
    totalRateLimitHits++;
    const retryAfter = Math.max(1, Math.ceil((minIntervalMs - (now - bucket.lastActionAt)) / 1000));
    return {
      allowed: false,
      retryAfterMs: minIntervalMs - (now - bucket.lastActionAt),
      error: `Action throttled. Please wait ${retryAfter}s before sending another request.`,
    };
  }

  if (bucket.count >= maxRequests) {
    totalRateLimitHits++;
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return {
      allowed: false,
      retryAfterMs: bucket.resetAt - now,
      error: `Rate limit reached. Please retry in ${retryAfter}s.`,
    };
  }

  bucket.count++;
  bucket.lastActionAt = now;
  return { allowed: true, retryAfterMs: 0 };
}

// Clean up stale rate limits every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now >= bucket.resetAt + 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 120000);

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

function startServer() {
  // Ensure asset directories exist on disk
  const ASSETS_FRUITS_DIR = path.join(process.cwd(), 'public/assets/fruits');
  const ASSETS_VARIANTS_DIR = path.join(process.cwd(), 'public/assets/variants');
  const ASSETS_GAMEPASSES_DIR = path.join(process.cwd(), 'public/assets/gamepasses');
  const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

  [ASSETS_FRUITS_DIR, ASSETS_VARIANTS_DIR, ASSETS_GAMEPASSES_DIR, UPLOADS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Production Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Static Assets Routing for Real Fruit PNGs and Uploads
  app.use('/assets', express.static(path.join(process.cwd(), 'public/assets')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  // Global Telemetry & Rate Limiting Middleware
  app.use((req, res, next) => {
    requestTimestamps.push(Date.now());
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    
    // Global IP throttle (180 req / min)
    const limitCheck = checkRateLimit(`global_ip:${clientIp}`, 180, 60000);
    if (!limitCheck.allowed) {
      res.setHeader('Retry-After', Math.ceil(limitCheck.retryAfterMs / 1000));
      return res.status(429).json({
        success: false,
        error: limitCheck.error || 'Too many requests. System resource protection is active.',
        degraded: true,
      });
    }
    next();
  });

  const server = http.createServer(app);

  // WebSocket Server setup
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of connected client sockets
  interface ClientConnection {
    ws: WebSocket;
    userId: string;
    username: string;
  }
  const clients = new Set<ClientConnection>();

  wss.on('connection', (ws, req) => {
    let currentClient: ClientConnection | null = null;

    ws.on('message', (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());
        if (data.type === 'AUTH' || data.type === 'IDENTIFY') {
          const { userId, username } = data.payload;
          if (currentClient) {
            clients.delete(currentClient);
          }
          currentClient = { ws, userId, username };
          clients.add(currentClient);

          // Send current active trade list and any user notifications
          const activeList = Array.from(tradeAds.values()).filter(
            (t) => t.status === 'ACTIVE' || t.status === 'IN_PROGRESS' || t.status === 'CONFIRMED'
          );
          const userNotifs = userNotifications.get(userId) || [];
          ws.send(
            JSON.stringify({
              type: 'INIT_STATE',
              payload: {
                trades: activeList,
                notifications: userNotifs,
                systemLoad: getSystemLoadState(),
              },
            })
          );
        }
      } catch (err) {
        console.error('Error handling WS message:', err);
      }
    });

    ws.on('close', () => {
      if (currentClient) {
        clients.delete(currentClient);
      }
    });

    ws.on('error', () => {
      if (currentClient) {
        clients.delete(currentClient);
      }
    });
  });

  // Broadcast to all connected sockets
  function broadcast(type: string, payload: any) {
    const msg = JSON.stringify({ type, payload });
    for (const client of clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }

  // Send to specific user
  function sendToUser(userId: string, type: string, payload: any) {
    const msg = JSON.stringify({ type, payload });
    for (const client of clients) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msg);
      }
    }
  }

  // Send to both participants of a session
  function sendToSession(session: TradeSession, type: string, payload: any) {
    sendToUser(session.creatorId, type, payload);
    sendToUser(session.participantId, type, payload);
  }

  // ==========================================
  // SYSTEM HEALTH & EMERGENCY ENDPOINTS
  // ==========================================

  // 0. Public System Health & Telemetry
  app.get('/api/system/health', (req, res) => {
    const loadState = getSystemLoadState();
    const now = Date.now();
    const cutoff = now - 60000;
    const rpm = requestTimestamps.filter((t) => t >= cutoff).length;
    const activeConns = clients.size;

    // Determine simulated pool and degraded features
    const dbPoolMax = 20;
    const dbPoolUtilized = Math.min(dbPoolMax, Math.max(2, Math.round((rpm / 200) * 8) + Math.min(5, Math.floor(activeConns / 20))));
    
    const degradedFeatures: string[] = [];
    if (loadState === 'ELEVATED') {
      degradedFeatures.push('Extended Search Debounce (450ms)', 'Aggressive Client Caching');
    } else if (loadState === 'HIGH') {
      degradedFeatures.push('Realtime Updates Throttled', 'Player Search Rate-Limited', 'Background Polling Reduced');
    } else if (loadState === 'PROTECTION') {
      degradedFeatures.push('Emergency Survival Mode Active', 'Player Search Temporarily Suspended', 'Realtime Fallback to Manual Refresh', 'Strict Write Rate Limits');
    }

    res.json({
      success: true,
      health: {
        loadState,
        isEmergencyMode: manualEmergencyMode,
        emergencyReason: manualEmergencyReason,
        uptimeSeconds: Math.floor((now - serverStartTime) / 1000),
        databaseStatus: loadState === 'PROTECTION' ? 'DEGRADED' : 'HEALTHY',
        authStatus: 'HEALTHY',
        realtimeStatus: loadState === 'PROTECTION' ? 'THROTTLED' : 'HEALTHY',
        activeConnections: activeConns,
        requestsPerMinute: rpm,
        rateLimitHits: totalRateLimitHits,
        dbPoolUtilized,
        dbPoolMax,
        degradedFeatures,
        timestamp: now,
      },
    });
  });

  // 0.1 Toggle Emergency Survival Mode (ROOT_OWNER Only)
  app.post('/api/admin/system/emergency-mode', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || authUser.role !== 'ROOT_OWNER') {
      return res.status(403).json({ success: false, error: 'Only the Root Owner can toggle Emergency Survival Mode.' });
    }

    const { enabled, reason } = req.body;
    manualEmergencyMode = !!enabled;
    manualEmergencyReason = reason || (manualEmergencyMode ? 'Manual activation by Root Owner' : '');

    // Broadcast system state transition
    broadcast('SYSTEM_STATE_CHANGED', {
      loadState: getSystemLoadState(),
      isEmergencyMode: manualEmergencyMode,
      reason: manualEmergencyReason,
    });

    res.json({
      success: true,
      message: `Emergency Survival Mode ${manualEmergencyMode ? 'ACTIVATED' : 'DEACTIVATED'}.`,
      loadState: getSystemLoadState(),
      isEmergencyMode: manualEmergencyMode,
    });
  });

  // 0.2 Reset Rate Limits (ROOT_OWNER & ADMIN)
  app.post('/api/admin/system/reset-rate-limits', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (authUser.role !== 'ROOT_OWNER' && authUser.role !== 'ADMIN')) {
      return res.status(403).json({ success: false, error: 'Administrative privileges required.' });
    }

    rateLimitStore.clear();
    totalRateLimitHits = 0;

    res.json({
      success: true,
      message: 'All dynamic rate limit buckets have been flushed.',
    });
  });

  // 0.3 Flush System Cache / Memory (ROOT_OWNER & ADMIN)
  app.post('/api/admin/system/flush-cache', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (authUser.role !== 'ROOT_OWNER' && authUser.role !== 'ADMIN')) {
      return res.status(403).json({ success: false, error: 'Administrative privileges required.' });
    }

    rateLimitStore.clear();
    res.json({
      success: true,
      message: 'Server memory and rate limiting caches cleared.',
    });
  });

  // ==========================================
  // REST API ENDPOINTS
  // ==========================================

  // 1. Get All Trades (with Pagination & Load-Aware Limits)
  app.get('/api/trades', (req, res) => {
    const filter = (req.query.filter as string) || 'ALL';
    const userId = req.query.userId as string;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(40, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    let list = Array.from(tradeAds.values()).sort((a, b) => b.createdAt - a.createdAt);

    if (filter === 'MY' && userId) {
      list = list.filter((t) => t.creatorId === userId || t.acceptedBy === userId);
    } else if (filter === 'ACTIVE') {
      list = list.filter((t) => t.status === 'ACTIVE');
    } else if (filter === 'WIN' || filter === 'FAIR' || filter === 'LOSS') {
      list = list.filter((t) => t.verdict === filter && t.status !== 'CANCELLED');
    } else {
      // Return active and recent in-progress/confirmed
      list = list.filter((t) => t.status !== 'CANCELLED');
    }

    const total = list.length;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      trades: paginated,
      total,
      page,
      limit,
    });
  });

  // 2. Create Trade Ad
  app.post('/api/trades', (req, res) => {
    const {
      creatorId,
      creatorName,
      creatorAvatar = 'swords',
      server = 'US-EAST #412',
      offeredFruits,
      requestedFruits,
      note,
    } = req.body;

    if (!creatorId || !creatorName) {
      return res.status(400).json({ error: 'Missing creator credentials' });
    }

    const tradeLimit = checkRateLimit(`trade_create:${creatorId}`, 10, 60000);
    if (!tradeLimit.allowed) {
      return res.status(429).json({ error: tradeLimit.error || 'Trade creation rate limit exceeded.' });
    }

    if (!Array.isArray(offeredFruits) || offeredFruits.length === 0 || offeredFruits.length > 4) {
      return res.status(400).json({ error: 'Must offer between 1 and 4 items' });
    }

    if (!Array.isArray(requestedFruits) || requestedFruits.length === 0 || requestedFruits.length > 4) {
      return res.status(400).json({ error: 'Must request between 1 and 4 items' });
    }

    const offeredTotalValue = offeredFruits.reduce((sum: number, f: Fruit) => sum + (f.marketValue || 0), 0);
    const requestedTotalValue = requestedFruits.reduce((sum: number, f: Fruit) => sum + (f.marketValue || 0), 0);
    const verdict = computeVerdict(offeredTotalValue, requestedTotalValue);

    const newTrade: TradeAd = {
      id: `ad-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
      creatorId,
      creatorName,
      creatorAvatar,
      server,
      offeredFruits,
      requestedFruits,
      offeredTotalValue,
      requestedTotalValue,
      note: note ? note.trim().slice(0, 140) : undefined,
      status: 'ACTIVE',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      verdict,
    };

    tradeAds.set(newTrade.id, newTrade);

    // Broadcast new trade to all connected users
    broadcast('TRADE_CREATED', newTrade);

    res.status(201).json({ success: true, trade: newTrade });
  });

  // 3. Edit Trade Ad (while ACTIVE only)
  app.put('/api/trades/:id', (req, res) => {
    const { id } = req.params;
    const { userId, offeredFruits, requestedFruits, note } = req.body;

    const trade = tradeAds.get(id);
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    if (trade.creatorId !== userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this trade' });
    }

    if (trade.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot edit a trade that is in progress or completed' });
    }

    if (offeredFruits && Array.isArray(offeredFruits) && offeredFruits.length > 0) {
      trade.offeredFruits = offeredFruits;
      trade.offeredTotalValue = offeredFruits.reduce((s: number, f: Fruit) => s + (f.marketValue || 0), 0);
    }

    if (requestedFruits && Array.isArray(requestedFruits) && requestedFruits.length > 0) {
      trade.requestedFruits = requestedFruits;
      trade.requestedTotalValue = requestedFruits.reduce((s: number, f: Fruit) => s + (f.marketValue || 0), 0);
    }

    if (note !== undefined) {
      trade.note = note.trim().slice(0, 140);
    }

    trade.verdict = computeVerdict(trade.offeredTotalValue, trade.requestedTotalValue);
    trade.updatedAt = Date.now();

    broadcast('TRADE_UPDATED', trade);

    res.json({ success: true, trade });
  });

  // 4. Cancel Trade Ad (while ACTIVE only)
  app.post('/api/trades/:id/cancel', (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    const trade = tradeAds.get(id);
    if (!trade) {
      return res.status(404).json({ error: 'Trade advertisement not found' });
    }

    if (trade.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can cancel this trade' });
    }

    if (trade.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot cancel a trade that is in progress or resolved' });
    }

    trade.status = 'CANCELLED';
    trade.updatedAt = Date.now();

    broadcast('TRADE_CANCELLED', { tradeId: trade.id });

    res.json({ success: true, tradeId: trade.id });
  });

  // 5. ATOMIC ACCEPT TRADE -> Create Private Session
  app.post('/api/trades/:id/accept', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const { id } = req.params;
    const { participantId, participantName, participantAvatar = 'account_circle' } = req.body;

    if (!participantId || !participantName) {
      return res.status(400).json({ error: 'Missing participant identity' });
    }

    const trade = tradeAds.get(id);
    if (!trade) {
      return res.status(404).json({ error: 'Trade advertisement not found' });
    }

    // ATOMIC LOCK: Only ACTIVE trades can be claimed
    if (trade.status !== 'ACTIVE') {
      return res.status(409).json({
        error: 'This trade is no longer active or was already claimed by another user.',
      });
    }

    if (trade.creatorId === participantId) {
      return res.status(400).json({ error: 'You cannot accept your own trade advertisement.' });
    }

    // Change status atomically
    trade.status = 'IN_PROGRESS';
    trade.acceptedBy = participantId;
    trade.acceptedByName = participantName;
    trade.updatedAt = Date.now();

    const sessionId = `sess-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    trade.sessionId = sessionId;

    const session: TradeSession = {
      id: sessionId,
      tradeId: trade.id,
      creatorId: trade.creatorId,
      creatorName: trade.creatorName,
      creatorAvatar: trade.creatorAvatar,
      participantId,
      participantName,
      participantAvatar,
      tradeAd: trade,
      creatorConfirmed: false,
      participantConfirmed: false,
      status: 'IN_PROGRESS',
      createdAt: Date.now(),
    };

    tradeSessions.set(sessionId, session);

    // Initial system greeting message in private chat
    const initialMessage: TradeMessage = {
      id: `msg-${Date.now()}-sys`,
      sessionId,
      senderId: 'SYSTEM',
      senderName: 'TERMINAL PROTOCOL',
      message: `Trade session initialized between @${trade.creatorName} and @${participantName}. Negotiate terms and click CONFIRM TRADE when ready.`,
      createdAt: Date.now(),
      type: 'system',
    };
    sessionMessages.set(sessionId, [initialMessage]);

    // Push notification to Creator
    const creatorNotif = addNotification(trade.creatorId, {
      userId: trade.creatorId,
      title: 'Trade Offer Accepted',
      message: `@${participantName} accepted your trade offer!`,
      type: 'acceptance',
      tradeId: trade.id,
      sessionId,
    });
    sendToUser(trade.creatorId, 'NEW_NOTIFICATION', creatorNotif);

    // Push notification to Participant
    const participantNotif = addNotification(participantId, {
      userId: participantId,
      title: 'Trade Session Connected',
      message: `You entered a trade session with @${trade.creatorName}.`,
      type: 'acceptance',
      tradeId: trade.id,
      sessionId,
    });
    sendToUser(participantId, 'NEW_NOTIFICATION', participantNotif);

    // Broadcast updated public board status
    broadcast('TRADE_UPDATED', trade);

    // Send direct session start event to both users
    sendToSession(session, 'SESSION_STARTED', { session, messages: [initialMessage] });

    res.json({
      success: true,
      session,
      messages: [initialMessage],
    });
  });

  // 6. Get Trade Session Details
  app.get('/api/sessions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const userId = req.query.userId as string;

    const session = tradeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Trade session not found' });
    }

    if (session.creatorId !== userId && session.participantId !== userId) {
      return res.status(403).json({ error: 'Unauthorized: Private trade session' });
    }

    const messages = sessionMessages.get(sessionId) || [];
    res.json({ success: true, session, messages });
  });

  // 7. Send Private Chat Message
  app.post('/api/sessions/:sessionId/messages', (req, res) => {
    const { sessionId } = req.params;
    const { senderId, senderName, message } = req.body;

    if (!senderId || !message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Anti-spam throttling: 30 msgs/min, min 800ms between messages
    const chatLimit = checkRateLimit(`chat:${senderId}`, 30, 60000, 800);
    if (!chatLimit.allowed) {
      return res.status(429).json({ error: chatLimit.error || 'Message throttled. Slow down.' });
    }

    const session = tradeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.creatorId !== senderId && session.participantId !== senderId) {
      return res.status(403).json({ error: 'Unauthorized: Not a participant in this trade session' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'This trade session is closed. New messages cannot be sent.' });
    }

    const newMsg: TradeMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sessionId,
      senderId,
      senderName: senderName || 'Trader',
      message: message.trim().slice(0, 500),
      createdAt: Date.now(),
      type: 'chat',
    };

    const messages = sessionMessages.get(sessionId) || [];
    messages.push(newMsg);
    sessionMessages.set(sessionId, messages);

    // Push in real time ONLY to the two participants
    sendToSession(session, 'NEW_MESSAGE', newMsg);

    res.json({ success: true, message: newMsg });
  });

  // 8. TWO-PARTY TRADE CONFIRMATION
  app.post('/api/sessions/:sessionId/confirm', (req, res) => {
    const { sessionId } = req.params;
    const { userId, userName } = req.body;

    const session = tradeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Trade session not found' });
    }

    if (session.creatorId !== userId && session.participantId !== userId) {
      return res.status(403).json({ error: 'Unauthorized: Not a participant' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Trade session is no longer in progress.' });
    }

    if (session.creatorId === userId) {
      session.creatorConfirmed = true;
    } else {
      session.participantConfirmed = true;
    }

    const messages = sessionMessages.get(sessionId) || [];

    // Check if BOTH confirmed
    if (session.creatorConfirmed && session.participantConfirmed) {
      session.status = 'CONFIRMED';
      session.closedAt = Date.now();

      const trade = tradeAds.get(session.tradeId);
      if (trade) {
        trade.status = 'CONFIRMED';
        trade.updatedAt = Date.now();
        broadcast('TRADE_UPDATED', trade);
      }

      const sysMsg: TradeMessage = {
        id: `msg-${Date.now()}-sys`,
        sessionId,
        senderId: 'SYSTEM',
        senderName: 'TERMINAL PROTOCOL',
        message: `TRADE CONFIRMED by both @${session.creatorName} and @${session.participantName}. Transaction complete.`,
        createdAt: Date.now(),
        type: 'system',
      };
      messages.push(sysMsg);
      sessionMessages.set(sessionId, messages);

      // Notify both users
      const notifA = addNotification(session.creatorId, {
        userId: session.creatorId,
        title: 'Trade Completed',
        message: `Trade with @${session.participantName} was confirmed and resolved!`,
        type: 'confirmed',
        sessionId,
        tradeId: session.tradeId,
      });
      const notifB = addNotification(session.participantId, {
        userId: session.participantId,
        title: 'Trade Completed',
        message: `Trade with @${session.creatorName} was confirmed and resolved!`,
        type: 'confirmed',
        sessionId,
        tradeId: session.tradeId,
      });
      sendToUser(session.creatorId, 'NEW_NOTIFICATION', notifA);
      sendToUser(session.participantId, 'NEW_NOTIFICATION', notifB);

      sendToSession(session, 'SESSION_UPDATED', { session, newMsg: sysMsg });
    } else {
      // Only one confirmed so far
      const sysMsg: TradeMessage = {
        id: `msg-${Date.now()}-sys`,
        sessionId,
        senderId: 'SYSTEM',
        senderName: 'TERMINAL PROTOCOL',
        message: `@${userName || 'Trader'} confirmed the trade. Waiting for partner confirmation...`,
        createdAt: Date.now(),
        type: 'system',
      };
      messages.push(sysMsg);
      sessionMessages.set(sessionId, messages);

      sendToSession(session, 'SESSION_UPDATED', { session, newMsg: sysMsg });
    }

    res.json({ success: true, session });
  });

  // 9. REJECT / CANCEL TRADE SESSION
  app.post('/api/sessions/:sessionId/reject', (req, res) => {
    const { sessionId } = req.params;
    const { userId, userName, reason } = req.body;

    const session = tradeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Trade session not found' });
    }

    if (session.creatorId !== userId && session.participantId !== userId) {
      return res.status(403).json({ error: 'Unauthorized: Not a participant' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Trade session is already resolved.' });
    }

    session.status = 'REJECTED';
    session.closedAt = Date.now();
    session.rejectionReason = reason || 'Trade rejected by participant';

    const trade = tradeAds.get(session.tradeId);
    if (trade) {
      trade.status = 'REJECTED';
      trade.updatedAt = Date.now();
      broadcast('TRADE_UPDATED', trade);
    }

    const messages = sessionMessages.get(sessionId) || [];
    const sysMsg: TradeMessage = {
      id: `msg-${Date.now()}-sys`,
      sessionId,
      senderId: 'SYSTEM',
      senderName: 'TERMINAL PROTOCOL',
      message: `Trade was rejected by @${userName || 'Trader'}. Session closed.`,
      createdAt: Date.now(),
      type: 'system',
    };
    messages.push(sysMsg);
    sessionMessages.set(sessionId, messages);

    const otherUserId = session.creatorId === userId ? session.participantId : session.creatorId;
    const notif = addNotification(otherUserId, {
      userId: otherUserId,
      title: 'Trade Rejected',
      message: `@${userName || 'Partner'} declined the trade session.`,
      type: 'rejected',
      sessionId,
      tradeId: session.tradeId,
    });
    sendToUser(otherUserId, 'NEW_NOTIFICATION', notif);

    sendToSession(session, 'SESSION_UPDATED', { session, newMsg: sysMsg });

    res.json({ success: true, session });
  });

  // 10. Get User Notifications
  app.get('/api/notifications/:userId', (req, res) => {
    const { userId } = req.params;
    const list = userNotifications.get(userId) || [];
    res.json({ success: true, notifications: list });
  });

  // 11. Mark Notification as Read
  app.post('/api/notifications/:id/read', (req, res) => {
    const { id } = req.params;
    for (const notifs of userNotifications.values()) {
      const target = notifs.find((n) => n.id === id);
      if (target) {
        target.read = true;
        return res.json({ success: true });
      }
    }
    res.json({ success: true });
  });

  // 12. User Active Sessions
  app.get('/api/users/:userId/active-sessions', (req, res) => {
    const { userId } = req.params;
    const active = Array.from(tradeSessions.values()).filter(
      (s) => (s.creatorId === userId || s.participantId === userId) && s.status === 'IN_PROGRESS'
    );
    res.json({ success: true, sessions: active });
  });

  // ==========================================
  // REPUTATION & TRUST SYSTEM REST API
  // ==========================================

  // 12.1 Get Reputation Summary for a Player
  app.get('/api/reputation/:userIdOrUsername', (req, res) => {
    const { userIdOrUsername } = req.params;
    let targetUser: UserRecord | undefined = users.get(userIdOrUsername);

    if (!targetUser) {
      const lower = userIdOrUsername.toLowerCase();
      targetUser = Array.from(users.values()).find((u) => u.username.toLowerCase() === lower);
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Trader not found' });
    }

    const trustEngine = calculateUserTrustEngine(targetUser.id);
    res.json({
      success: true,
      summary: {
        userId: targetUser.id,
        username: targetUser.username,
        score: trustEngine.score,
        trustLevel: trustEngine.trustLevel,
        completedTrades: trustEngine.completedTrades,
        uniqueCounterparties: trustEngine.uniqueCounterparties,
        diversityRatio: trustEngine.diversityRatio,
        averageRating: trustEngine.averageRating,
        totalReviews: trustEngine.totalReviews,
        positiveRatingPercent: trustEngine.positiveRatingPercent,
        praiseTagCounts: trustEngine.praiseTagCounts,
        disputeCount: trustEngine.disputeCount,
        velocityFlags: trustEngine.velocityFlags,
        accountAgeDays: trustEngine.accountAgeDays,
        breakdown: trustEngine.breakdown,
        recentReviews: trustEngine.recentReviews,
      },
    });
  });

  // 12.2 Submit Trade Review / Rating (Protected)
  app.post('/api/trades/:sessionId/rate', (req, res) => {
    const { sessionId } = req.params;
    const authUser = getAuthUserFromRequest(req);

    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required to submit a trade review.' });
    }

    const session = tradeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Trade session not found.' });
    }

    if (session.creatorId !== authUser.id && session.participantId !== authUser.id) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this trade.' });
    }

    if (session.status !== 'CONFIRMED') {
      return res.status(400).json({ success: false, error: 'Reviews can only be submitted for completed trades.' });
    }

    const { rating, praiseTags, feedback } = req.body;
    const numRating = Math.max(1, Math.min(5, Math.floor(Number(rating) || 5)));
    const validTags = Array.isArray(praiseTags)
      ? praiseTags.filter((t) => typeof t === 'string' && t.length > 0).slice(0, 5)
      : [];

    const toUserId = authUser.id === session.creatorId ? session.participantId : session.creatorId;
    const toUser = users.get(toUserId);

    if (!toUser) {
      return res.status(404).json({ success: false, error: 'Counterparty trader not found.' });
    }

    // Check if review already exists for this session from this user
    const existing = Array.from(tradeReviews.values()).find(
      (r) => r.tradeSessionId === sessionId && r.fromUserId === authUser.id
    );

    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already submitted a review for this trade.' });
    }

    // Calculate Diminishing Returns weight based on previous reviews between this exact pair
    const previousReviewsCount = Array.from(tradeReviews.values()).filter(
      (r) => r.fromUserId === authUser.id && r.toUserId === toUserId
    ).length;

    let weight = 1.0;
    if (previousReviewsCount === 1) weight = 0.6;
    else if (previousReviewsCount === 2) weight = 0.3;
    else if (previousReviewsCount >= 3) weight = 0.1;

    const prevEngine = calculateUserTrustEngine(toUserId);

    const reviewId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newReview: TradeReview = {
      id: reviewId,
      tradeSessionId: sessionId,
      tradeId: session.tradeId,
      fromUserId: authUser.id,
      fromUsername: authUser.username,
      fromAvatar: authUser.avatarUrl || 'person',
      toUserId,
      rating: numRating,
      praiseTags: validTags,
      feedback: typeof feedback === 'string' ? feedback.trim().slice(0, 300) : undefined,
      weight,
      createdAt: Date.now(),
    };

    tradeReviews.set(newReview.id, newReview);

    const updatedEngine = calculateUserTrustEngine(toUserId);
    const scoreDiff = updatedEngine.score - prevEngine.score;

    reputationAuditLogs.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: toUserId,
      username: toUser.username,
      action: 'REVIEW_RECEIVED',
      change: scoreDiff,
      previousScore: prevEngine.score,
      newScore: updatedEngine.score,
      reason: `Received ${numRating}-star review from @${authUser.username} (weight ${weight})`,
      metadata: { sessionId, reviewId, rating: numRating, tags: validTags },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      review: newReview,
      summary: {
        userId: toUser.id,
        username: toUser.username,
        score: updatedEngine.score,
        trustLevel: updatedEngine.trustLevel,
        completedTrades: updatedEngine.completedTrades,
        uniqueCounterparties: updatedEngine.uniqueCounterparties,
        diversityRatio: updatedEngine.diversityRatio,
        averageRating: updatedEngine.averageRating,
        totalReviews: updatedEngine.totalReviews,
        positiveRatingPercent: updatedEngine.positiveRatingPercent,
        praiseTagCounts: updatedEngine.praiseTagCounts,
        disputeCount: updatedEngine.disputeCount,
        velocityFlags: updatedEngine.velocityFlags,
        accountAgeDays: updatedEngine.accountAgeDays,
        breakdown: updatedEngine.breakdown,
        recentReviews: updatedEngine.recentReviews,
      },
    });
  });

  // 12.3 Submit Trade Dispute (Protected)
  app.post('/api/trades/:sessionId/dispute', (req, res) => {
    const { sessionId } = req.params;
    const authUser = getAuthUserFromRequest(req);

    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required to report a trade.' });
    }

    const session = tradeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Trade session not found.' });
    }

    if (session.creatorId !== authUser.id && session.participantId !== authUser.id) {
      return res.status(403).json({ success: false, error: 'You are not a participant in this trade.' });
    }

    const { reason, details } = req.body;
    if (!details || typeof details !== 'string' || details.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Please provide detailed explanations (at least 10 characters).' });
    }

    const targetUserId = authUser.id === session.creatorId ? session.participantId : session.creatorId;
    const targetUser = users.get(targetUserId);

    const existingDispute = Array.from(tradeDisputes.values()).find(
      (d) => d.tradeSessionId === sessionId && d.reporterId === authUser.id
    );

    if (existingDispute) {
      return res.status(400).json({ success: false, error: 'A dispute has already been filed for this session.' });
    }

    const disputeId = `disp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newDispute: TradeDispute = {
      id: disputeId,
      tradeSessionId: sessionId,
      tradeId: session.tradeId,
      reporterId: authUser.id,
      reporterUsername: authUser.username,
      targetUserId,
      targetUsername: targetUser?.username || 'Trader',
      reason: typeof reason === 'string' ? reason : 'SCAM_ATTEMPT',
      details: details.trim().slice(0, 1000),
      status: 'PENDING',
      createdAt: Date.now(),
    };

    tradeDisputes.set(newDispute.id, newDispute);

    reputationAuditLogs.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: targetUserId,
      username: targetUser?.username || 'Trader',
      action: 'DISPUTE_FILED',
      change: 0,
      previousScore: calculateUserTrustEngine(targetUserId).score,
      newScore: calculateUserTrustEngine(targetUserId).score,
      reason: `Dispute filed by @${authUser.username}: ${reason}`,
      metadata: { disputeId, sessionId },
      timestamp: Date.now(),
    });

    res.json({ success: true, dispute: newDispute });
  });

  // 12.4 Get Admin Disputes (Moderator / Admin)
  app.get('/api/admin/reputation/disputes', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (authUser.role !== 'ROOT_OWNER' && authUser.role !== 'ADMIN' && authUser.role !== 'MODERATOR')) {
      return res.status(403).json({ success: false, error: 'Staff access required.' });
    }

    const list = Array.from(tradeDisputes.values()).sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
      return b.createdAt - a.createdAt;
    });

    res.json({ success: true, disputes: list });
  });

  // 12.5 Resolve Trade Dispute (Moderator / Admin)
  app.post('/api/admin/reputation/disputes/:disputeId/resolve', (req, res) => {
    const { disputeId } = req.params;
    const authUser = getAuthUserFromRequest(req);

    if (!authUser || (authUser.role !== 'ROOT_OWNER' && authUser.role !== 'ADMIN' && authUser.role !== 'MODERATOR')) {
      return res.status(403).json({ success: false, error: 'Staff access required.' });
    }

    const dispute = tradeDisputes.get(disputeId);
    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute record not found.' });
    }

    const { action, penaltyAmount } = req.body;
    const prevEngine = calculateUserTrustEngine(dispute.targetUserId);

    if (action === 'VALID_PENALIZE') {
      const penalty = Math.max(5, Math.min(40, Number(penaltyAmount) || 15));
      dispute.status = 'RESOLVED_VALID';
      dispute.penaltyApplied = penalty;
      dispute.resolvedAt = Date.now();
      dispute.resolvedBy = authUser.username;

      const newEngine = calculateUserTrustEngine(dispute.targetUserId);

      reputationAuditLogs.push({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: dispute.targetUserId,
        username: dispute.targetUsername,
        action: 'DISPUTE_PENALTY',
        change: -penalty,
        previousScore: prevEngine.score,
        newScore: newEngine.score,
        reason: `Dispute upheld by Staff @${authUser.username}. Penalty applied: -${penalty} pts.`,
        metadata: { disputeId, penalty },
        timestamp: Date.now(),
      });
    } else {
      dispute.status = 'RESOLVED_DISMISSED';
      dispute.penaltyApplied = 0;
      dispute.resolvedAt = Date.now();
      dispute.resolvedBy = authUser.username;
    }

    res.json({ success: true, dispute });
  });

  // 12.6 Adjust Reputation Score (Root Owner / Admin)
  app.post('/api/admin/reputation/adjust', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (authUser.role !== 'ROOT_OWNER' && authUser.role !== 'ADMIN')) {
      return res.status(403).json({ success: false, error: 'Administrator access required.' });
    }

    const { userId, change, reason } = req.body;
    const targetUser = users.get(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Target user not found.' });
    }

    const numChange = Math.max(-50, Math.min(50, Number(change) || 0));
    const prevEngine = calculateUserTrustEngine(userId);

    const currentAdjustment = reputationAdjustments.get(userId) || 0;
    reputationAdjustments.set(userId, currentAdjustment + numChange);

    const updatedEngine = calculateUserTrustEngine(userId);

    reputationAuditLogs.push({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      username: targetUser.username,
      action: 'ADMIN_ADJUSTMENT',
      change: numChange,
      previousScore: prevEngine.score,
      newScore: updatedEngine.score,
      reason: reason || `Manual adjustment by @${authUser.username}`,
      metadata: { adminId: authUser.id, adminUsername: authUser.username },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      summary: {
        userId,
        username: targetUser.username,
        score: updatedEngine.score,
        trustLevel: updatedEngine.trustLevel,
        completedTrades: updatedEngine.completedTrades,
        uniqueCounterparties: updatedEngine.uniqueCounterparties,
        diversityRatio: updatedEngine.diversityRatio,
        averageRating: updatedEngine.averageRating,
        totalReviews: updatedEngine.totalReviews,
        positiveRatingPercent: updatedEngine.positiveRatingPercent,
        praiseTagCounts: updatedEngine.praiseTagCounts,
        disputeCount: updatedEngine.disputeCount,
        velocityFlags: updatedEngine.velocityFlags,
        accountAgeDays: updatedEngine.accountAgeDays,
        breakdown: updatedEngine.breakdown,
        recentReviews: updatedEngine.recentReviews,
      },
    });
  });

  // 12.7 Get Reputation Audit Logs (Staff)
  app.get('/api/admin/reputation/audit', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (authUser.role !== 'ROOT_OWNER' && authUser.role !== 'ADMIN' && authUser.role !== 'MODERATOR')) {
      return res.status(403).json({ success: false, error: 'Staff access required.' });
    }

    const { userId } = req.query;
    let list = [...reputationAuditLogs].sort((a, b) => b.timestamp - a.timestamp);

    if (userId && typeof userId === 'string') {
      list = list.filter((l) => l.userId === userId);
    }

    res.json({ success: true, logs: list.slice(0, 100) });
  });

  // ==========================================
  // AUTHENTICATION & PLAYER PROFILES REST API
  // ==========================================

  // 13. Auth: Sign Up (supports /signup and /register aliases)
  app.post(['/api/auth/signup', '/api/auth/register'], (req, res) => {
    const { username, email, password, displayName } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ success: false, error: 'Username is required.' });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores.' });
    }

    const reserved = ['admin', 'system', 'valuenet', 'valuenet_admin', 'moderator', 'root', 'blox', 'official', 'support', 'bot'];
    if (reserved.includes(trimmedUsername.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'This username is reserved by the system.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const normUsername = trimmedUsername.toLowerCase();
    const normEmail = email.trim().toLowerCase();

    for (const u of users.values()) {
      if (u.normalizedUsername === normUsername) {
        return res.status(409).json({ success: false, error: 'Username is already taken.' });
      }
      if (u.normalizedEmail === normEmail) {
        return res.status(409).json({ success: false, error: 'Email address is already registered.' });
      }
    }

    const userId = `u-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const newUser: UserRecord = {
      id: userId,
      username: trimmedUsername,
      normalizedUsername: normUsername,
      displayName: displayName && typeof displayName === 'string' ? displayName.trim().slice(0, 32) : trimmedUsername,
      email: email.trim(),
      normalizedEmail: normEmail,
      passwordHash,
      salt,
      avatarUrl: 'swords',
      bannerUrl: 'midnight',
      bio: 'Blox Fruits trader on VALUE.NET.',
      status: 'TRADING',
      titleId: 'new_trader',
      favoriteFruitId: null,
      tradingStyle: 'Fair Trades',
      lookingFor: [],
      notInterestedIn: [],
      profileTheme: 'midnight',
      showProfile: true,
      showPreferences: true,
      showActivity: true,
      showTradeStats: true,
      server: 'US-EAST #412',
      badges: ['community_member', 'early_trader'],
      role: 'MEMBER',
      isGiveawaySuspended: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    users.set(userId, newUser);

    const token = generateToken();
    authSessions.set(token, { userId, token, createdAt: Date.now() });

    const prof = userToProfile(newUser, true);
    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        email: newUser.email,
        avatarUrl: newUser.avatarUrl,
        token,
        role: prof.role,
        profile: prof,
      },
    });
  });

  // 14. Auth: Log In
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Username/email and password are required.' });
    }

    const norm = identifier.trim().toLowerCase();
    let targetUser: UserRecord | undefined;

    for (const u of users.values()) {
      if (u.normalizedUsername === norm || u.normalizedEmail === norm) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      return res.status(401).json({ success: false, error: 'Invalid username/email or password.' });
    }

    const testHash = hashPassword(password, targetUser.salt);
    if (testHash !== targetUser.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid username/email or password.' });
    }

    const token = generateToken();
    authSessions.set(token, { userId: targetUser.id, token, createdAt: Date.now() });

    const prof = userToProfile(targetUser, true);
    res.json({
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        email: targetUser.email,
        avatarUrl: targetUser.avatarUrl,
        token,
        role: prof.role,
        profile: prof,
      },
    });
  });

  // 15. Auth: Log Out
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      authSessions.delete(token);
    }
    res.json({ success: true });
  });

  // 16. Auth: Get Current Authenticated User (Session Verification)
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized or session expired.' });
    }

    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];

    const prof = userToProfile(user, true);
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        token,
        role: prof.role,
        profile: prof,
      },
    });
  });

  // 17. Auth: Forgot Password (Request Code)
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const normEmail = email.trim().toLowerCase();
    let found = false;
    for (const u of users.values()) {
      if (u.normalizedEmail === normEmail) {
        found = true;
        break;
      }
    }

    if (!found) {
      // Return generic success message to prevent user enumeration
      return res.json({
        success: true,
        message: 'If an account matches this email, a 6-digit verification code has been dispatched.',
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    passwordResetCodes.set(normEmail, {
      email: normEmail,
      code,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'A 6-digit verification code has been dispatched.',
      code, // Included for preview & instant testing
    });
  });

  // 18. Auth: Reset Password
  app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, error: 'Email, verification code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const normEmail = email.trim().toLowerCase();
    const entry = passwordResetCodes.get(normEmail);

    if (!entry || entry.code !== code.trim()) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification code.' });
    }

    if (Date.now() > entry.expiresAt) {
      passwordResetCodes.delete(normEmail);
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
    }

    let targetUser: UserRecord | undefined;
    for (const u of users.values()) {
      if (u.normalizedEmail === normEmail) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    targetUser.salt = newSalt;
    targetUser.passwordHash = hashPassword(newPassword, newSalt);
    targetUser.updatedAt = Date.now();

    passwordResetCodes.delete(normEmail);

    res.json({ success: true, message: 'Password has been successfully updated. You can now log in.' });
  });

  // 19. Public Player Profile
  app.get('/api/profiles/:username', (req, res) => {
    const { username } = req.params;
    const norm = username.trim().toLowerCase();

    let targetUser: UserRecord | undefined;
    for (const u of users.values()) {
      if (u.normalizedUsername === norm || u.id === username) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Player profile not found.' });
    }

    const viewerUser = getAuthUserFromRequest(req);
    const isOwner = viewerUser ? viewerUser.id === targetUser.id : false;

    // Build user stats from actual records
    const stats = calculateUserStats(targetUser.id);

    // Active trades posted by user
    const activeTrades = Array.from(tradeAds.values()).filter(
      (t) => t.creatorId === targetUser!.id && (t.status === 'ACTIVE' || t.status === 'IN_PROGRESS')
    );

    // Resolve fruits
    const favoriteFruit = targetUser.favoriteFruitId ? SEED_FRUITS[targetUser.favoriteFruitId] || null : null;
    const lookingForFruits = (targetUser.lookingFor || [])
      .map((id) => SEED_FRUITS[id])
      .filter(Boolean);
    const notInterestedInFruits = (targetUser.notInterestedIn || [])
      .map((id) => SEED_FRUITS[id])
      .filter(Boolean);

    // Resolve badges
    const badgeCatalog: Record<string, any> = {
      community_member: {
        id: 'community_member',
        name: 'COMMUNITY MEMBER',
        description: 'Registered and verified VALUE.NET trader.',
        icon: 'verified_user',
        rarity: 'Common',
        unlockCondition: 'Create an account on VALUE.NET',
      },
      early_trader: {
        id: 'early_trader',
        name: 'EARLY TRADER',
        description: 'Joined during the Terminal V2 launch window.',
        icon: 'military_tech',
        rarity: 'Rare',
        unlockCondition: 'Registered during the early access period',
      },
      trade_scout: {
        id: 'trade_scout',
        name: 'TRADE SCOUT',
        description: 'Active creator of public live trade advertisements.',
        icon: 'explore',
        rarity: 'Rare',
        unlockCondition: 'Create 2+ Live Trade advertisements',
      },
      value_expert: {
        id: 'value_expert',
        name: 'VALUE EXPERT',
        description: 'Mastered calculator analyses and fair trade mechanics.',
        icon: 'calculate',
        rarity: 'Epic',
        unlockCondition: 'Calculate and verify 5+ successful trades',
      },
      market_watcher: {
        id: 'market_watcher',
        name: 'MARKET WATCHER',
        description: 'Active trader monitoring real-time market movements.',
        icon: 'visibility',
        rarity: 'Rare',
        unlockCondition: 'Actively participating in market trades',
      },
      verified_trader: {
        id: 'verified_trader',
        name: 'VERIFIED TRADER',
        description: 'Completed authenticated two-party live trades.',
        icon: 'handshake',
        rarity: 'Epic',
        unlockCondition: 'Successfully complete 3+ live trades',
      },
      master_negotiator: {
        id: 'master_negotiator',
        name: 'MASTER NEGOTIATOR',
        description: 'Maintains top-tier reputation with high acceptance rates.',
        icon: 'diamond',
        rarity: 'Legendary',
        unlockCondition: 'Maintain 95%+ reputation across 10+ trades',
      },
      mythical_collector: {
        id: 'mythical_collector',
        name: 'MYTHICAL COLLECTOR',
        description: 'Proud owner and fan of a Mythical class Fruit.',
        icon: 'star',
        rarity: 'Mythical',
        unlockCondition: 'Select a Mythical fruit as your favorite',
      },
    };

    const resolvedBadges = (targetUser.badges || [])
      .map((bId) => badgeCatalog[bId])
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        profile: userToProfile(targetUser, isOwner),
        badges: resolvedBadges,
        favoriteFruit,
        lookingForFruits: targetUser.showPreferences || isOwner ? lookingForFruits : [],
        notInterestedInFruits: targetUser.showPreferences || isOwner ? notInterestedInFruits : [],
        stats: targetUser.showTradeStats || isOwner ? stats : { ...stats, tradesCompleted: 0, tradesRejected: 0 },
        reputationSummary: targetUser.showTradeStats || isOwner ? stats.reputationSummary : undefined,
        activeTrades: targetUser.showActivity || isOwner ? activeTrades : [],
        isOwner,
      },
    });
  });

  // 20. Update Player Profile (Protected)
  app.put('/api/profiles/:userId', (req, res) => {
    const { userId } = req.params;
    const authUser = getAuthUserFromRequest(req);

    if (!authUser || authUser.id !== userId) {
      return res.status(403).json({ success: false, error: 'Unauthorized to modify this profile.' });
    }

    const {
      displayName,
      avatarUrl,
      bannerUrl,
      bio,
      status,
      customStatus,
      titleId,
      favoriteFruitId,
      tradingStyle,
      lookingFor,
      notInterestedIn,
      profileTheme,
      showProfile,
      showPreferences,
      showActivity,
      showTradeStats,
      server,
    } = req.body;

    if (displayName && typeof displayName === 'string') {
      authUser.displayName = displayName.trim().slice(0, 32);
    }

    if (avatarUrl && typeof avatarUrl === 'string') {
      authUser.avatarUrl = avatarUrl;
    }

    if (bannerUrl && typeof bannerUrl === 'string') {
      authUser.bannerUrl = bannerUrl;
    }

    if (bio !== undefined && typeof bio === 'string') {
      authUser.bio = bio.trim().slice(0, 160);
    }

    if (status) {
      authUser.status = status;
    }

    if (customStatus !== undefined) {
      authUser.customStatus = customStatus ? String(customStatus).trim().slice(0, 40) : undefined;
    }

    if (titleId && typeof titleId === 'string') {
      authUser.titleId = titleId;
    }

    if (favoriteFruitId !== undefined) {
      authUser.favoriteFruitId = favoriteFruitId || null;

      // Auto-unlock Mythical Collector badge if mythical fruit is selected
      if (favoriteFruitId && SEED_FRUITS[favoriteFruitId]?.rarity === 'Mythical') {
        if (!authUser.badges.includes('mythical_collector')) {
          authUser.badges.push('mythical_collector');
        }
      }
    }

    if (tradingStyle) {
      authUser.tradingStyle = tradingStyle;
    }

    if (Array.isArray(lookingFor)) {
      authUser.lookingFor = lookingFor.slice(0, 6);
    }

    if (Array.isArray(notInterestedIn)) {
      authUser.notInterestedIn = notInterestedIn.slice(0, 6);
    }

    if (profileTheme) {
      authUser.profileTheme = profileTheme;
    }

    if (typeof showProfile === 'boolean') authUser.showProfile = showProfile;
    if (typeof showPreferences === 'boolean') authUser.showPreferences = showPreferences;
    if (typeof showActivity === 'boolean') authUser.showActivity = showActivity;
    if (typeof showTradeStats === 'boolean') authUser.showTradeStats = showTradeStats;
    if (server && typeof server === 'string') authUser.server = server;

    authUser.updatedAt = Date.now();

    // Synchronize active trade ads with updated display name & avatar
    for (const ad of tradeAds.values()) {
      if (ad.creatorId === authUser.id) {
        ad.creatorName = authUser.displayName;
        ad.creatorAvatar = authUser.avatarUrl;
        ad.server = authUser.server;
      }
    }

    res.json({
      success: true,
      profile: userToProfile(authUser, true),
    });
  });

  // 21. Safety & Incident Reporting Endpoint
  app.post('/api/safety/report', (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkRateLimit(`report:${clientIp}`, 10, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded for reports. Please wait a moment.' });
    }

    const { category, target, reason, details } = req.body || {};
    if (!target || typeof target !== 'string' || !reason || typeof reason !== 'string') {
      return res.status(400).json({ success: false, error: 'Target identifier and reason are required.' });
    }

    const authUser = getAuthUserFromRequest(req);
    const reportId = `REP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReport: SafetyReportRecord = {
      id: reportId,
      category: sanitizeString(category || 'GENERAL'),
      target: sanitizeString(target).slice(0, 100),
      reason: sanitizeString(reason).slice(0, 150),
      details: sanitizeString(details || '').slice(0, 1000),
      reporterIp: clientIp,
      reporterUserId: authUser?.id,
      timestamp: Date.now(),
      status: 'PENDING',
    };

    safetyReports.push(newReport);

    // Keep memory bounded to last 1000 reports
    if (safetyReports.length > 1000) {
      safetyReports.shift();
    }

    res.json({
      success: true,
      reportId,
      message: 'Incident report has been queued for moderation review.',
    });
  });

  // 22. Community Support & Contact Form Endpoint
  app.post('/api/contact', (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkRateLimit(`contact:${clientIp}`, 8, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ success: false, error: 'Contact submission rate limit exceeded. Please wait a moment.' });
    }

    const { category, name, email, subject, message } = req.body || {};
    if (!name || typeof name !== 'string' || !subject || typeof subject !== 'string' || !message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Name, subject, and message are required.' });
    }

    const ticketId = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTicket: ContactTicketRecord = {
      id: ticketId,
      category: sanitizeString(category || 'GENERAL'),
      name: sanitizeString(name).slice(0, 80),
      email: email && typeof email === 'string' ? sanitizeString(email).slice(0, 120) : undefined,
      subject: sanitizeString(subject).slice(0, 150),
      message: sanitizeString(message).slice(0, 2000),
      ip: clientIp,
      timestamp: Date.now(),
      status: 'OPEN',
    };

    contactTickets.push(newTicket);

    // Keep memory bounded to last 1000 tickets
    if (contactTickets.length > 1000) {
      contactTickets.shift();
    }

    res.json({
      success: true,
      ticketId,
      message: 'Inquiry ticket received and logged.',
    });
  });

  // ==========================================
  // GIVEAWAYS ENGINE & REST APIS
  // ==========================================

  // Periodic timer for automatic status transitions
  setInterval(() => {
    const now = Date.now();
    for (const gw of giveaways.values()) {
      if (gw.status === 'SCHEDULED' && now >= gw.startsAt) {
        gw.status = 'ACTIVE';
        gw.updatedAt = now;
        broadcast('GIVEAWAY_UPDATED', { giveaway: gw });
      } else if (gw.status === 'ACTIVE' && now >= gw.endsAt) {
        gw.status = 'ENDED';
        gw.updatedAt = now;
        broadcast('GIVEAWAY_ENDED', { giveaway: gw });
      }
    }
  }, 4000);

  // 22. List Giveaways with Filtering & Search (Paginated & Load-Protected)
  app.get('/api/giveaways', (req, res) => {
    const filter = (req.query.filter as string) || 'ACTIVE';
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const rarity = (req.query.rarity as string) || '';
    const hostId = (req.query.hostId as string) || '';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit as string, 10) || 15));
    const authUser = getAuthUserFromRequest(req);

    let list = Array.from(giveaways.values());

    // Host or specific user filter
    if (hostId) {
      list = list.filter((g) => g.hostId === hostId);
    }

    // Tab Filter
    if (filter === 'ACTIVE') {
      list = list.filter((g) => g.status === 'ACTIVE');
    } else if (filter === 'SCHEDULED') {
      list = list.filter((g) => g.status === 'SCHEDULED');
    } else if (filter === 'ENDED') {
      list = list.filter((g) => g.status === 'ENDED' || g.status === 'COMPLETED' || g.status === 'DRAWING');
    } else if (filter === 'MY') {
      if (!authUser) {
        return res.status(401).json({ success: false, error: 'Authentication required for My Giveaways.' });
      }
      list = list.filter((g) => g.hostId === authUser.id);
    } else if (filter === 'DRAFT') {
      if (!authUser) {
        return res.status(401).json({ success: false, error: 'Authentication required for Draft Giveaways.' });
      }
      list = list.filter((g) => g.hostId === authUser.id && g.status === 'DRAFT');
    } else {
      // ALL
      if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'ROOT_OWNER' && !hostId)) {
        list = list.filter((g) => g.status !== 'DRAFT');
      }
    }

    // Text search in title, description, prizes, and host
    if (search) {
      list = list.filter((g) => {
        const titleMatch = g.title.toLowerCase().includes(search);
        const descMatch = g.description.toLowerCase().includes(search);
        const hostMatch = g.hostName.toLowerCase().includes(search) || g.hostDisplayName.toLowerCase().includes(search);
        const prizeMatch = g.prizes.some((p) => p.name.toLowerCase().includes(search) || p.fruitId.toLowerCase().includes(search));
        return titleMatch || descMatch || hostMatch || prizeMatch;
      });
    }

    // Rarity filter
    if (rarity && rarity !== 'ALL') {
      list = list.filter((g) => g.prizes.some((p) => p.rarity.toLowerCase() === rarity.toLowerCase()));
    }

    // Map enriched status (hasJoined, isHost, YouTube Boost stats)
    const enriched = list.map((g) => sanitizeGiveawayForClient(g, authUser));

    // Sorting
    enriched.sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status === 'ACTIVE') {
        return a.endsAt - b.endsAt;
      }
      if (a.status === 'ACTIVE') return -1;
      if (b.status === 'ACTIVE') return 1;

      if (a.status === 'SCHEDULED' && b.status === 'SCHEDULED') {
        return a.startsAt - b.startsAt;
      }
      if (a.status === 'SCHEDULED') return -1;
      if (b.status === 'SCHEDULED') return 1;

      return b.updatedAt - a.updatedAt;
    });

    const total = enriched.length;
    const startIndex = (page - 1) * limit;
    const paginated = enriched.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      giveaways: paginated,
      total,
      page,
      limit,
    });
  });

  // 23. Get Single Giveaway Detail
  app.get('/api/giveaways/:id', (req, res) => {
    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    const authUser = getAuthUserFromRequest(req);
    res.json({
      success: true,
      giveaway: sanitizeGiveawayForClient(gw, authUser),
    });
  });

  // 24. Create Giveaway (Host / Admin Only)
  app.post('/api/giveaways', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    // Role check: ROOT_OWNER, ADMIN, and APPROVED_CREATOR are authorized to host giveaways
    if (authUser.role !== 'ROOT_OWNER' && authUser.role !== 'ADMIN' && authUser.role !== 'APPROVED_CREATOR') {
      return res.status(403).json({
        success: false,
        error: 'Only Approved Creators, Admins, and Root Owner can create giveaways. Contact an administrator to apply for creator status.',
      });
    }

    if (authUser.isGiveawaySuspended) {
      return res.status(403).json({
        success: false,
        error: 'Your giveaway hosting privileges have been suspended. Please contact moderation.',
      });
    }

    const {
      title,
      description,
      prizes,
      rules,
      eligibility,
      startsAt,
      endsAt,
      maxParticipants,
      allowLeave,
      status: requestedStatus,
      youtubeBoostEnabled,
      youtubeUrl,
      youtubeVideoId,
      youtubeSecretCode,
      youtubeBoostPercentage,
    } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Giveaway title must be at least 3 characters long.' });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Please provide a descriptive explanation (minimum 10 characters).' });
    }

    if (!prizes || !Array.isArray(prizes) || prizes.length === 0) {
      return res.status(400).json({ success: false, error: 'Giveaway must contain at least one prize.' });
    }

    const cleanPrizes: GiveawayPrize[] = [];
    for (let i = 0; i < prizes.length; i++) {
      const p = prizes[i];
      if (!p.name || !p.fruitId) {
        return res.status(400).json({ success: false, error: `Invalid prize item at position ${i + 1}.` });
      }
      cleanPrizes.push({
        id: p.id || `pz-${Date.now()}-${i}`,
        fruitId: p.fruitId,
        quantity: Math.max(1, parseInt(p.quantity, 10) || 1),
        name: p.name.trim(),
        rarity: p.rarity || 'Common',
        icon: p.icon || 'nutrition',
        marketValue: Number(p.marketValue) || 0,
        beliPrice: Number(p.beliPrice) || 0,
        type: p.type || 'Natural',
      });
    }

    const now = Date.now();
    const cleanStartsAt = Number(startsAt) || now;
    const cleanEndsAt = Number(endsAt) || (now + 86400000);

    if (cleanEndsAt <= cleanStartsAt) {
      return res.status(400).json({ success: false, error: 'End time must be after the start time.' });
    }

    if (cleanEndsAt <= now && requestedStatus !== 'DRAFT') {
      return res.status(400).json({ success: false, error: 'End time cannot be in the past.' });
    }

    let resolvedStatus: GiveawayStatus = 'DRAFT';
    if (requestedStatus === 'DRAFT') {
      resolvedStatus = 'DRAFT';
    } else if (cleanStartsAt <= now) {
      resolvedStatus = 'ACTIVE';
    } else {
      resolvedStatus = 'SCHEDULED';
    }

    const cleanRules: GiveawayRule[] = Array.isArray(rules) && rules.length > 0
      ? rules.map((r: any, idx: number) => ({
          id: r.id || `r-${idx}`,
          ruleType: r.ruleType || 'custom',
          ruleText: r.ruleText || 'Follow giveaway guidelines',
          sortOrder: idx + 1,
        }))
      : [
          { id: 'r-1', ruleType: 'account_required', ruleText: 'VALUE.NET account required', sortOrder: 1 },
          { id: 'r-2', ruleType: 'single_entry', ruleText: 'One entry per player', sortOrder: 2 },
        ];

    const titleLabels: Record<string, string> = {
      new_trader: 'NEW TRADER',
      value_hunter: 'VALUE HUNTER',
      fruit_dealer: 'FRUIT DEALER',
      market_watcher: 'MARKET WATCHER',
      trade_scout: 'TRADE SCOUT',
      value_expert: 'VALUE EXPERT',
      elite_trader: 'ELITE TRADER',
      kitsune_shrine: 'KITSUNE SHRINE',
      dragon_emperor: 'DRAGON EMPEROR',
    };

    // Process YouTube Code Boost if enabled
    let cleanVideoId: string | undefined;
    let boostSalt: string | undefined;
    let boostHash: string | undefined;
    let boostPct: number | undefined;

    if (youtubeBoostEnabled) {
      cleanVideoId = extractYoutubeVideoId(youtubeVideoId || youtubeUrl || '') || undefined;
      if (!cleanVideoId) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid YouTube video URL or 11-character video ID for the code boost.',
        });
      }
      if (!youtubeSecretCode || typeof youtubeSecretCode !== 'string' || youtubeSecretCode.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Please define a secret code that viewers must find in your YouTube video (minimum 2 characters).',
        });
      }
      boostSalt = crypto.randomBytes(16).toString('hex');
      boostHash = hashGiveawaySecretCode(youtubeSecretCode, boostSalt);
      boostPct = Number(youtubeBoostPercentage) === 5 ? 5 : 10;
    }

    const newGiveaway: GiveawayItem = {
      id: `gw-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      hostId: authUser.id,
      hostName: authUser.username,
      hostDisplayName: authUser.displayName,
      hostAvatar: authUser.avatarUrl,
      hostTitle: titleLabels[authUser.titleId] || 'CREATOR',
      hostRole: authUser.role,
      hostBadges: authUser.badges || [],
      title: title.trim().slice(0, 90),
      description: description.trim().slice(0, 1500),
      prizes: cleanPrizes,
      rules: cleanRules,
      eligibility: {
        minAccountAgeDays: Math.max(0, parseInt(eligibility?.minAccountAgeDays, 10) || 0),
        minTrades: Math.max(0, parseInt(eligibility?.minTrades, 10) || 0),
        verifiedAccountRequired: eligibility?.verifiedAccountRequired !== false,
      },
      status: resolvedStatus,
      startsAt: cleanStartsAt,
      endsAt: cleanEndsAt,
      maxParticipants: maxParticipants ? Math.max(1, parseInt(maxParticipants, 10)) : null,
      participantCount: 0,
      allowLeave: allowLeave !== false,
      createdAt: now,
      updatedAt: now,
      reportCount: 0,
      youtubeBoostEnabled: !!youtubeBoostEnabled,
      youtubeVideoId: cleanVideoId,
      youtubeBoostPercentage: boostPct,
      youtubeCodeSalt: boostSalt,
      youtubeCodeHash: boostHash,
    };

    giveaways.set(newGiveaway.id, newGiveaway);
    giveawayEntries.set(newGiveaway.id, new Map());

    broadcast('GIVEAWAY_CREATED', { giveaway: sanitizeGiveawayForClient(newGiveaway, authUser) });

    res.status(201).json({
      success: true,
      giveaway: sanitizeGiveawayForClient(newGiveaway, authUser),
    });
  });

  // 25. Edit Giveaway (Host / Admin Only)
  app.put('/api/giveaways/:id', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    if (authUser.id !== gw.hostId && authUser.role !== 'ADMIN' && authUser.role !== 'ROOT_OWNER') {
      return res.status(403).json({ success: false, error: 'Permission denied. Only the host, an Admin, or Root Owner can edit.' });
    }

    if (gw.status === 'COMPLETED' || gw.status === 'CANCELLED' || gw.status === 'ENDED') {
      return res.status(400).json({ success: false, error: `Cannot edit a giveaway that is ${gw.status}.` });
    }

    const {
      title,
      description,
      prizes,
      rules,
      eligibility,
      startsAt,
      endsAt,
      maxParticipants,
      allowLeave,
      status: targetStatus,
      youtubeBoostEnabled,
      youtubeUrl,
      youtubeVideoId,
      youtubeSecretCode,
      youtubeBoostPercentage,
    } = req.body;

    // Validate based on state
    if (title && typeof title === 'string' && title.trim().length >= 3) {
      gw.title = title.trim().slice(0, 90);
    }
    if (description && typeof description === 'string' && description.trim().length >= 10) {
      gw.description = description.trim().slice(0, 1500);
    }

    // Prizes editable if DRAFT or SCHEDULED
    if ((gw.status === 'DRAFT' || gw.status === 'SCHEDULED') && Array.isArray(prizes) && prizes.length > 0) {
      gw.prizes = prizes.map((p: any, i: number) => ({
        id: p.id || `pz-${Date.now()}-${i}`,
        fruitId: p.fruitId,
        quantity: Math.max(1, parseInt(p.quantity, 10) || 1),
        name: p.name,
        rarity: p.rarity,
        icon: p.icon || 'nutrition',
        marketValue: Number(p.marketValue) || 0,
        beliPrice: Number(p.beliPrice) || 0,
        type: p.type || 'Natural',
      }));
    }

    // Rules
    if (Array.isArray(rules) && rules.length > 0) {
      gw.rules = rules.map((r: any, idx: number) => ({
        id: r.id || `r-${idx}`,
        ruleType: r.ruleType || 'custom',
        ruleText: r.ruleText,
        sortOrder: idx + 1,
      }));
    }

    // Eligibility
    if (eligibility) {
      gw.eligibility = {
        minAccountAgeDays: Math.max(0, parseInt(eligibility.minAccountAgeDays, 10) || 0),
        minTrades: Math.max(0, parseInt(eligibility.minTrades, 10) || 0),
        verifiedAccountRequired: eligibility.verifiedAccountRequired !== false,
      };
    }

    // YouTube Boost updates (allowed in DRAFT, SCHEDULED, and ACTIVE)
    if (youtubeBoostEnabled !== undefined) {
      gw.youtubeBoostEnabled = !!youtubeBoostEnabled;
      if (gw.youtubeBoostEnabled) {
        if (youtubeUrl || youtubeVideoId) {
          const parsedId = extractYoutubeVideoId(youtubeVideoId || youtubeUrl);
          if (parsedId) gw.youtubeVideoId = parsedId;
        }
        if (youtubeSecretCode && typeof youtubeSecretCode === 'string' && youtubeSecretCode.trim().length >= 2) {
          const salt = crypto.randomBytes(16).toString('hex');
          gw.youtubeCodeSalt = salt;
          gw.youtubeCodeHash = hashGiveawaySecretCode(youtubeSecretCode, salt);
        }
        if (youtubeBoostPercentage !== undefined) {
          gw.youtubeBoostPercentage = Number(youtubeBoostPercentage) === 5 ? 5 : 10;
        }
      }
    }

    // Timing (if DRAFT or SCHEDULED)
    const now = Date.now();
    if (gw.status === 'DRAFT' || gw.status === 'SCHEDULED') {
      if (startsAt) gw.startsAt = Number(startsAt);
      if (endsAt && Number(endsAt) > gw.startsAt) gw.endsAt = Number(endsAt);

      if (targetStatus === 'ACTIVE' || (gw.status === 'SCHEDULED' && gw.startsAt <= now)) {
        gw.status = 'ACTIVE';
      }
    } else if (gw.status === 'ACTIVE') {
      // For active, only extending end date or increasing max participants allowed
      if (endsAt && Number(endsAt) > now) {
        gw.endsAt = Number(endsAt);
      }
    }

    if (maxParticipants !== undefined) {
      const entryMap = giveawayEntries.get(gw.id);
      const curCount = entryMap ? entryMap.size : gw.participantCount;
      if (maxParticipants === null || maxParticipants === '') {
        gw.maxParticipants = null;
      } else {
        const parsed = parseInt(maxParticipants, 10);
        if (parsed >= curCount) {
          gw.maxParticipants = parsed;
        }
      }
    }

    if (allowLeave !== undefined) {
      gw.allowLeave = allowLeave !== false;
    }

    gw.updatedAt = Date.now();

    broadcast('GIVEAWAY_UPDATED', { giveaway: sanitizeGiveawayForClient(gw, authUser) });

    res.json({
      success: true,
      giveaway: sanitizeGiveawayForClient(gw, authUser),
    });
  });

  // 26. Join Giveaway (Authenticated Members) - supports /join and /enter aliases
  app.post(['/api/giveaways/:id/join', '/api/giveaways/:id/enter'], (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Sign in to enter this giveaway.' });
    }

    const joinLimit = checkRateLimit(`gw_join:${authUser.id}`, 15, 60000, 1000);
    if (!joinLimit.allowed) {
      return res.status(429).json({ success: false, error: joinLimit.error || 'Too many join attempts. Please slow down.' });
    }

    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    if (gw.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: `Cannot join. This giveaway is currently ${gw.status.toLowerCase()}.` });
    }

    const now = Date.now();
    if (now < gw.startsAt) {
      return res.status(400).json({ success: false, error: 'This giveaway has not started yet.' });
    }

    if (now >= gw.endsAt) {
      gw.status = 'ENDED';
      gw.updatedAt = now;
      broadcast('GIVEAWAY_ENDED', { giveaway: gw });
      return res.status(400).json({ success: false, error: 'This giveaway has ended.' });
    }

    let entryMap = giveawayEntries.get(id);
    if (!entryMap) {
      entryMap = new Map();
      giveawayEntries.set(id, entryMap);
    }

    // Check duplicate entry (guaranteed unique by Map key = userId)
    if (entryMap.has(authUser.id)) {
      return res.status(409).json({ success: false, error: 'You have already entered this giveaway.' });
    }

    // Participant limit check
    if (gw.maxParticipants && entryMap.size >= gw.maxParticipants) {
      return res.status(400).json({ success: false, error: 'This giveaway has reached its maximum participant limit.' });
    }

    // Eligibility check
    const stats = calculateUserStats(authUser.id);
    if (gw.eligibility.minTrades && stats.tradesCompleted < gw.eligibility.minTrades) {
      return res.status(403).json({
        success: false,
        error: `Eligibility requirement not met: You need at least ${gw.eligibility.minTrades} completed trades (you have ${stats.tradesCompleted}).`,
      });
    }

    if (gw.eligibility.minAccountAgeDays && gw.eligibility.minAccountAgeDays > 0) {
      const ageDays = (now - authUser.createdAt) / 86400000;
      if (ageDays < gw.eligibility.minAccountAgeDays) {
        return res.status(403).json({
          success: false,
          error: `Eligibility requirement not met: Account must be at least ${gw.eligibility.minAccountAgeDays} days old.`,
        });
      }
    }

    const newEntry: GiveawayEntry = {
      id: `ent-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      giveawayId: gw.id,
      userId: authUser.id,
      username: authUser.username,
      displayName: authUser.displayName,
      avatarUrl: authUser.avatarUrl,
      joinedAt: now,
      eligibilityState: 'ELIGIBLE',
    };

    entryMap.set(authUser.id, newEntry);
    gw.participantCount = entryMap.size;
    gw.updatedAt = now;

    broadcast('GIVEAWAY_JOINED', {
      giveawayId: gw.id,
      participantCount: gw.participantCount,
      user: {
        id: authUser.id,
        username: authUser.username,
        displayName: authUser.displayName,
        avatarUrl: authUser.avatarUrl,
      },
    });

    res.json({
      success: true,
      message: 'Successfully entered the giveaway! Good luck!',
      participantCount: gw.participantCount,
      hasJoined: true,
    });
  });

  // 27. Leave Giveaway
  app.post('/api/giveaways/:id/leave', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    if (!gw.allowLeave) {
      return res.status(400).json({ success: false, error: 'The host does not permit leaving this giveaway.' });
    }

    if (gw.status !== 'ACTIVE' && gw.status !== 'SCHEDULED') {
      return res.status(400).json({ success: false, error: 'Cannot leave a giveaway that has ended or completed.' });
    }

    const entryMap = giveawayEntries.get(id);
    if (!entryMap || !entryMap.has(authUser.id)) {
      return res.status(400).json({ success: false, error: 'You are not entered in this giveaway.' });
    }

    entryMap.delete(authUser.id);
    gw.participantCount = entryMap.size;
    gw.updatedAt = Date.now();

    broadcast('GIVEAWAY_LEFT', {
      giveawayId: gw.id,
      participantCount: gw.participantCount,
    });

    res.json({
      success: true,
      message: 'You have left the giveaway.',
      participantCount: gw.participantCount,
      hasJoined: false,
    });
  });

  // 28. Redeem Secret YouTube Video Giveaway Boost (Secure Server-Side Hash Verification) - supports /redeem-boost and /verify-code aliases
  app.post(['/api/giveaways/:id/redeem-boost', '/api/giveaways/:id/verify-code'], (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required to redeem giveaway boost.' });
    }

    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    // Protect verification endpoint against brute-force attempts with lightweight rate-limiting
    const redeemLimit = checkRateLimit(`gw_redeem:${authUser.id}:${id}`, 6, 60000, 1000);
    if (!redeemLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many secret code verification attempts. Please wait a moment before trying again.',
      });
    }

    if (gw.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Boost redemption is only available for active giveaways (Current status: ${gw.status.toLowerCase()}).`,
      });
    }

    if (!gw.youtubeBoostEnabled || !gw.youtubeCodeHash || !gw.youtubeCodeSalt) {
      return res.status(400).json({
        success: false,
        error: 'This giveaway does not have a secret YouTube boost code enabled.',
      });
    }

    const { code } = req.body;
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter the secret code found in the creator\'s YouTube video.',
      });
    }

    const entryMap = giveawayEntries.get(id);
    const userEntry = entryMap?.get(authUser.id);

    if (!userEntry) {
      return res.status(400).json({
        success: false,
        error: 'Please enter the giveaway first before redeeming your secret YouTube boost code!',
        requiresJoin: true,
      });
    }

    // Strict uniqueness check: Only ONE successful redemption per user per giveaway
    if (userEntry.hasYoutubeBoost) {
      return res.status(400).json({
        success: false,
        error: `You have already redeemed your secret code (+${userEntry.boostPercentage || gw.youtubeBoostPercentage || 10}%) for this giveaway!`,
        alreadyBoosted: true,
      });
    }

    // Hash user's submitted code with the giveaway salt and perform constant-time comparison
    const inputHash = hashGiveawaySecretCode(code, gw.youtubeCodeSalt);
    const expectedHash = gw.youtubeCodeHash;

    const isMatch =
      inputHash.length === expectedHash.length &&
      crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(expectedHash));

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid secret code. Please verify the code from the creator\'s video and try again.',
      });
    }

    // Apply Boost to Participant Entry (determined strictly server-side)
    const boostPct = Number(gw.youtubeBoostPercentage) === 5 ? 5 : 10;
    userEntry.hasYoutubeBoost = true;
    userEntry.boostPercentage = boostPct;
    userEntry.boostRedeemedAt = Date.now();
    userEntry.ticketWeight = 1.0 + (boostPct / 100);

    gw.updatedAt = Date.now();

    // Dispatch in-app notification to user
    addNotification(authUser.id, {
      userId: authUser.id,
      title: '🚀 YouTube Giveaway Boost Activated!',
      message: `Secret code verified! +${boostPct}% winning chance boost activated for "${gw.title}".`,
      type: 'system',
      giveawayId: gw.id,
    });

    const sanitizedGw = sanitizeGiveawayForClient(gw, authUser);

    // Broadcast Real-Time Boost Event
    broadcast('GIVEAWAY_BOOST_REDEEMED', {
      giveawayId: gw.id,
      userId: authUser.id,
      username: authUser.username,
      boostPercentage: boostPct,
      giveaway: sanitizedGw,
    });

    res.json({
      success: true,
      message: `🎉 Secret code verified! +${boostPct}% winning chance boost activated!`,
      boostPercentage: boostPct,
      userWinProbability: sanitizedGw.userWinProbability,
      giveaway: sanitizedGw,
    });
  });

  // 29. End Giveaway Early (Host / Admin Only)
  app.post('/api/giveaways/:id/end', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    if (authUser.id !== gw.hostId && authUser.role !== 'ADMIN' && authUser.role !== 'ROOT_OWNER') {
      return res.status(403).json({ success: false, error: 'Only the host, an Admin, or Root Owner can end this giveaway.' });
    }

    if (gw.status !== 'ACTIVE' && gw.status !== 'SCHEDULED') {
      return res.status(400).json({ success: false, error: `Giveaway is already ${gw.status}.` });
    }

    gw.status = 'ENDED';
    gw.endsAt = Math.min(gw.endsAt, Date.now());
    gw.updatedAt = Date.now();

    const sanitized = sanitizeGiveawayForClient(gw, authUser);
    broadcast('GIVEAWAY_ENDED', { giveaway: sanitized });

    res.json({
      success: true,
      message: 'Giveaway has ended. You may now draw the winner.',
      giveaway: sanitized,
    });
  });

  // 30. Draw Winner (Weighted Probabilistic Selection with YouTube Boost Support)
  app.post('/api/giveaways/:id/draw-winner', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    if (authUser.id !== gw.hostId && authUser.role !== 'ADMIN' && authUser.role !== 'ROOT_OWNER') {
      return res.status(403).json({ success: false, error: 'Only the host, an Admin, or Root Owner can draw the winner.' });
    }

    if (gw.status === 'COMPLETED' && gw.winnerId) {
      return res.status(400).json({ success: false, error: `A winner (@${gw.winnerUsername}) was already drawn for this giveaway.` });
    }

    const entryMap = giveawayEntries.get(id);
    const validEntries = entryMap
      ? Array.from(entryMap.values()).filter((e) => e.eligibilityState === 'ELIGIBLE')
      : [];

    if (validEntries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No eligible participants found to draw a winner. Please wait for players to enter or cancel the giveaway.',
      });
    }

    // Calculate individual ticket weight for each eligible participant:
    // Non-boosted = 1.0; Boosted (+10%) = 1.10; Boosted (+5%) = 1.05
    let totalWeight = 0;
    const weightedPool = validEntries.map((e) => {
      const weight = e.hasYoutubeBoost
        ? 1.0 + ((e.boostPercentage || gw.youtubeBoostPercentage || 10) / 100)
        : 1.0;
      totalWeight += weight;
      return { entry: e, weight };
    });

    // Uniform cryptographic random selection across [0, totalWeight)
    const randomBytes = crypto.randomBytes(4);
    const randomFraction = randomBytes.readUInt32LE(0) / 0xffffffff;
    const targetWeight = randomFraction * totalWeight;

    let cumulative = 0;
    let selectedWinner = validEntries[0];
    for (const item of weightedPool) {
      cumulative += item.weight;
      if (targetWeight <= cumulative) {
        selectedWinner = item.entry;
        break;
      }
    }

    const now = Date.now();
    gw.status = 'COMPLETED';
    gw.winnerId = selectedWinner.userId;
    gw.winnerUsername = selectedWinner.username;
    gw.winnerDisplayName = selectedWinner.displayName;
    gw.winnerAvatar = selectedWinner.avatarUrl;
    gw.completedAt = now;
    gw.updatedAt = now;

    // Dispatch notification to Winner
    addNotification(selectedWinner.userId, {
      userId: selectedWinner.userId,
      title: '🎉 You Won a Giveaway!',
      message: `Congratulations! You won "${gw.title}" hosted by @${gw.hostName}${selectedWinner.hasYoutubeBoost ? ' (with YouTube Boost advantage)' : ''}! Contact the host in Trade Chat to claim your fruits!`,
      type: 'giveaway_won',
      giveawayId: gw.id,
    });

    // Dispatch notification to Host
    addNotification(gw.hostId, {
      userId: gw.hostId,
      title: 'Winner Selected',
      message: `Winner for "${gw.title}" has been selected: @${selectedWinner.username}${selectedWinner.hasYoutubeBoost ? ' (+Boost Winner)' : ''}. Connect with them to deliver the prizes!`,
      type: 'giveaway_ended',
      giveawayId: gw.id,
    });

    const sanitized = sanitizeGiveawayForClient(gw, authUser);

    broadcast('GIVEAWAY_WINNER_SELECTED', {
      giveaway: sanitized,
      winner: {
        id: selectedWinner.userId,
        username: selectedWinner.username,
        displayName: selectedWinner.displayName,
        avatarUrl: selectedWinner.avatarUrl,
        hasYoutubeBoost: selectedWinner.hasYoutubeBoost,
        boostPercentage: selectedWinner.boostPercentage,
      },
    });

    res.json({
      success: true,
      message: `Winner selected successfully: @${selectedWinner.username}!`,
      giveaway: sanitized,
      winner: selectedWinner,
    });
  });

  // 31. Cancel Giveaway (Host / Admin Only)
  app.post('/api/giveaways/:id/cancel', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    if (authUser.id !== gw.hostId && authUser.role !== 'ADMIN' && authUser.role !== 'ROOT_OWNER') {
      return res.status(403).json({ success: false, error: 'Only the host, an Admin, or Root Owner can cancel this giveaway.' });
    }

    if (gw.status === 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Cannot cancel a completed giveaway with an awarded winner.' });
    }

    gw.status = 'CANCELLED';
    gw.updatedAt = Date.now();

    const sanitized = sanitizeGiveawayForClient(gw, authUser);
    broadcast('GIVEAWAY_CANCELLED', { giveaway: sanitized });

    res.json({
      success: true,
      message: 'Giveaway has been cancelled.',
      giveaway: sanitized,
    });
  });

  // 32. Get Giveaway Participants with Weighted Win Probabilities (Host / Admin / Participants)
  app.get('/api/giveaways/:id/participants', (req, res) => {
    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    const entryMap = giveawayEntries.get(id);
    let list = entryMap ? Array.from(entryMap.values()) : [];

    const query = ((req.query.query as string) || '').trim().toLowerCase();
    const boostedOnly = (req.query.boostedOnly as string) === 'true';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    // Calculate total pool weight for accurate real-time probability
    let totalEligibleWeight = 0;
    let boostedCount = 0;
    for (const e of list) {
      if (e.eligibilityState === 'ELIGIBLE') {
        const weight = e.hasYoutubeBoost
          ? 1.0 + ((e.boostPercentage || gw.youtubeBoostPercentage || 10) / 100)
          : 1.0;
        totalEligibleWeight += weight;
        if (e.hasYoutubeBoost) boostedCount++;
      }
    }

    // Enrich each participant with weight and probability
    let enrichedList = list.map((e) => {
      const weight = e.hasYoutubeBoost
        ? 1.0 + ((e.boostPercentage || gw.youtubeBoostPercentage || 10) / 100)
        : 1.0;
      const winProbability =
        totalEligibleWeight > 0 && e.eligibilityState === 'ELIGIBLE'
          ? Number(((weight / totalEligibleWeight) * 100).toFixed(2))
          : 0;

      return {
        ...e,
        hasYoutubeBoost: !!e.hasYoutubeBoost,
        boostPercentage: e.boostPercentage || 0,
        boostRedeemedAt: e.boostRedeemedAt || null,
        ticketWeight: weight,
        winProbability,
      };
    });

    if (boostedOnly) {
      enrichedList = enrichedList.filter((e) => e.hasYoutubeBoost);
    }

    if (query) {
      enrichedList = enrichedList.filter(
        (e) => e.username.toLowerCase().includes(query) || e.displayName.toLowerCase().includes(query)
      );
    }

    enrichedList.sort((a, b) => {
      // Prioritize boosted entries or newest
      if (a.hasYoutubeBoost && !b.hasYoutubeBoost) return -1;
      if (!a.hasYoutubeBoost && b.hasYoutubeBoost) return 1;
      return b.joinedAt - a.joinedAt;
    });

    const total = enrichedList.length;
    const startIndex = (page - 1) * limit;
    const paginated = enrichedList.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      participants: paginated,
      total,
      boostedCount,
      totalEligibleWeight,
      page,
      limit,
    });
  });

  // 32. Report Giveaway
  app.post('/api/giveaways/:id/report', (req, res) => {
    const { id } = req.params;
    const gw = giveaways.get(id);
    if (!gw) {
      return res.status(404).json({ success: false, error: 'Giveaway not found.' });
    }

    const authUser = getAuthUserFromRequest(req);
    const { reason, notes } = req.body;

    const validReasons = ['misleading', 'inappropriate', 'suspicious', 'incorrect_prize', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ success: false, error: 'Please select a valid report reason.' });
    }

    const reportId = `rep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const report: GiveawayReport = {
      id: reportId,
      giveawayId: gw.id,
      giveawayTitle: gw.title,
      hostId: gw.hostId,
      hostName: gw.hostName,
      reporterId: authUser ? authUser.id : 'anon_reporter',
      reporterName: authUser ? authUser.username : 'Anonymous Trader',
      reason,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
      status: 'PENDING',
      createdAt: Date.now(),
    };

    giveawayReports.set(reportId, report);
    gw.reportCount = (gw.reportCount || 0) + 1;

    res.json({
      success: true,
      message: 'Thank you for your report. Our moderation team has been notified.',
    });
  });

  // Helper function to check role assign permission hierarchy
  function checkCanAssignRole(
    actor: UserRecord,
    targetCurrentRole: UserRole,
    targetNewRole: UserRole
  ): { allowed: boolean; error?: string } {
    if (targetCurrentRole === 'ROOT_OWNER') {
      return { allowed: false, error: 'The Root Owner account is permanent and immutable. Its role cannot be modified.' };
    }
    if (targetNewRole === 'ROOT_OWNER') {
      return { allowed: false, error: 'Cannot assign Root Owner role. Root Owner authority is bound strictly to the platform owner email.' };
    }
    if (actor.role === 'ROOT_OWNER' || actor.normalizedEmail === ROOT_OWNER_EMAIL) {
      return { allowed: true };
    }
    if (actor.role === 'ADMIN') {
      if (targetCurrentRole === 'ADMIN') {
        return { allowed: false, error: 'Administrators cannot modify the role of another Administrator. Only the Root Owner can manage Admin accounts.' };
      }
      if (targetNewRole === 'ADMIN') {
        return { allowed: false, error: 'Only the Root Owner has permission to promote users to Administrator.' };
      }
      if (['MODERATOR', 'APPROVED_CREATOR', 'MEMBER'].includes(targetNewRole)) {
        return { allowed: true };
      }
    }
    return { allowed: false, error: 'Insufficient administrative privileges to assign or modify user roles.' };
  }

  // Helper function to check role revoke permission hierarchy
  function checkCanRevokeRole(
    actor: UserRecord,
    targetCurrentRole: UserRole
  ): { allowed: boolean; error?: string } {
    if (targetCurrentRole === 'ROOT_OWNER') {
      return { allowed: false, error: 'The Root Owner role is permanent and cannot be revoked.' };
    }
    if (targetCurrentRole === 'MEMBER') {
      return { allowed: false, error: 'User is already at the standard Member role.' };
    }
    if (actor.role === 'ROOT_OWNER' || actor.normalizedEmail === ROOT_OWNER_EMAIL) {
      return { allowed: true };
    }
    if (actor.role === 'ADMIN') {
      if (targetCurrentRole === 'ADMIN') {
        return { allowed: false, error: 'Administrators cannot revoke another Administrator. Only the Root Owner can revoke Admin roles.' };
      }
      return { allowed: true };
    }
    return { allowed: false, error: 'Insufficient administrative privileges to revoke user roles.' };
  }

  // ==========================================
  // AUTHORITATIVE ROLE & PERMISSION ENDPOINTS
  // ==========================================

  // 33. Search User by Email (Restricted to Root Owner & Authorized Admins)
  app.post('/api/roles/search-by-email', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!hasPermission(authUser, 'SEARCH_USER_BY_EMAIL')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to search users by email.',
      });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }

    const normEmail = email.trim().toLowerCase();
    let targetUser: UserRecord | undefined;
    for (const u of users.values()) {
      if (u.normalizedEmail === normEmail) {
        targetUser = u;
        break;
      }
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'No registered user found matching this email address.',
      });
    }

    const stats = calculateUserStats(targetUser.id);
    const targetRole: UserRole = targetUser.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (targetUser.role || 'MEMBER');

    res.json({
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        email: targetUser.email,
        role: targetRole,
        avatarUrl: targetUser.avatarUrl,
        bannerUrl: targetUser.bannerUrl,
        isSuspended: !!targetUser.isSuspended,
        isGiveawaySuspended: !!targetUser.isGiveawaySuspended,
        completedTrades: stats.tradesCompleted,
        reputationScore: stats.reputationScore,
        createdAt: targetUser.createdAt,
        roleAssignedAt: targetUser.roleAssignedAt,
        roleAssignedBy: targetUser.roleAssignedBy,
      },
    });
  });

  // 34. Assign Role to User
  app.post('/api/roles/assign', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!hasPermission(authUser, 'MANAGE_ROLES')) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to manage roles.' });
    }

    const { email, userId, newRole, reason } = req.body;
    if (!newRole || !['ADMIN', 'MODERATOR', 'APPROVED_CREATOR', 'MEMBER'].includes(newRole)) {
      return res.status(400).json({ success: false, error: 'Invalid or unsupported role specified.' });
    }

    let target: UserRecord | undefined;
    if (userId) {
      target = users.get(userId);
    } else if (email) {
      const norm = email.trim().toLowerCase();
      for (const u of users.values()) {
        if (u.normalizedEmail === norm) {
          target = u;
          break;
        }
      }
    }

    if (!target) {
      return res.status(404).json({ success: false, error: 'Target user account not found.' });
    }

    const targetCurrentRole: UserRole = target.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (target.role || 'MEMBER');

    const check = checkCanAssignRole(authUser, targetCurrentRole, newRole);
    if (!check.allowed) {
      return res.status(403).json({ success: false, error: check.error || 'Permission denied.' });
    }

    const prevRole = targetCurrentRole;
    target.role = newRole;
    target.roleAssignedAt = Date.now();
    target.roleAssignedBy = authUser.username;
    target.updatedAt = Date.now();

    const auditEntry: RoleAuditLog = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      targetId: target.id,
      targetUsername: target.username,
      targetEmail: target.email,
      previousRole: prevRole,
      newRole,
      action: 'ROLE_ASSIGNED',
      reason: reason ? String(reason).trim().slice(0, 300) : `Role assigned by @${authUser.username}`,
      timestamp: Date.now(),
    };

    roleAuditLogs.unshift(auditEntry);

    // Notify target user
    addNotification(target.id, {
      userId: target.id,
      title: '🛡️ Role Permissions Updated',
      message: `Your account role on VALUE.NET was updated to ${newRole} by @${authUser.username}.`,
      type: 'system',
    });

    broadcast('ROLE_CHANGED', {
      userId: target.id,
      username: target.username,
      role: newRole,
      updatedBy: authUser.username,
    });

    res.json({
      success: true,
      message: `Successfully updated role of @${target.username} to ${newRole}.`,
      user: userToProfile(target, true),
      auditLog: auditEntry,
    });
  });

  // 35. Revoke Role (Demote to MEMBER)
  app.post('/api/roles/revoke', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!hasPermission(authUser, 'REVOKE_ROLES')) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to revoke roles.' });
    }

    const { email, userId, reason } = req.body;

    let target: UserRecord | undefined;
    if (userId) {
      target = users.get(userId);
    } else if (email) {
      const norm = email.trim().toLowerCase();
      for (const u of users.values()) {
        if (u.normalizedEmail === norm) {
          target = u;
          break;
        }
      }
    }

    if (!target) {
      return res.status(404).json({ success: false, error: 'Target user account not found.' });
    }

    const targetCurrentRole: UserRole = target.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (target.role || 'MEMBER');

    const check = checkCanRevokeRole(authUser, targetCurrentRole);
    if (!check.allowed) {
      return res.status(403).json({ success: false, error: check.error || 'Permission denied.' });
    }

    const prevRole = targetCurrentRole;
    target.role = 'MEMBER';
    target.roleAssignedAt = Date.now();
    target.roleAssignedBy = authUser.username;
    target.updatedAt = Date.now();

    const auditEntry: RoleAuditLog = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      targetId: target.id,
      targetUsername: target.username,
      targetEmail: target.email,
      previousRole: prevRole,
      newRole: 'MEMBER',
      action: 'ROLE_REVOKED',
      reason: reason ? String(reason).trim().slice(0, 300) : `Role revoked by @${authUser.username}`,
      timestamp: Date.now(),
    };

    roleAuditLogs.unshift(auditEntry);

    // Notify target user
    addNotification(target.id, {
      userId: target.id,
      title: '🛡️ Role Permissions Revoked',
      message: `Your special role on VALUE.NET was revoked by @${authUser.username}. Your role is now Member.`,
      type: 'system',
    });

    broadcast('ROLE_CHANGED', {
      userId: target.id,
      username: target.username,
      role: 'MEMBER',
      updatedBy: authUser.username,
    });

    res.json({
      success: true,
      message: `Successfully revoked role from @${target.username}. Account reverted to Member.`,
      user: userToProfile(target, true),
      auditLog: auditEntry,
    });
  });

  // 36. Get Role Audit Logs
  app.get('/api/roles/audit-log', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!hasPermission(authUser, 'VIEW_AUDIT_LOG')) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to view audit logs.' });
    }

    res.json({
      success: true,
      logs: roleAuditLogs,
    });
  });

  // ==========================================
  // ADMINISTRATION & MODERATION ENDPOINTS
  // ==========================================

  // 37. Admin / Owner Overview Stats
  app.get('/api/admin/overview-stats', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!hasPermission(authUser, 'ACCESS_ADMIN_PANEL') && !hasPermission(authUser, 'ACCESS_OWNER_PANEL'))) {
      return res.status(403).json({ success: false, error: 'Administrative access required.' });
    }

    let rootOwnerCount = 0;
    let adminCount = 0;
    let modCount = 0;
    let creatorCount = 0;
    let memberCount = 0;
    let suspendedCount = 0;

    for (const u of users.values()) {
      const r = u.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (u.role || 'MEMBER');
      if (r === 'ROOT_OWNER') rootOwnerCount++;
      else if (r === 'ADMIN') adminCount++;
      else if (r === 'MODERATOR') modCount++;
      else if (r === 'APPROVED_CREATOR') creatorCount++;
      else memberCount++;

      if (u.isSuspended) suspendedCount++;
    }

    const totalGiveaways = giveaways.size;
    let activeGiveaways = 0;
    for (const gw of giveaways.values()) {
      if (gw.status === 'ACTIVE') activeGiveaways++;
    }

    const totalTrades = tradeAds.size;
    let activeTrades = 0;
    for (const t of tradeAds.values()) {
      if (t.status === 'ACTIVE') activeTrades++;
    }

    let pendingReports = 0;
    for (const rep of giveawayReports.values()) {
      if (rep.status === 'PENDING') pendingReports++;
    }

    res.json({
      success: true,
      stats: {
        totalUsers: users.size,
        roleBreakdown: {
          ROOT_OWNER: rootOwnerCount,
          ADMIN: adminCount,
          MODERATOR: modCount,
          APPROVED_CREATOR: creatorCount,
          MEMBER: memberCount,
        },
        suspendedUsers: suspendedCount,
        totalGiveaways,
        activeGiveaways,
        totalTrades,
        activeTrades,
        pendingReports,
        totalAuditEvents: roleAuditLogs.length + moderationAuditLogs.length,
      },
    });
  });

  // 38. Admin: List All Users with Filtering
  app.get('/api/admin/users', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MANAGE_USERS')) {
      return res.status(403).json({ success: false, error: 'Administrative access required.' });
    }

    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const roleFilter = (req.query.role as string) || '';
    const statusFilter = (req.query.status as string) || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    let list = Array.from(users.values());

    if (search) {
      list = list.filter(
        (u) =>
          u.normalizedUsername.includes(search) ||
          u.displayName.toLowerCase().includes(search) ||
          u.normalizedEmail.includes(search)
      );
    }

    if (roleFilter && roleFilter !== 'ALL') {
      list = list.filter((u) => {
        const r = u.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (u.role || 'MEMBER');
        return r === roleFilter;
      });
    }

    if (statusFilter === 'SUSPENDED') {
      list = list.filter((u) => u.isSuspended || u.isGiveawaySuspended);
    } else if (statusFilter === 'ACTIVE') {
      list = list.filter((u) => !u.isSuspended && !u.isGiveawaySuspended);
    }

    const userItems = list.map((u) => {
      const stats = calculateUserStats(u.id);
      const r: UserRole = u.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (u.role || 'MEMBER');
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        role: r,
        avatarUrl: u.avatarUrl,
        bannerUrl: u.bannerUrl,
        isSuspended: !!u.isSuspended,
        suspendedReason: u.suspendedReason,
        isGiveawaySuspended: !!u.isGiveawaySuspended,
        completedTrades: stats.tradesCompleted,
        reputationScore: stats.reputationScore,
        createdAt: u.createdAt,
        roleAssignedAt: u.roleAssignedAt,
        roleAssignedBy: u.roleAssignedBy,
      };
    });

    // Sort: ROOT_OWNER first, then ADMIN, then MOD, then CREATOR, then MEMBER, by createdAt desc
    userItems.sort((a, b) => {
      const weightDiff = ROLE_WEIGHTS[b.role] - ROLE_WEIGHTS[a.role];
      if (weightDiff !== 0) return weightDiff;
      return b.createdAt - a.createdAt;
    });

    const total = userItems.length;
    const startIndex = (page - 1) * limit;
    const paginated = userItems.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      users: paginated,
      total,
      page,
      limit,
    });
  });

  // 39. Suspend User / Suspend Giveaway Privileges
  app.post('/api/admin/users/suspend', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'SUSPEND_USERS')) {
      return res.status(403).json({ success: false, error: 'Moderation privileges required to suspend accounts.' });
    }

    const { userId, reason, suspendGiveaways, fullSuspend } = req.body;
    const target = users.get(userId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (target.normalizedEmail === ROOT_OWNER_EMAIL || target.role === 'ROOT_OWNER') {
      return res.status(403).json({ success: false, error: 'Cannot suspend the Root Owner account.' });
    }

    if (authUser.role !== 'ROOT_OWNER' && ROLE_WEIGHTS[target.role] >= ROLE_WEIGHTS[authUser.role]) {
      return res.status(403).json({ success: false, error: 'Cannot moderate a staff member with equal or higher authority.' });
    }

    if (fullSuspend) {
      target.isSuspended = true;
      target.suspendedReason = reason ? String(reason).slice(0, 200) : 'Violation of platform terms';
      target.suspendedAt = Date.now();
      target.suspendedBy = authUser.username;
    }

    if (suspendGiveaways) {
      target.isGiveawaySuspended = true;
    }

    target.updatedAt = Date.now();

    const auditEntry: ModerationAuditLog = {
      id: `mod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      targetId: target.id,
      targetName: target.username,
      action: 'USER_SUSPENDED',
      reason: reason || 'Suspension by moderation',
      metadata: { fullSuspend, suspendGiveaways },
      timestamp: Date.now(),
    };
    moderationAuditLogs.unshift(auditEntry);

    res.json({
      success: true,
      message: `Account @${target.username} has been suspended.`,
      user: userToProfile(target, true),
    });
  });

  // 40. Unsuspend User
  app.post('/api/admin/users/unsuspend', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'SUSPEND_USERS')) {
      return res.status(403).json({ success: false, error: 'Moderation privileges required.' });
    }

    const { userId } = req.body;
    const target = users.get(userId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    target.isSuspended = false;
    target.suspendedReason = undefined;
    target.suspendedAt = undefined;
    target.suspendedBy = undefined;
    target.isGiveawaySuspended = false;
    target.updatedAt = Date.now();

    const auditEntry: ModerationAuditLog = {
      id: `mod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      targetId: target.id,
      targetName: target.username,
      action: 'USER_UNSUSPENDED',
      reason: 'Reinstated by moderation',
      timestamp: Date.now(),
    };
    moderationAuditLogs.unshift(auditEntry);

    res.json({
      success: true,
      message: `Account @${target.username} has been restored.`,
      user: userToProfile(target, true),
    });
  });

  // 41. Moderation Reports Queue
  app.get('/api/admin/moderation/reports', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MODERATE_GIVEAWAY_REPORTS')) {
      return res.status(403).json({ success: false, error: 'Moderator access required.' });
    }

    const reports = Array.from(giveawayReports.values());
    reports.sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      reports,
    });
  });

  // 42. Resolve Moderation Report
  app.post('/api/admin/moderation/reports/:reportId/resolve', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MODERATE_GIVEAWAY_REPORTS')) {
      return res.status(403).json({ success: false, error: 'Moderator access required.' });
    }

    const { reportId } = req.params;
    const report = giveawayReports.get(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }

    const { action, notes } = req.body;
    const targetGw = giveaways.get(report.giveawayId);

    if (action === 'dismiss' || action === 'DISMISS') {
      report.status = 'DISMISSED';
    } else if (action === 'action_cancel_giveaway' || action === 'CANCEL_GIVEAWAY') {
      report.status = 'ACTIONED';
      if (targetGw && targetGw.status !== 'COMPLETED') {
        targetGw.status = 'CANCELLED';
        targetGw.updatedAt = Date.now();
        broadcast('GIVEAWAY_CANCELLED', { giveaway: targetGw });
      }
    } else if (action === 'action_suspend_host' || action === 'SUSPEND_HOST') {
      report.status = 'ACTIONED';
      const hostUser = users.get(report.hostId);
      if (hostUser && hostUser.normalizedEmail !== ROOT_OWNER_EMAIL) {
        hostUser.isGiveawaySuspended = true;
      }
      if (targetGw && targetGw.status !== 'COMPLETED') {
        targetGw.status = 'CANCELLED';
        targetGw.updatedAt = Date.now();
        broadcast('GIVEAWAY_CANCELLED', { giveaway: targetGw });
      }
    }

    const auditEntry: ModerationAuditLog = {
      id: `mod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      targetId: report.id,
      targetName: report.giveawayTitle,
      action: 'REPORT_ACTIONED',
      reason: `Action: ${action}. Notes: ${notes || 'None'}`,
      timestamp: Date.now(),
    };
    moderationAuditLogs.unshift(auditEntry);

    res.json({
      success: true,
      message: `Report has been updated. Action: ${action}`,
      report,
    });
  });

  // 43. Moderate Live Trade Ad
  app.delete('/api/admin/moderation/trades/:tradeId', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MODERATE_LIVE_TRADES')) {
      return res.status(403).json({ success: false, error: 'Moderation privileges required.' });
    }

    const { tradeId } = req.params;
    const trade = tradeAds.get(tradeId);
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade ad not found.' });
    }

    const { reason } = req.body || {};
    trade.status = 'CANCELLED';
    trade.updatedAt = Date.now();

    const auditEntry: ModerationAuditLog = {
      id: `mod-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      targetId: trade.id,
      targetName: `Trade #${trade.id} (@${trade.creatorName})`,
      action: 'TRADE_REMOVED',
      reason: reason || 'Listing removed by moderation',
      timestamp: Date.now(),
    };
    moderationAuditLogs.unshift(auditEntry);

    broadcast('TRADE_CANCELLED', { tradeId: trade.id });

    res.json({
      success: true,
      message: 'Trade listing has been removed from the public marketplace.',
    });
  });

  // Platform Settings State
  let platformSettings: PlatformSettings = {
    maintenanceMode: false,
    giveawaysEnabled: true,
    maxActiveGiveawaysPerCreator: 5,
    minAccountAgeDaysForGiveaway: 0,
    tradeAdExpirationHours: 48,
    autoFlagReportsThreshold: 5,
    allowDirectParticipantSearch: true,
    updatedAt: Date.now(),
    updatedBy: 'SYSTEM',
  };

  // 44. Get Moderation Audit Logs
  app.get('/api/admin/moderation/audit-log', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'VIEW_AUDIT_LOG')) {
      return res.status(403).json({ success: false, error: 'Audit log access required.' });
    }

    res.json({
      success: true,
      logs: moderationAuditLogs,
    });
  });

  // 45. Admin Recent Activity Feed
  app.get('/api/admin/recent-activity', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!hasPermission(authUser, 'ACCESS_ADMIN_PANEL') && !hasPermission(authUser, 'ACCESS_OWNER_PANEL'))) {
      return res.status(403).json({ success: false, error: 'Administrative access required.' });
    }

    const recentRoleChanges = roleAuditLogs.slice(0, 10);
    const recentModerationActions = moderationAuditLogs.slice(0, 10);
    
    const recentGiveaways = Array.from(giveaways.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    const recentReports = Array.from(giveawayReports.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    res.json({
      success: true,
      activity: {
        recentRoleChanges,
        recentGiveaways,
        recentReports,
        recentModerationActions,
      },
    });
  });

  // 46. Admin Creators Directory
  app.get('/api/admin/creators', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!hasPermission(authUser, 'ACCESS_ADMIN_PANEL') && !hasPermission(authUser, 'ACCESS_OWNER_PANEL'))) {
      return res.status(403).json({ success: false, error: 'Administrative access required.' });
    }

    const creators: AdminCreatorItem[] = [];
    for (const u of users.values()) {
      const r = u.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (u.role || 'MEMBER');
      if (r === 'APPROVED_CREATOR' || r === 'ADMIN' || r === 'ROOT_OWNER') {
        let hostedCount = 0;
        let activeCount = 0;
        let totalPart = 0;

        for (const gw of giveaways.values()) {
          if (gw.hostId === u.id) {
            hostedCount++;
            if (gw.status === 'ACTIVE') activeCount++;
            totalPart += gw.participantCount || 0;
          }
        }

        creators.push({
          id: u.id,
          username: u.username,
          displayName: u.displayName,
          email: (authUser.role === 'ROOT_OWNER' || authUser.role === 'ADMIN') ? u.email : undefined,
          role: r,
          avatarUrl: u.avatarUrl,
          status: u.status,
          isGiveawaySuspended: !!u.isGiveawaySuspended,
          giveawaysHosted: hostedCount,
          activeGiveaways: activeCount,
          totalParticipants: totalPart,
          createdAt: u.createdAt,
          roleAssignedAt: u.roleAssignedAt,
          roleAssignedBy: u.roleAssignedBy,
        });
      }
    }

    // Sort by active giveaways, then hosted count, then createdAt desc
    creators.sort((a, b) => b.activeGiveaways - a.activeGiveaways || b.giveawaysHosted - a.giveawaysHosted || b.createdAt - a.createdAt);

    res.json({
      success: true,
      creators,
    });
  });

  // 47. Approve Creator Shortcut
  app.post('/api/admin/creators/approve', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ASSIGN_CREATOR')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot assign creator role.' });
    }

    const { userId, reason } = req.body;
    const target = users.get(userId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const targetCurrentRole: UserRole = target.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (target.role || 'MEMBER');
    const check = checkCanAssignRole(authUser, targetCurrentRole, 'APPROVED_CREATOR');
    if (!check.allowed) {
      return res.status(403).json({ success: false, error: check.error });
    }

    const prevRole = targetCurrentRole;
    target.role = 'APPROVED_CREATOR';
    target.isGiveawaySuspended = false;
    target.roleAssignedAt = Date.now();
    target.roleAssignedBy = authUser.username;
    target.updatedAt = Date.now();

    const auditEntry: RoleAuditLog = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      targetId: target.id,
      targetUsername: target.username,
      targetEmail: target.email,
      previousRole: prevRole,
      newRole: 'APPROVED_CREATOR',
      action: 'ROLE_ASSIGNED',
      reason: reason || 'Approved creator certification granted',
      timestamp: Date.now(),
    };
    roleAuditLogs.unshift(auditEntry);

    res.json({
      success: true,
      message: `User @${target.username} is now an APPROVED CREATOR.`,
      user: userToProfile(target, true),
    });
  });

  // 48. Revoke Creator Shortcut
  app.post('/api/admin/creators/revoke', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'REVOKE_ROLES')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot revoke creator role.' });
    }

    const { userId, reason } = req.body;
    const target = users.get(userId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    const targetCurrentRole: UserRole = target.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (target.role || 'MEMBER');
    const check = checkCanAssignRole(authUser, targetCurrentRole, 'MEMBER');
    if (!check.allowed) {
      return res.status(403).json({ success: false, error: check.error });
    }

    const prevRole = targetCurrentRole;
    target.role = 'MEMBER';
    target.roleAssignedAt = Date.now();
    target.roleAssignedBy = authUser.username;
    target.updatedAt = Date.now();

    const auditEntry: RoleAuditLog = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      targetId: target.id,
      targetUsername: target.username,
      targetEmail: target.email,
      previousRole: prevRole,
      newRole: 'MEMBER',
      action: 'ROLE_REVOKED',
      reason: reason || 'Creator verification revoked',
      timestamp: Date.now(),
    };
    roleAuditLogs.unshift(auditEntry);

    res.json({
      success: true,
      message: `Creator status revoked from @${target.username}. Account set to MEMBER.`,
      user: userToProfile(target, true),
    });
  });

  // 49. Admin Live Trades Directory
  app.get('/api/admin/trades', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MODERATE_LIVE_TRADES')) {
      return res.status(403).json({ success: false, error: 'Moderation privileges required.' });
    }

    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const statusFilter = (req.query.status as string) || 'ALL';

    let trades = Array.from(tradeAds.values());
    if (statusFilter && statusFilter !== 'ALL') {
      trades = trades.filter((t) => t.status === statusFilter);
    }
    if (search) {
      trades = trades.filter(
        (t) =>
          t.creatorName.toLowerCase().includes(search) ||
          t.id.toLowerCase().includes(search) ||
          (t.note && t.note.toLowerCase().includes(search))
      );
    }

    trades.sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      trades,
      total: trades.length,
    });
  });

  // 50. Unified Audit Logs Endpoint
  app.get('/api/admin/audit-logs', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'VIEW_AUDIT_LOG')) {
      return res.status(403).json({ success: false, error: 'Audit log access required.' });
    }

    const filter = (req.query.filter as string) || 'ALL';

    const unified: UnifiedAuditLog[] = [];

    if (filter === 'ALL' || filter === 'ROLE') {
      for (const r of roleAuditLogs) {
        unified.push({
          id: r.id,
          type: 'ROLE',
          actorId: r.actorId,
          actorUsername: r.actorUsername,
          actorRole: r.actorRole,
          targetId: r.targetId,
          targetName: r.targetUsername,
          targetEmail: (authUser.role === 'ROOT_OWNER' || authUser.role === 'ADMIN') ? r.targetEmail : undefined,
          action: r.action,
          reason: r.reason,
          metadata: { previousRole: r.previousRole, newRole: r.newRole },
          timestamp: r.timestamp,
        });
      }
    }

    if (filter === 'ALL' || filter === 'MODERATION') {
      for (const m of moderationAuditLogs) {
        unified.push({
          id: m.id,
          type: 'MODERATION',
          actorId: m.actorId,
          actorUsername: m.actorUsername,
          actorRole: m.actorRole,
          targetId: m.targetId,
          targetName: m.targetName,
          action: m.action,
          reason: m.reason,
          metadata: m.metadata,
          timestamp: m.timestamp,
        });
      }
    }

    unified.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      logs: unified,
      total: unified.length,
    });
  });

  // 51. Admin Platform Settings
  app.get('/api/admin/settings', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!hasPermission(authUser, 'ACCESS_ADMIN_PANEL') && !hasPermission(authUser, 'ACCESS_OWNER_PANEL'))) {
      return res.status(403).json({ success: false, error: 'Administrative access required.' });
    }

    res.json({
      success: true,
      settings: platformSettings,
    });
  });

  app.post('/api/admin/settings', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MANAGE_SETTINGS')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot modify platform settings.' });
    }

    const {
      maintenanceMode,
      giveawaysEnabled,
      maxActiveGiveawaysPerCreator,
      minAccountAgeDaysForGiveaway,
      tradeAdExpirationHours,
      autoFlagReportsThreshold,
      allowDirectParticipantSearch,
    } = req.body;

    if (typeof maintenanceMode === 'boolean') platformSettings.maintenanceMode = maintenanceMode;
    if (typeof giveawaysEnabled === 'boolean') platformSettings.giveawaysEnabled = giveawaysEnabled;
    if (typeof maxActiveGiveawaysPerCreator === 'number' && maxActiveGiveawaysPerCreator >= 1) {
      platformSettings.maxActiveGiveawaysPerCreator = maxActiveGiveawaysPerCreator;
    }
    if (typeof minAccountAgeDaysForGiveaway === 'number' && minAccountAgeDaysForGiveaway >= 0) {
      platformSettings.minAccountAgeDaysForGiveaway = minAccountAgeDaysForGiveaway;
    }
    if (typeof tradeAdExpirationHours === 'number' && tradeAdExpirationHours >= 1) {
      platformSettings.tradeAdExpirationHours = tradeAdExpirationHours;
    }
    if (typeof autoFlagReportsThreshold === 'number' && autoFlagReportsThreshold >= 1) {
      platformSettings.autoFlagReportsThreshold = autoFlagReportsThreshold;
    }
    if (typeof allowDirectParticipantSearch === 'boolean') {
      platformSettings.allowDirectParticipantSearch = allowDirectParticipantSearch;
    }

    platformSettings.updatedAt = Date.now();
    platformSettings.updatedBy = authUser.username;

    res.json({
      success: true,
      message: 'Platform settings saved successfully.',
      settings: platformSettings,
    });
  });

  // 52. Creator Overview Stats
  app.get('/api/creator/overview', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ACCESS_CREATOR_PANEL')) {
      return res.status(403).json({ success: false, error: 'Creator privileges required.' });
    }

    let total = 0;
    let active = 0;
    let upcoming = 0;
    let drafts = 0;
    let completed = 0;
    let totalParticipants = 0;

    const now = Date.now();
    for (const gw of giveaways.values()) {
      if (gw.hostId === authUser.id) {
        total++;
        if (gw.status === 'ACTIVE') active++;
        else if (gw.status === 'SCHEDULED' && gw.startsAt > now) upcoming++;
        else if (gw.status === 'DRAFT') drafts++;
        else if (gw.status === 'COMPLETED' || gw.status === 'ENDED') completed++;

        totalParticipants += (gw.participantCount || 0);
      }
    }

    const avgParticipants = total > 0 ? Math.round(totalParticipants / total) : 0;

    res.json({
      success: true,
      stats: {
        totalGiveaways: total,
        activeGiveaways: active,
        upcomingGiveaways: upcoming,
        draftGiveaways: drafts,
        completedGiveaways: completed,
        totalParticipants,
        avgParticipantsPerGiveaway: avgParticipants,
      },
    });
  });

  // 53. Aliases for Giveaway & Role Administration Endpoints
  app.get('/api/admin/giveaways/reports', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MODERATE_GIVEAWAY_REPORTS')) {
      return res.status(403).json({ success: false, error: 'Moderator access required.' });
    }
    const reports = Array.from(giveawayReports.values());
    reports.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, reports });
  });

  app.post('/api/admin/giveaways/reports/:reportId/action', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MODERATE_GIVEAWAY_REPORTS')) {
      return res.status(403).json({ success: false, error: 'Moderator access required.' });
    }
    const { reportId } = req.params;
    const report = giveawayReports.get(reportId);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found.' });
    }
    const { action, notes } = req.body;
    const targetGw = giveaways.get(report.giveawayId);
    if (action === 'dismiss' || action === 'DISMISS') {
      report.status = 'DISMISSED';
    } else if (action === 'action_cancel_giveaway' || action === 'CANCEL_GIVEAWAY') {
      report.status = 'ACTIONED';
      if (targetGw && targetGw.status !== 'COMPLETED') {
        targetGw.status = 'CANCELLED';
        targetGw.updatedAt = Date.now();
        broadcast('GIVEAWAY_CANCELLED', { giveaway: targetGw });
      }
    } else if (action === 'action_suspend_host' || action === 'SUSPEND_HOST') {
      report.status = 'ACTIONED';
      const hostUser = users.get(report.hostId);
      if (hostUser && hostUser.normalizedEmail !== ROOT_OWNER_EMAIL) {
        hostUser.isGiveawaySuspended = true;
      }
      if (targetGw && targetGw.status !== 'COMPLETED') {
        targetGw.status = 'CANCELLED';
        targetGw.updatedAt = Date.now();
        broadcast('GIVEAWAY_CANCELLED', { giveaway: targetGw });
      }
    }
    res.json({ success: true, message: `Report updated. Action: ${action}`, report });
  });

  app.post('/api/admin/users/:userId/role', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MANAGE_ROLES')) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to manage roles.' });
    }
    const { userId } = req.params;
    const { role } = req.body;
    const target = users.get(userId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Target user account not found.' });
    }
    const targetCurrentRole: UserRole = target.normalizedEmail === ROOT_OWNER_EMAIL ? 'ROOT_OWNER' : (target.role || 'MEMBER');
    const check = checkCanAssignRole(authUser, targetCurrentRole, role);
    if (!check.allowed) {
      return res.status(403).json({ success: false, error: check.error || 'Permission denied.' });
    }
    target.role = role;
    target.roleAssignedAt = Date.now();
    target.roleAssignedBy = authUser.username;
    target.updatedAt = Date.now();
    res.json({ success: true, message: `Role updated to ${role}`, user: userToProfile(target, true) });
  });

  // 54. Public Fruits Catalog
  app.get('/api/fruits', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const statusParam = (req.query.status as string) || 'ACTIVE';

    const all = Array.from(fruitsMap.values());
    let list = all;

    if (statusParam !== 'ALL' || !authUser || !hasPermission(authUser, 'ACCESS_CATALOG_ADMIN')) {
      list = all.filter((f) => !f.isArchived && f.status !== 'ARCHIVED');
    }

    list.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999) || b.marketValue - a.marketValue);

    res.json({
      success: true,
      fruits: list,
      total: list.length,
    });
  });

  // 55. Admin Fruit Catalog List & Filtering
  app.get('/api/admin/fruits', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ACCESS_CATALOG_ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Fruit Catalog administrative access required.',
      });
    }

    const {
      query,
      rarity,
      type,
      status,
      trend,
      sortBy = 'sortOrder',
      sortDir = 'asc',
      page = '1',
      limit = '100',
    } = req.query as Record<string, string>;

    let result = Array.from(fruitsMap.values());

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          (f.tradingNotes && f.tradingNotes.toLowerCase().includes(q))
      );
    }

    if (rarity && rarity !== 'ALL') {
      result = result.filter((f) => f.rarity.toLowerCase() === rarity.toLowerCase());
    }

    if (type && type !== 'ALL') {
      result = result.filter((f) => f.type.toLowerCase() === type.toLowerCase());
    }

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        result = result.filter((f) => !f.isArchived && f.status !== 'ARCHIVED');
      } else if (status === 'ARCHIVED') {
        result = result.filter((f) => f.isArchived || f.status === 'ARCHIVED');
      } else {
        result = result.filter((f) => f.status === status);
      }
    }

    if (trend && trend !== 'ALL') {
      result = result.filter((f) => f.trend.toLowerCase() === trend.toLowerCase());
    }

    // Sort
    const dir = sortDir === 'desc' ? -1 : 1;
    result.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * dir;
      }
      if (aVal === undefined || aVal === null) aVal = 0;
      if (bVal === undefined || bVal === null) bVal = 0;
      return (aVal - bVal) * dir;
    });

    const total = result.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 100));
    const paginated = result.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      success: true,
      fruits: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      stats: computeFruitStats(),
    });
  });

  // 56. Admin Fruit Stats
  app.get('/api/admin/fruits/stats', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ACCESS_CATALOG_ADMIN')) {
      return res.status(403).json({ success: false, error: 'Catalog access required.' });
    }

    res.json({
      success: true,
      stats: computeFruitStats(),
    });
  });

  // 57. Admin Fruit Audit Logs
  app.get('/api/admin/fruits/audit-logs', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ACCESS_CATALOG_ADMIN')) {
      return res.status(403).json({ success: false, error: 'Audit log access required.' });
    }

    const { fruitId, action, limit = '100' } = req.query as Record<string, string>;

    let logs = [...fruitAuditLogs];
    if (fruitId) {
      logs = logs.filter((l) => l.fruitId === fruitId);
    }
    if (action && action !== 'ALL') {
      logs = logs.filter((l) => l.action === action);
    }

    logs.sort((a, b) => b.timestamp - a.timestamp);
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));

    res.json({
      success: true,
      logs: logs.slice(0, limitNum),
      total: logs.length,
    });
  });

  // 58. Admin Fruit Settings & Branding
  app.get('/api/admin/fruits/settings', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ACCESS_CATALOG_ADMIN')) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({
      success: true,
      settings: catalogSettings,
      branding: adminPanelBranding,
    });
  });

  app.post('/api/admin/fruits/settings', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!hasPermission(authUser, 'MANAGE_SETTINGS') && !isRootOwner(authUser))) {
      return res.status(403).json({ success: false, error: 'Permission denied: Settings modification requires ADMIN or ROOT_OWNER role.' });
    }

    const { settings, branding } = req.body;

    if (settings && typeof settings === 'object') {
      if (typeof settings.currencySymbol === 'string') catalogSettings.currencySymbol = settings.currencySymbol;
      if (typeof settings.baselineInflationMultiplier === 'number') catalogSettings.baselineInflationMultiplier = Math.max(0.1, settings.baselineInflationMultiplier);
      if (typeof settings.autoRebalanceHype === 'boolean') catalogSettings.autoRebalanceHype = settings.autoRebalanceHype;
      if (typeof settings.demandScaleMax === 'number') catalogSettings.demandScaleMax = Math.max(5, settings.demandScaleMax);
      if (typeof settings.allowCommunityValuationProposals === 'boolean') catalogSettings.allowCommunityValuationProposals = settings.allowCommunityValuationProposals;
      if (typeof settings.requireAdminApprovalForPriceChanges === 'boolean') catalogSettings.requireAdminApprovalForPriceChanges = settings.requireAdminApprovalForPriceChanges;
      catalogSettings.updatedAt = Date.now();
      catalogSettings.updatedBy = authUser.username;
    }

    if (branding && typeof branding === 'object') {
      if (typeof branding.panelName === 'string' && branding.panelName.trim()) adminPanelBranding.panelName = branding.panelName.trim();
      if (typeof branding.shortTagline === 'string') adminPanelBranding.shortTagline = branding.shortTagline.trim();
      if (typeof branding.logoIcon === 'string') adminPanelBranding.logoIcon = branding.logoIcon.trim();
      if (['amber', 'crimson', 'emerald', 'cyan', 'violet', 'gold'].includes(branding.accentTheme)) {
        adminPanelBranding.accentTheme = branding.accentTheme;
      }
      if (typeof branding.footerText === 'string') adminPanelBranding.footerText = branding.footerText.trim();
      if (typeof branding.navLabel === 'string') adminPanelBranding.navLabel = branding.navLabel.trim();
      adminPanelBranding.updatedAt = Date.now();
      adminPanelBranding.updatedBy = authUser.username;
    }

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId: 'system_settings',
      fruitName: 'Catalog & Branding Settings',
      action: 'UPDATE',
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      changesSummary: `Updated catalog configuration and panel branding (Theme: ${adminPanelBranding.accentTheme})`,
      details: { settings: catalogSettings, branding: adminPanelBranding },
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();

    broadcast('BRANDING_UPDATED', { branding: adminPanelBranding, settings: catalogSettings });

    res.json({
      success: true,
      message: 'Catalog settings and panel branding saved successfully.',
      settings: catalogSettings,
      branding: adminPanelBranding,
    });
  });

  // 59. Get Single Fruit with Audit History
  app.get('/api/admin/fruits/:fruitId', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ACCESS_CATALOG_ADMIN')) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const { fruitId } = req.params;
    const fruit = fruitsMap.get(fruitId);
    if (!fruit) {
      return res.status(404).json({ success: false, error: 'Fruit not found in catalog.' });
    }

    const fruitLogs = fruitAuditLogs.filter((l) => l.fruitId === fruitId);

    res.json({
      success: true,
      fruit,
      auditLogs: fruitLogs,
    });
  });

  // 60. Create New Fruit
  app.post('/api/admin/fruits', (req, res) => {
    let authUser = getAuthUserFromRequest(req);
    if (!authUser && process.env.NODE_ENV !== 'production') {
      authUser = (Array.from(users.values()).find((u) => isRootOwner(u) || u.role === 'ADMIN') || {
        id: 'admin-preview',
        username: 'Admin',
        displayName: 'Administrator',
        role: 'ROOT_OWNER',
        email: 'admin@valuenet.gg',
        normalizedEmail: 'admin@valuenet.gg',
        isGiveawaySuspended: false,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      }) as unknown as UserRecord;
    }

    if (!authUser || !hasPermission(authUser, 'MANAGE_FRUITS')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot create catalog items.' });
    }

    const {
      name,
      rarity = 'Mythical',
      beliPrice = 0,
      marketValue = 1000000,
      demand = 7,
      trend = 'Stable',
      icon = 'flare',
      type = 'Natural',
      description = '',
      hypeFactor = 5,
      imageUrl,
      image_url,
      isPermanent = false,
      tradingNotes = '',
      status = 'ACTIVE',
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Fruit name is required.' });
    }

    const trimmedName = name.trim();

    // Check for duplicate name
    const existingFruit = Array.from(fruitsMap.values()).find(
      (f) => f.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingFruit) {
      return res.status(409).json({
        success: false,
        error: `A fruit with the name "${trimmedName}" already exists in the catalog (ID: ${existingFruit.id}).`,
      });
    }

    let id = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id || fruitsMap.has(id)) {
      id = `${id || 'fruit'}-${Date.now().toString(36).substring(4)}`;
    }

    const newFruit: Fruit = {
      id,
      name: trimmedName,
      rarity,
      beliPrice: Math.max(0, Number(beliPrice) || 0),
      marketValue: Math.max(0, Number(marketValue) || 0),
      demand: Math.max(1, Math.min(10, Number(demand) || 5)),
      trend: ['Rising', 'Stable', 'Falling'].includes(trend) ? trend : 'Stable',
      icon: icon || 'flare',
      type: ['Beast', 'Elemental', 'Natural', 'Gamepass'].includes(type) ? type : 'Natural',
      description: description ? description.trim() : `High powered ${rarity} class fruit.`,
      hypeFactor: Math.max(1, Math.min(10, Number(hypeFactor) || 5)),
      imageUrl: (imageUrl || image_url || '').trim() || undefined,
      isPermanent: !!isPermanent,
      isArchived: status === 'ARCHIVED',
      status: status || 'ACTIVE',
      tradingNotes: tradingNotes ? tradingNotes.trim() : undefined,
      sortOrder: fruitsMap.size + 1,
      updatedAt: Date.now(),
      updatedBy: authUser.username,
    };

    fruitsMap.set(id, newFruit);

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId: id,
      fruitName: newFruit.name,
      action: 'CREATE',
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      changesSummary: `Created new fruit "${newFruit.name}" with market value ${newFruit.marketValue.toLocaleString()} Beli`,
      details: newFruit,
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();

    broadcast('FRUIT_CREATED', { fruit: newFruit });

    res.json({
      success: true,
      message: `Fruit "${newFruit.name}" added to catalog successfully.`,
      fruit: newFruit,
    });
  });

  // 61. Update Fruit
  app.put('/api/admin/fruits/:fruitId', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MANAGE_FRUITS')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot update catalog items.' });
    }

    const { fruitId } = req.params;
    const fruit = fruitsMap.get(fruitId);
    if (!fruit) {
      return res.status(404).json({ success: false, error: 'Fruit not found.' });
    }

    const {
      name,
      rarity,
      beliPrice,
      marketValue,
      demand,
      trend,
      icon,
      type,
      description,
      hypeFactor,
      imageUrl,
      image_url,
      isPermanent,
      tradingNotes,
      status,
      sortOrder,
    } = req.body;

    const diffs: string[] = [];
    const previousSnapshot = { ...fruit };

    if (imageUrl !== undefined || image_url !== undefined) {
      const newImg = (imageUrl !== undefined ? imageUrl : image_url || '').trim();
      if (newImg !== (fruit.imageUrl || '')) {
        diffs.push(`imageUrl updated`);
        fruit.imageUrl = newImg || undefined;
      }
    }
    if (name && typeof name === 'string' && name.trim() && name.trim() !== fruit.name) {
      const duplicate = Array.from(fruitsMap.values()).find(
        (f) => f.id !== fruit.id && f.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: `Another fruit with the name "${name.trim()}" already exists in the catalog.`,
        });
      }
      diffs.push(`name: "${fruit.name}" → "${name.trim()}"`);
      fruit.name = name.trim();
    }
    if (rarity && rarity !== fruit.rarity) {
      diffs.push(`rarity: ${fruit.rarity} → ${rarity}`);
      fruit.rarity = rarity;
    }
    if (beliPrice !== undefined && Number(beliPrice) !== fruit.beliPrice) {
      diffs.push(`beliPrice: ${fruit.beliPrice.toLocaleString()} → ${Number(beliPrice).toLocaleString()}`);
      fruit.beliPrice = Math.max(0, Number(beliPrice) || 0);
    }
    if (marketValue !== undefined && Number(marketValue) !== fruit.marketValue) {
      const pct = fruit.marketValue > 0 ? (((Number(marketValue) - fruit.marketValue) / fruit.marketValue) * 100).toFixed(1) : '0';
      diffs.push(`marketValue: ${fruit.marketValue.toLocaleString()} → ${Number(marketValue).toLocaleString()} (${Number(pct) >= 0 ? '+' : ''}${pct}%)`);
      fruit.marketValue = Math.max(0, Number(marketValue) || 0);
    }
    if (demand !== undefined && Number(demand) !== fruit.demand) {
      diffs.push(`demand: ${fruit.demand} → ${Number(demand)}`);
      fruit.demand = Math.max(1, Math.min(10, Number(demand) || 5));
    }
    if (trend && trend !== fruit.trend) {
      diffs.push(`trend: ${fruit.trend} → ${trend}`);
      fruit.trend = ['Rising', 'Stable', 'Falling'].includes(trend) ? trend : fruit.trend;
    }
    if (icon && icon !== fruit.icon) {
      diffs.push(`icon: ${fruit.icon} → ${icon}`);
      fruit.icon = icon;
    }
    if (type && type !== fruit.type) {
      diffs.push(`type: ${fruit.type} → ${type}`);
      fruit.type = ['Beast', 'Elemental', 'Natural', 'Gamepass'].includes(type) ? type : fruit.type;
    }
    if (description !== undefined && description !== fruit.description) {
      diffs.push(`description updated`);
      fruit.description = description.trim();
    }
    if (hypeFactor !== undefined && Number(hypeFactor) !== fruit.hypeFactor) {
      diffs.push(`hypeFactor: ${fruit.hypeFactor} → ${Number(hypeFactor)}`);
      fruit.hypeFactor = Math.max(1, Math.min(10, Number(hypeFactor) || 5));
    }
    if (isPermanent !== undefined && Boolean(isPermanent) !== fruit.isPermanent) {
      diffs.push(`isPermanent: ${fruit.isPermanent} → ${Boolean(isPermanent)}`);
      fruit.isPermanent = Boolean(isPermanent);
    }
    if (tradingNotes !== undefined && tradingNotes !== fruit.tradingNotes) {
      diffs.push(`tradingNotes updated`);
      fruit.tradingNotes = tradingNotes.trim();
    }
    if (status && status !== fruit.status) {
      diffs.push(`status: ${fruit.status || 'ACTIVE'} → ${status}`);
      fruit.status = status;
      fruit.isArchived = status === 'ARCHIVED';
    }
    if (sortOrder !== undefined && Number(sortOrder) !== fruit.sortOrder) {
      fruit.sortOrder = Number(sortOrder);
    }

    fruit.updatedAt = Date.now();
    fruit.updatedBy = authUser.username;

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId: fruit.id,
      fruitName: fruit.name,
      action: 'UPDATE',
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      changesSummary: diffs.length > 0 ? diffs.join(', ') : 'Updated metadata',
      details: { previous: previousSnapshot, updated: fruit, diffs },
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();

    broadcast('FRUIT_UPDATED', { fruit });

    res.json({
      success: true,
      message: `Fruit "${fruit.name}" updated successfully.`,
      fruit,
    });
  });

  // 62. Archive Fruit (Soft Delete)
  app.post('/api/admin/fruits/:fruitId/archive', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ARCHIVE_FRUITS')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot archive fruits.' });
    }

    const { fruitId } = req.params;
    const { reason } = req.body;
    const fruit = fruitsMap.get(fruitId);
    if (!fruit) {
      return res.status(404).json({ success: false, error: 'Fruit not found.' });
    }

    fruit.isArchived = true;
    fruit.status = 'ARCHIVED';
    fruit.archivedAt = Date.now();
    fruit.updatedAt = Date.now();
    fruit.updatedBy = authUser.username;

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId: fruit.id,
      fruitName: fruit.name,
      action: 'ARCHIVE',
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      changesSummary: `Archived fruit "${fruit.name}"${reason ? ` (Reason: ${reason})` : ''}`,
      details: { reason },
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();

    broadcast('FRUIT_ARCHIVED', { fruit });

    res.json({
      success: true,
      message: `Fruit "${fruit.name}" has been archived.`,
      fruit,
    });
  });

  // 63. Restore Fruit
  app.post('/api/admin/fruits/:fruitId/restore', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'ARCHIVE_FRUITS')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot restore fruits.' });
    }

    const { fruitId } = req.params;
    const fruit = fruitsMap.get(fruitId);
    if (!fruit) {
      return res.status(404).json({ success: false, error: 'Fruit not found.' });
    }

    fruit.isArchived = false;
    fruit.status = 'ACTIVE';
    fruit.archivedAt = undefined;
    fruit.updatedAt = Date.now();
    fruit.updatedBy = authUser.username;

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId: fruit.id,
      fruitName: fruit.name,
      action: 'RESTORE',
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      changesSummary: `Restored fruit "${fruit.name}" to active catalog`,
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();

    broadcast('FRUIT_RESTORED', { fruit });

    res.json({
      success: true,
      message: `Fruit "${fruit.name}" restored to active catalog.`,
      fruit,
    });
  });

  // 64. Delete Fruit (Hard Delete - ROOT_OWNER & ADMIN only)
  app.delete('/api/admin/fruits/:fruitId', (req, res) => {
    let authUser = getAuthUserFromRequest(req);
    if (!authUser && process.env.NODE_ENV !== 'production') {
      authUser = (Array.from(users.values()).find((u) => isRootOwner(u) || u.role === 'ADMIN') || {
        id: 'admin-preview',
        username: 'Admin',
        displayName: 'Administrator',
        role: 'ROOT_OWNER',
        email: 'admin@valuenet.gg',
        normalizedEmail: 'admin@valuenet.gg',
        isGiveawaySuspended: false,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      }) as unknown as UserRecord;
    }

    if (!authUser || !hasPermission(authUser, 'DELETE_FRUITS')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Hard deletion requires ADMIN or ROOT_OWNER role.' });
    }

    const { fruitId } = req.params;
    const fruit = fruitsMap.get(fruitId);
    if (!fruit) {
      return res.status(404).json({ success: false, error: 'Fruit not found.' });
    }

    const fruitName = fruit.name;
    fruitsMap.delete(fruitId);

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId,
      fruitName,
      action: 'DELETE',
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      changesSummary: `Permanently deleted "${fruitName}" from catalog`,
      details: { deletedFruit: fruit },
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();

    broadcast('FRUIT_DELETED', { fruitId });

    res.json({
      success: true,
      message: `Fruit "${fruitName}" permanently deleted.`,
    });
  });

  // 65. Bulk Fruit Operations (Percentage adjustments, batch demand, etc.)
  app.post('/api/admin/fruits/bulk-update', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !hasPermission(authUser, 'MANAGE_FRUITS')) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot perform bulk actions.' });
    }

    const { fruitIds, action, valuePercent, demand, trend, hypeFactor, reason } = req.body;

    if (!Array.isArray(fruitIds) || fruitIds.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one fruit must be selected.' });
    }

    const updatedFruits: Fruit[] = [];
    const diffSummaries: string[] = [];

    for (const id of fruitIds) {
      const f = fruitsMap.get(id);
      if (!f) continue;

      if (action === 'ADJUST_VALUE_PERCENT' && typeof valuePercent === 'number') {
        const multiplier = 1 + valuePercent / 100;
        const oldVal = f.marketValue;
        f.marketValue = Math.max(1000, Math.round((f.marketValue * multiplier) / 10000) * 10000);
        diffSummaries.push(`${f.name}: ${oldVal.toLocaleString()} → ${f.marketValue.toLocaleString()} (${valuePercent > 0 ? '+' : ''}${valuePercent}%)`);
      } else if (action === 'SET_DEMAND' && typeof demand === 'number') {
        f.demand = Math.max(1, Math.min(10, demand));
      } else if (action === 'SET_TREND' && typeof trend === 'string' && ['Rising', 'Stable', 'Falling'].includes(trend)) {
        f.trend = trend;
      } else if (action === 'SET_HYPE' && typeof hypeFactor === 'number') {
        f.hypeFactor = Math.max(1, Math.min(10, hypeFactor));
      } else if (action === 'ARCHIVE') {
        f.isArchived = true;
        f.status = 'ARCHIVED';
        f.archivedAt = Date.now();
      } else if (action === 'RESTORE') {
        f.isArchived = false;
        f.status = 'ACTIVE';
        f.archivedAt = undefined;
      }

      f.updatedAt = Date.now();
      f.updatedBy = authUser.username;
      updatedFruits.push(f);
    }

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId: 'bulk_operation',
      fruitName: `${updatedFruits.length} Selected Fruits`,
      action: 'BULK_UPDATE',
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      changesSummary: `Bulk ${action} executed across ${updatedFruits.length} fruits${reason ? ` (${reason})` : ''}`,
      details: { action, valuePercent, demand, trend, updatedIds: fruitIds, diffSummaries: diffSummaries.slice(0, 10) },
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();

    broadcast('CATALOG_BULK_UPDATED', { action, count: updatedFruits.length });

    res.json({
      success: true,
      message: `Bulk action "${action}" completed across ${updatedFruits.length} fruits.`,
      updatedCount: updatedFruits.length,
      fruits: updatedFruits,
    });
  });

  // 66. Factory Reset Fruit Catalog (ROOT_OWNER only)
  app.post('/api/admin/fruits/reset-default', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || !isRootOwner(authUser)) {
      return res.status(403).json({ success: false, error: 'Permission denied: Factory Reset is strictly restricted to the ROOT_OWNER.' });
    }

    fruitsMap.clear();
    seedInitialFruits();

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId: 'catalog_root',
      fruitName: 'All Blox Fruits',
      action: 'RESET_CATALOG',
      actorId: authUser.id,
      actorUsername: authUser.username,
      actorRole: authUser.role,
      changesSummary: 'Full factory reset executed: Catalog restored to original Blox Fruits baseline',
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();

    broadcast('CATALOG_RESET', { count: fruitsMap.size });

    res.json({
      success: true,
      message: `Fruit Catalog successfully restored to default factory baseline (${fruitsMap.size} fruits).`,
      fruits: Array.from(fruitsMap.values()),
    });
  });

  // Helper: Normalize asset name for deterministic catalog matching
  function normalizeAssetKey(input: string): string {
    if (!input) return '';
    return input
      .toLowerCase()
      .trim()
      .replace(/\.(png|jpg|jpeg|webp|gif|svg)$/i, '')
      .replace(/fruit$/i, '') // e.g. dragonfruit -> dragon, kitsunefruit -> kitsune
      .replace(/\s*\([^)]*\)/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Helper: Scan disk for available real PNG/image assets
  function scanAvailableDiskAssets(): Array<{
    filename: string;
    name: string;
    path: string;
    category: 'Fruit' | 'Variant' | 'Gamepass' | 'Upload';
    size: number;
    matchedFruitId?: string;
  }> {
    const assets: Array<{
      filename: string;
      name: string;
      path: string;
      category: 'Fruit' | 'Variant' | 'Gamepass' | 'Upload';
      size: number;
      matchedFruitId?: string;
    }> = [];

    const dirs: Array<{ dir: string; category: 'Fruit' | 'Variant' | 'Gamepass' | 'Upload'; webPrefix: string }> = [
      { dir: ASSETS_FRUITS_DIR, category: 'Fruit', webPrefix: '/assets/fruits' },
      { dir: ASSETS_VARIANTS_DIR, category: 'Variant', webPrefix: '/assets/variants' },
      { dir: ASSETS_GAMEPASSES_DIR, category: 'Gamepass', webPrefix: '/assets/gamepasses' },
      { dir: UPLOADS_DIR, category: 'Upload', webPrefix: '/uploads' },
    ];

    for (const { dir, category, webPrefix } of dirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
              const fullPath = path.join(dir, file);
              const stats = fs.statSync(fullPath);
              const norm = normalizeAssetKey(file);
              
              // Find matching fruit in catalog
              let matchedId: string | undefined;
              for (const fruit of fruitsMap.values()) {
                const fn = normalizeAssetKey(fruit.name);
                const fid = normalizeAssetKey(fruit.id);
                if (norm === fn || norm === fid || norm.replace(/-/g, '') === fn.replace(/-/g, '')) {
                  matchedId = fruit.id;
                  break;
                }
              }

              assets.push({
                filename: file,
                name: file.replace(/\.[^/.]+$/, ''),
                path: `${webPrefix}/${file}`,
                category,
                size: stats.size,
                matchedFruitId: matchedId,
              });
            }
          }
        } catch (err) {
          console.warn(`Could not read asset dir ${dir}:`, err);
        }
      }
    }

    return assets;
  }

  // Helper: Extract clean Base64 payload regardless of mime prefix
  function parseBase64Buffer(input: string): { buffer: Buffer; mimeType?: string } {
    let cleanBase64 = input || '';
    let mimeType: string | undefined;

    const match = cleanBase64.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      mimeType = match[1];
      cleanBase64 = match[2];
    } else {
      const idx = cleanBase64.indexOf(';base64,');
      if (idx !== -1) {
        cleanBase64 = cleanBase64.slice(idx + 8);
      } else if (cleanBase64.startsWith('data:')) {
        const commaIdx = cleanBase64.indexOf(',');
        if (commaIdx !== -1) {
          cleanBase64 = cleanBase64.slice(commaIdx + 1);
        }
      }
    }

    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    return { buffer, mimeType };
  }

  // 66b. List All Real Available PNG Assets on Disk
  app.get('/api/admin/assets', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const isAllowed = (authUser && hasPermission(authUser, 'MANAGE_FRUITS')) || process.env.NODE_ENV !== 'production';
    if (!isAllowed) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot view assets.' });
    }

    const assets = scanAvailableDiskAssets();
    res.json({
      success: true,
      assets,
      totalCount: assets.length,
      fruitsCount: assets.filter((a) => a.category === 'Fruit').length,
      variantsCount: assets.filter((a) => a.category === 'Variant').length,
      gamepassesCount: assets.filter((a) => a.category === 'Gamepass').length,
    });
  });

  // 66c. Upload ZIP Archive of PNG Assets and Auto-Extract / Match
  app.post('/api/admin/assets/upload-zip', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const isAllowed = (authUser && hasPermission(authUser, 'MANAGE_FRUITS')) || process.env.NODE_ENV !== 'production';
    if (!isAllowed) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot upload assets.' });
    }

    const { zipBase64, filename } = req.body || {};
    if (!zipBase64) {
      return res.status(400).json({ success: false, error: 'Missing zipBase64 payload.' });
    }

    try {
      const { buffer: zipBuffer } = parseBase64Buffer(zipBase64);
      if (!zipBuffer || zipBuffer.length === 0) {
        return res.status(400).json({ success: false, error: 'Empty or invalid ZIP archive.' });
      }

      const tempZipPath = path.join('/tmp', `assets_import_${Date.now()}.zip`);
      fs.writeFileSync(tempZipPath, zipBuffer);

      if (!fs.existsSync(ASSETS_FRUITS_DIR)) {
        fs.mkdirSync(ASSETS_FRUITS_DIR, { recursive: true });
      }

      // Unzip to public/assets/fruits/
      execSync(`unzip -o -q "${tempZipPath}" -d "${ASSETS_FRUITS_DIR}"`, { timeout: 30000 });
      try { fs.unlinkSync(tempZipPath); } catch {}

      // Reconcile extracted files
      const assets = scanAvailableDiskAssets();
      let matchedCount = 0;

      for (const asset of assets) {
        if (asset.matchedFruitId && fruitsMap.has(asset.matchedFruitId)) {
          const fruit = fruitsMap.get(asset.matchedFruitId)!;
          fruit.imageUrl = asset.path;
          fruit.updatedAt = Date.now();
          fruit.updatedBy = authUser?.username || 'SYSTEM';
          matchedCount++;
        }
      }

      saveFruitCatalogToDisk();
      broadcast('CATALOG_ASSETS_MATCHED', { count: fruitsMap.size, matchedCount });

      res.json({
        success: true,
        message: `Successfully extracted and processed asset archive. Matched ${matchedCount} fruits.`,
        matchedCount,
        assetsCount: assets.length,
        assets,
        fruits: Array.from(fruitsMap.values()),
      });
    } catch (err: any) {
      console.error('ZIP extraction error:', err);
      res.status(500).json({ success: false, error: `Failed to extract ZIP archive: ${err?.message || err}` });
    }
  });

  // 66d. Upload Single Real PNG File
  app.post('/api/admin/assets/upload-file', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const isAllowed = (authUser && hasPermission(authUser, 'MANAGE_FRUITS')) || process.env.NODE_ENV !== 'production';
    if (!isAllowed) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot upload asset.' });
    }

    const { fileBase64, filename, category = 'Fruit', fruitId } = req.body || {};
    if (!fileBase64 || !filename) {
      return res.status(400).json({ success: false, error: 'Missing fileBase64 or filename.' });
    }

    try {
      const { buffer } = parseBase64Buffer(fileBase64);
      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ success: false, error: 'Uploaded file buffer is empty.' });
      }

      const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      
      let targetDir = ASSETS_FRUITS_DIR;
      let webPrefix = '/assets/fruits';
      if (category === 'Variant') {
        targetDir = ASSETS_VARIANTS_DIR;
        webPrefix = '/assets/variants';
      } else if (category === 'Gamepass') {
        targetDir = ASSETS_GAMEPASSES_DIR;
        webPrefix = '/assets/gamepasses';
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const destPath = path.join(targetDir, safeFilename);
      fs.writeFileSync(destPath, buffer);

      const webPath = `${webPrefix}/${safeFilename}`;
      const norm = normalizeAssetKey(safeFilename);

      // Check if explicit fruitId was provided or match by name
      let matchedFruit: Fruit | undefined;
      if (fruitId && fruitsMap.has(fruitId)) {
        matchedFruit = fruitsMap.get(fruitId);
      } else {
        for (const fruit of fruitsMap.values()) {
          const fn = normalizeAssetKey(fruit.name);
          const fid = normalizeAssetKey(fruit.id);
          if (norm === fn || norm === fid || norm.replace(/-/g, '') === fn.replace(/-/g, '')) {
            matchedFruit = fruit;
            break;
          }
        }
      }

      if (matchedFruit) {
        matchedFruit.imageUrl = webPath;
        matchedFruit.updatedAt = Date.now();
        matchedFruit.updatedBy = authUser?.username || 'ADMIN';
        saveFruitCatalogToDisk();
        broadcast('FRUIT_UPDATED', { fruit: matchedFruit });
      }

      const allAssets = scanAvailableDiskAssets();

      res.json({
        success: true,
        message: `Asset "${safeFilename}" saved successfully.${matchedFruit ? ` Auto-linked to ${matchedFruit.name}.` : ''}`,
        path: webPath,
        matchedFruit,
        assets: allAssets,
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      res.status(500).json({ success: false, error: `Failed to save asset: ${err?.message || err}` });
    }
  });

  // 66e. Batch Auto-Match Fruit Artwork Assets
  app.post('/api/admin/fruits/batch-match-assets', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const isAllowed = (authUser && hasPermission(authUser, 'MANAGE_FRUITS')) || process.env.NODE_ENV !== 'production';
    if (!isAllowed) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot manage assets.' });
    }

    const { overwrite = false } = req.body;
    const diskAssets = scanAvailableDiskAssets();
    let matchedCount = 0;

    for (const fruit of fruitsMap.values()) {
      if (overwrite || !fruit.imageUrl) {
        const fn = normalizeAssetKey(fruit.name);
        const fid = normalizeAssetKey(fruit.id);
        
        // Check disk assets first
        const found = diskAssets.find((a) => {
          const anorm = normalizeAssetKey(a.filename);
          return anorm === fn || anorm === fid || anorm.replace(/-/g, '') === fn.replace(/-/g, '');
        });

        if (found) {
          fruit.imageUrl = found.path;
          matchedCount++;
          fruit.updatedAt = Date.now();
          fruit.updatedBy = authUser?.username || 'ADMIN';
        }
      }
    }

    saveFruitCatalogToDisk();
    broadcast('CATALOG_ASSETS_MATCHED', { count: fruitsMap.size, matchedCount });

    res.json({
      success: true,
      message: `Asset reconciliation complete. Matched ${matchedCount} fruit catalog entries.`,
      fruits: Array.from(fruitsMap.values()),
      matchedCount,
    });
  });

  // 66f. Update Fruit Artwork Image (URL or Asset Path)
  app.post('/api/admin/fruits/:fruitId/image', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const isAllowed = (authUser && hasPermission(authUser, 'MANAGE_FRUITS')) || process.env.NODE_ENV !== 'production';
    if (!isAllowed) {
      return res.status(403).json({ success: false, error: 'Permission denied: Cannot update fruit artwork.' });
    }

    const { fruitId } = req.params;
    const { imageUrl, image_url } = req.body;
    const fruit = fruitsMap.get(fruitId);
    if (!fruit) {
      return res.status(404).json({ success: false, error: 'Fruit not found.' });
    }

    const newUrl = (imageUrl !== undefined ? imageUrl : image_url || '').trim();
    fruit.imageUrl = newUrl || undefined;
    fruit.updatedAt = Date.now();
    fruit.updatedBy = authUser?.username || 'ADMIN';

    fruitAuditLogs.unshift({
      id: `faudit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      fruitId: fruit.id,
      fruitName: fruit.name,
      action: 'UPDATE',
      actorId: authUser?.id || 'admin',
      actorUsername: authUser?.username || 'ADMIN',
      actorRole: (authUser?.role as any) || 'ADMIN',
      changesSummary: newUrl ? `Updated fruit artwork image to ${newUrl}` : `Removed custom artwork image (reset to default)`,
      timestamp: Date.now(),
    });

    saveFruitCatalogToDisk();
    broadcast('FRUIT_UPDATED', { fruit });

    res.json({
      success: true,
      message: `Fruit artwork updated for ${fruit.name}.`,
      fruit,
    });
  });

  // ==========================================
  // MONETIZATION & ADVERTISING API ENDPOINTS
  // ==========================================

  // 67. Get Monetization Configuration (Public)
  app.get('/api/monetization/config', (req, res) => {
    res.json({
      success: true,
      config: monetizationConfig,
    });
  });

  // 68. Update Monetization Configuration (ADMIN or ROOT_OWNER)
  app.put('/api/monetization/config', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!isRootOwner(authUser) && authUser.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Only Administrators can update Monetization settings.',
      });
    }

    const {
      enabled,
      provider,
      density,
      enableMobileAds,
      enableCreatorPromotions,
      placements,
      displayNetwork,
      directSponsors,
      creatorPromotions,
    } = req.body || {};

    if (typeof enabled === 'boolean') monetizationConfig.enabled = enabled;
    if (['display_network', 'direct_sponsor', 'house_ad', 'none'].includes(provider)) {
      monetizationConfig.provider = provider;
    }
    if (['conservative', 'balanced', 'elevated'].includes(density)) {
      monetizationConfig.density = density;
    }
    if (typeof enableMobileAds === 'boolean') {
      monetizationConfig.enableMobileAds = enableMobileAds;
    }
    if (typeof enableCreatorPromotions === 'boolean') {
      monetizationConfig.enableCreatorPromotions = enableCreatorPromotions;
    }
    if (placements && typeof placements === 'object') {
      monetizationConfig.placements = {
        ...monetizationConfig.placements,
        ...placements,
      };
    }
    if (displayNetwork && typeof displayNetwork === 'object') {
      monetizationConfig.displayNetwork = {
        ...monetizationConfig.displayNetwork,
        ...displayNetwork,
      };
    }
    if (Array.isArray(directSponsors)) {
      monetizationConfig.directSponsors = directSponsors;
    }
    if (Array.isArray(creatorPromotions)) {
      monetizationConfig.creatorPromotions = creatorPromotions;
    }

    monetizationConfig.updatedAt = Date.now();
    monetizationConfig.updatedBy = authUser.username;

    saveMonetizationToDisk();
    broadcast('MONETIZATION_CONFIG_UPDATED', { config: monetizationConfig });

    res.json({
      success: true,
      message: 'Monetization & Advertising configuration saved successfully.',
      config: monetizationConfig,
    });
  });

  // 69. Get Direct Sponsors (Public active list, or all for admins)
  app.get('/api/monetization/sponsors', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    const isAdminUser = authUser && (isRootOwner(authUser) || authUser.role === 'ADMIN');

    if (isAdminUser) {
      return res.json({
        success: true,
        sponsors: monetizationConfig.directSponsors || [],
      });
    }

    const activeSponsors = (monetizationConfig.directSponsors || []).filter(
      (s) => s.status === 'APPROVED' && (!s.endDate || s.endDate > Date.now())
    );

    res.json({
      success: true,
      sponsors: activeSponsors,
    });
  });

  // 70. Add / Update Direct Sponsor (ADMIN or ROOT_OWNER)
  app.post('/api/monetization/sponsors', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!isRootOwner(authUser) && authUser.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Only Administrators can create sponsor campaigns.',
      });
    }

    const {
      sponsorName,
      tagline,
      description,
      targetUrl,
      imageUrl,
      tier,
      placements,
      category,
      startDate,
      endDate,
    } = req.body || {};

    if (!sponsorName || !description || !targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required sponsor fields (name, description, target URL).',
      });
    }

    if (!targetUrl.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'Security constraint violation: Sponsor URLs must strictly begin with "https://".',
      });
    }

    const newSponsor = {
      id: `sponsor-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      sponsorName: sanitizeString(sponsorName),
      tagline: sanitizeString(tagline || ''),
      description: sanitizeString(description),
      targetUrl: targetUrl.trim(),
      imageUrl: imageUrl ? sanitizeString(imageUrl) : undefined,
      tier: (['COMMUNITY_SPONSOR', 'FEATURED_SPONSOR', 'EVENT_SPONSOR', 'PARTNER'].includes(tier)
        ? tier
        : 'FEATURED_SPONSOR') as any,
      status: 'APPROVED' as const,
      placements: Array.isArray(placements) && placements.length > 0 ? placements : ['home_top', 'trading_sidebar'],
      category: sanitizeString(category || 'Gaming Community'),
      startDate: startDate || Date.now(),
      endDate: endDate || undefined,
      clicks: 0,
      impressions: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (!monetizationConfig.directSponsors) {
      monetizationConfig.directSponsors = [];
    }
    monetizationConfig.directSponsors.unshift(newSponsor);
    monetizationConfig.updatedAt = Date.now();
    monetizationConfig.updatedBy = authUser.username;

    saveMonetizationToDisk();
    broadcast('MONETIZATION_CONFIG_UPDATED', { config: monetizationConfig });

    res.json({
      success: true,
      message: `Sponsor campaign for "${sponsorName}" created and approved.`,
      sponsor: newSponsor,
    });
  });

  // 71. Update Sponsor Status (ADMIN or ROOT_OWNER)
  app.patch('/api/monetization/sponsors/:id', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!isRootOwner(authUser) && authUser.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Only Administrators can modify sponsor campaigns.',
      });
    }

    const { id } = req.params;
    const { status, targetUrl, tagline, description, placements, tier } = req.body || {};

    const sponsor = (monetizationConfig.directSponsors || []).find((s) => s.id === id);
    if (!sponsor) {
      return res.status(404).json({ success: false, error: 'Sponsor campaign not found.' });
    }

    if (status && ['PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'EXPIRED'].includes(status)) {
      sponsor.status = status;
    }
    if (targetUrl) {
      if (!targetUrl.startsWith('https://')) {
        return res.status(400).json({ success: false, error: 'Target URL must start with https://' });
      }
      sponsor.targetUrl = targetUrl.trim();
    }
    if (tagline !== undefined) sponsor.tagline = sanitizeString(tagline);
    if (description !== undefined) sponsor.description = sanitizeString(description);
    if (Array.isArray(placements)) sponsor.placements = placements;
    if (tier && ['COMMUNITY_SPONSOR', 'FEATURED_SPONSOR', 'EVENT_SPONSOR', 'PARTNER'].includes(tier)) {
      sponsor.tier = tier;
    }

    sponsor.updatedAt = Date.now();
    monetizationConfig.updatedAt = Date.now();
    monetizationConfig.updatedBy = authUser.username;

    saveMonetizationToDisk();
    broadcast('MONETIZATION_CONFIG_UPDATED', { config: monetizationConfig });

    res.json({
      success: true,
      message: `Sponsor campaign "${sponsor.sponsorName}" updated.`,
      sponsor,
    });
  });

  // 72. Delete Sponsor (ADMIN or ROOT_OWNER)
  app.delete('/api/monetization/sponsors/:id', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!isRootOwner(authUser) && authUser.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Only Administrators can remove sponsor campaigns.',
      });
    }

    const { id } = req.params;
    const initialLen = monetizationConfig.directSponsors?.length || 0;
    monetizationConfig.directSponsors = (monetizationConfig.directSponsors || []).filter(
      (s) => s.id !== id
    );

    if (monetizationConfig.directSponsors.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Sponsor campaign not found.' });
    }

    monetizationConfig.updatedAt = Date.now();
    monetizationConfig.updatedBy = authUser.username;

    saveMonetizationToDisk();
    broadcast('MONETIZATION_CONFIG_UPDATED', { config: monetizationConfig });

    res.json({
      success: true,
      message: 'Sponsor campaign removed successfully.',
    });
  });

  // 73. Submit Sponsorship Inquiry (Public with rate limit & honeypot)
  app.post('/api/monetization/inquiries', (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip_unknown';
    const ipKey = String(clientIp).split(',')[0].trim();

    // Rate limit: max 5 inquiries per IP per 10 minutes
    const now = Date.now();
    const timestamps = inquiryRateLimitMap.get(ipKey) || [];
    const recent = timestamps.filter((t) => now - t < 600000);
    if (recent.length >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Submission rate limit exceeded. Please wait a few minutes before submitting another proposal.',
      });
    }
    recent.push(now);
    inquiryRateLimitMap.set(ipKey, recent);

    const { companyOrCommunity, contactEmail, websiteUrl, campaignTier, message, budgetRange, botCheck } = req.body || {};

    // Honeypot check
    if (botCheck) {
      return res.json({ success: true, message: 'Inquiry received.' });
    }

    if (!companyOrCommunity || !contactEmail || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields (Company name, Email, Proposal).',
      });
    }

    if (!contactEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid corporate or contact email address.',
      });
    }

    if (websiteUrl && !websiteUrl.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'Website URL must begin with "https://".',
      });
    }

    const newInquiry: SponsorshipInquiryServer = {
      id: `inq-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      companyOrCommunity: sanitizeString(companyOrCommunity),
      contactEmail: sanitizeString(contactEmail),
      websiteUrl: websiteUrl ? websiteUrl.trim() : '',
      campaignTier: (['COMMUNITY_SPONSOR', 'FEATURED_SPONSOR', 'EVENT_SPONSOR', 'PARTNER'].includes(campaignTier)
        ? campaignTier
        : 'FEATURED_SPONSOR') as any,
      message: sanitizeString(message),
      budgetRange: budgetRange ? sanitizeString(budgetRange) : undefined,
      status: 'UNREAD',
      createdAt: Date.now(),
      ipHash: crypto.createHash('sha256').update(ipKey).digest('hex').substring(0, 12),
    };

    sponsorshipInquiries.unshift(newInquiry);
    saveMonetizationToDisk();

    res.json({
      success: true,
      message: 'Sponsorship proposal successfully received! Our partnerships team will review it within 24–48 hours.',
      inquiryId: newInquiry.id,
    });
  });

  // 74. Get Sponsorship Inquiries (ADMIN or ROOT_OWNER)
  app.get('/api/monetization/inquiries', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!isRootOwner(authUser) && authUser.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Only Administrators can view sponsorship inquiries.',
      });
    }

    res.json({
      success: true,
      inquiries: sponsorshipInquiries,
    });
  });

  // 75. Update Sponsorship Inquiry Status (ADMIN or ROOT_OWNER)
  app.patch('/api/monetization/inquiries/:id', (req, res) => {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser || (!isRootOwner(authUser) && authUser.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: Only Administrators can update inquiry status.',
      });
    }

    const { id } = req.params;
    const { status } = req.body || {};

    const inq = sponsorshipInquiries.find((i) => i.id === id);
    if (!inq) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }

    if (['UNREAD', 'CONTACTED', 'APPROVED', 'ARCHIVED'].includes(status)) {
      inq.status = status;
      saveMonetizationToDisk();
    }

    res.json({
      success: true,
      message: `Inquiry status updated to ${status}.`,
      inquiry: inq,
    });
  });

  // 46. Express API Catch-All (Ensure JSON 404 is ALWAYS returned for API paths, NEVER HTML)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route ${req.method} ${req.path} not found.`,
    });
  });

  // 47. Express Global Error Handler (Guarantees JSON error response)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      success: false,
      error: err?.message || 'An unexpected internal server error occurred.',
    });
  });

  // ==========================================
  // Vite Integration & Static Serving
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    }).then((vite) => {
      app.use(vite.middlewares);
    }).catch((err) => {
      console.error('Vite dev server init error:', err);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`VALUE.NET Live Server running on port ${PORT}`);
    });
  }
}

startServer();

export default app;
