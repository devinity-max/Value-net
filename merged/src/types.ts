export type FruitRarity = 'Mythical' | 'Legendary' | 'Rare' | 'Uncommon' | 'Common' | 'Gamepass';
export type FruitType = 'Beast' | 'Elemental' | 'Natural' | 'Gamepass';
export type TrendType = 'Rising' | 'Stable' | 'Falling';
export type FruitTrend = TrendType;

export interface Fruit {
  id: string;
  name: string;
  rarity: FruitRarity;
  beliPrice: number;
  marketValue: number;
  demand: number; // 1 to 10
  trend: TrendType;
  icon: string; // Material Symbol icon name
  type: FruitType;
  description: string;
  hypeFactor: number; // 1 to 10
  isPermanent?: boolean;
  // Extended administrative attributes
  isArchived?: boolean;
  archivedAt?: number;
  tradingNotes?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'UPCOMING' | 'REWORK_PENDING';
  sortOrder?: number;
  updatedAt?: number;
  updatedBy?: string;
}

export type VerdictGrade = 'BW' | 'W' | 'F' | 'L' | 'BL' | '—';

export interface TradeAnalysis {
  yourMarketValue: number;
  theirMarketValue: number;
  yourBeliValue: number;
  theirBeliValue: number;
  diff: number;
  percentageDiff: number; // percentage difference relative to your offer
  grade: VerdictGrade;
  title: string;
  subtitle: string;
  barPercentage: number; // 0 to 100
  barColor: string;
  isBeliCompliant: boolean; // 40% rule
  factors: {
    demandScore: number;
    liquidityScore: number;
    hypeFactor: number;
    rarityParity: number;
    futureTrend: 'Bullish' | 'Neutral' | 'Bearish';
    tradeEfficiency: number;
  };
}

export interface LedgerEntry {
  id: string;
  timestamp: number;
  yourFruits: Fruit[];
  theirFruits: Fruit[];
  yourMarketValue: number;
  theirMarketValue: number;
  diff: number;
  grade: VerdictGrade;
  title: string;
}

export type ActiveTab =
  | 'calculator'
  | 'live-trades'
  | 'giveaways'
  | 'community'
  | 'host-giveaways'
  | 'admin-moderation'
  | 'owner-control'
  | 'admin'
  | 'fruit-catalog-admin'
  | 'creator'
  | 'values'
  | 'wiki'
  | 'profile'
  | 'edit-profile'
  | 'terms'
  | 'privacy'
  | 'guidelines'
  | 'safety'
  | 'contact'
  | 'security'
  | 'advertise'
  | 'support'
  | 'monetization-admin';

export type UserRole = 'ROOT_OWNER' | 'ADMIN' | 'MODERATOR' | 'APPROVED_CREATOR' | 'MEMBER';

export type BadgeRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythical';

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  unlockCondition: string;
  unlockedAt?: number;
}

export type ProfileTheme = 'midnight' | 'violet' | 'gold' | 'ocean' | 'crimson' | 'void';

export type TradingStyle =
  | 'Fair Trades'
  | 'W Trades'
  | 'Collector'
  | 'Fruit Hunter'
  | 'Value Trader'
  | 'Flexible';

export type PlayerStatus =
  | 'TRADING'
  | 'LOOKING FOR OFFERS'
  | 'GRINDING'
  | 'AWAY'
  | 'ONLINE'
  | 'BUSY'
  | 'CUSTOM';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  isGiveawaySuspended?: boolean;
  avatarUrl: string; // Material Symbol icon name OR data:image/ base64 url
  bannerUrl: string; // Preset theme ID (e.g. 'midnight') OR data:image/ base64 url
  bio: string;
  status: PlayerStatus;
  customStatus?: string;
  titleId: string;
  favoriteFruitId?: string | null;
  tradingStyle: TradingStyle;
  lookingFor: string[]; // Fruit IDs
  notInterestedIn: string[]; // Fruit IDs
  profileTheme: ProfileTheme;
  showProfile: boolean;
  showPreferences: boolean;
  showActivity: boolean;
  showTradeStats: boolean;
  server: string;
  createdAt: number;
  updatedAt: number;
  badges?: string[]; // Badge IDs
}

export interface UserStats {
  tradesCompleted: number;
  tradesRejected: number;
  tradesCancelled: number;
  tradeAdsPosted: number;
  giveawaysHosted?: number;
  acceptanceRate: number; // 0 to 100
  reputationScore: number; // 0 to 100
  rating: number; // 1.0 to 5.0
  trustLevel?: TrustLevel;
  uniqueCounterparties?: number;
  diversityRatio?: number;
  totalReviews?: number;
  positiveRatingPercent?: number;
}

export type TrustLevel =
  | 'UNRANKED'
  | 'NOVICE'
  | 'ESTABLISHED'
  | 'TRUSTED'
  | 'MASTER_TRADER'
  | 'APEX_TRADER';

export type PraiseTag =
  | 'FAST_TRADER'
  | 'FAIR_OFFERS'
  | 'HIGH_VALUE'
  | 'POLITE_COMMUNICATION'
  | 'EXACT_ITEMS'
  | 'HELPFUL'
  | 'PATIENT';

export interface TradeReview {
  id: string;
  tradeSessionId: string;
  tradeId: string;
  fromUserId: string;
  fromUsername: string;
  fromAvatar: string;
  toUserId: string;
  rating: number; // 1 to 5
  praiseTags: PraiseTag[];
  feedback?: string;
  weight: number; // Diminishing return weight (e.g. 1.0, 0.6, 0.3, 0.1)
  createdAt: number;
}

export interface TradeDispute {
  id: string;
  tradeSessionId: string;
  tradeId: string;
  reporterId: string;
  reporterUsername: string;
  targetUserId: string;
  targetUsername: string;
  reason:
    | 'SCAM_ATTEMPT'
    | 'INCORRECT_ITEMS'
    | 'REFUSAL_TO_HONOR'
    | 'ABUSIVE_BEHAVIOR'
    | 'FAKING_CONFIRMATION'
    | 'OTHER';
  details: string;
  status: 'PENDING' | 'RESOLVED_VALID' | 'RESOLVED_DISMISSED';
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  penaltyApplied?: number;
}

export interface ReputationAuditLog {
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

export interface ReputationBreakdown {
  baseTrust: number;
  volumeComponent: number;
  reviewComponent: number;
  diversityComponent: number;
  maturityBonus: number;
  penalties: number;
}

export interface ReputationSummary {
  userId: string;
  username: string;
  score: number; // 0 to 100
  trustLevel: TrustLevel;
  completedTrades: number;
  uniqueCounterparties: number;
  diversityRatio: number; // 0 to 1.0
  averageRating: number; // 1.0 to 5.0
  totalReviews: number;
  positiveRatingPercent: number; // 0 to 100
  praiseTagCounts: Record<string, number>;
  disputeCount: number;
  velocityFlags: number;
  accountAgeDays: number;
  breakdown: ReputationBreakdown;
  recentReviews: TradeReview[];
}

export interface PublicProfileData {
  profile: UserProfile;
  badges: UserBadge[];
  favoriteFruit?: Fruit | null;
  lookingForFruits: Fruit[];
  notInterestedInFruits: Fruit[];
  stats: UserStats;
  reputationSummary?: ReputationSummary;
  activeTrades: TradeAd[];
  isOwner?: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  token: string;
  role: UserRole;
  profile: UserProfile;
}

export interface TraderProfile {
  id: string;
  username: string;
  avatarIcon?: string;
  avatarUrl?: string;
  displayName?: string;
  role?: UserRole;
  server: string;
  rating: number;
  completedTrades?: number;
  totalTrades?: number;
  vouchesCount?: number;
  trustScore?: number;
  badges?: string[];
  joinDate?: string;
  bio?: string;
  status?: string;
}

export type TradeAdStatus = 'ACTIVE' | 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface TradeAd {
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

export type TradeSessionStatus = 'IN_PROGRESS' | 'CONFIRMED' | 'REJECTED' | 'CLOSED';

export interface TradeSession {
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
  // Aliases for component compatibility
  joinerUsername?: string;
  creatorUsername?: string;
  joinerConfirmed?: boolean;
}

export interface TradeMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: number;
  type?: 'chat' | 'system';
  // Aliases for component compatibility
  senderUsername?: string;
  timestamp?: number;
  text?: string;
}

export interface TradeNotification {
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

// ==========================================
// GIVEAWAYS TYPES
// ==========================================

export type GiveawayStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'ENDED'
  | 'DRAWING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface GiveawayPrize {
  id: string;
  fruitId: string;
  quantity: number;
  name: string;
  rarity: FruitRarity;
  icon: string;
  marketValue: number;
  beliPrice: number;
  type: FruitType;
  isPermanent?: boolean;
  value?: number;
  fruitIcon?: string;
  fruitName?: string;
}

export interface GiveawayRule {
  id: string;
  ruleType: 'account_required' | 'single_entry' | 'follow_host' | 'subscribe_host' | 'join_community' | 'available_on_contact' | 'no_alts' | 'custom';
  ruleText: string;
  sortOrder: number;
}

export interface GiveawayEligibility {
  minAccountAgeDays?: number;
  minTrades?: number;
  verifiedAccountRequired?: boolean;
}

export interface GiveawayItem {
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
  hasJoined?: boolean;
  reportCount?: number;
  isHost?: boolean;
  hostUsername?: string;
  endTime?: number;
  winners?: any[];
  // YouTube Code Boost Integration
  youtubeBoostEnabled?: boolean;
  youtubeVideoId?: string;
  youtubeBoostCode?: string;
  youtubeBoostPercentage?: number;
  youtubeCodeHash?: string;
  youtubeCodeSalt?: string;
  youtubeRedemptionCount?: number;
  hasUserBoosted?: boolean;
  userWinProbability?: number;
}

export interface GiveawayEntry {
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

export interface GiveawayReport {
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

// ==========================================
// ROLE & PERMISSION SYSTEM TYPES
// ==========================================

export type PermissionKey =
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
  | 'MANAGE_CREATORS'
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
  | 'MANAGE_ALL_GIVEAWAYS'
  | 'EDIT_ANY_GIVEAWAY'
  | 'CANCEL_ANY_GIVEAWAY'
  | 'MANAGE_SETTINGS';

export type RoleActionType = 'ROLE_ASSIGNED' | 'ROLE_REVOKED' | 'ROLE_INITIALIZED';

export interface RoleAuditLog {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: UserRole;
  targetId: string;
  targetUsername: string;
  targetEmail: string;
  previousRole: UserRole;
  newRole: UserRole;
  action: RoleActionType;
  reason: string;
  timestamp: number;
}

export type ModerationActionType =
  | 'USER_SUSPENDED'
  | 'USER_UNSUSPENDED'
  | 'GIVEAWAY_MODERATED'
  | 'GIVEAWAY_CANCELLED'
  | 'TRADE_REMOVED'
  | 'REPORT_ACTIONED'
  | 'REPORT_DISMISSED';

export interface ModerationAuditLog {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: UserRole;
  targetId: string;
  targetName: string;
  action: ModerationActionType;
  reason: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface AdminOverviewStats {
  totalUsers: number;
  roleBreakdown: Record<UserRole, number>;
  totalGiveaways: number;
  activeGiveaways: number;
  totalTrades: number;
  activeTrades?: number;
  pendingReports: number;
  totalAuditEvents: number;
}

export interface AdminUserListItem {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  status: PlayerStatus;
  isSuspended: boolean;
  isGiveawaySuspended: boolean;
  suspendedReason?: string;
  createdAt: number;
  tradesCompleted: number;
  reputationScore: number;
  roleAssignedAt?: number;
  roleAssignedBy?: string;
}

export interface AdminCreatorItem {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  avatarUrl: string;
  status: PlayerStatus;
  isGiveawaySuspended: boolean;
  giveawaysHosted: number;
  activeGiveaways: number;
  totalParticipants: number;
  createdAt: number;
  roleAssignedAt?: number;
  roleAssignedBy?: string;
}

export interface PlatformSettings {
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

export interface CreatorOverviewStats {
  totalGiveaways: number;
  activeGiveaways: number;
  upcomingGiveaways: number;
  draftGiveaways: number;
  completedGiveaways: number;
  totalParticipants: number;
  avgParticipantsPerGiveaway: number;
}

export interface UnifiedAuditLog {
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

export interface AdminRecentActivity {
  recentRoleChanges: RoleAuditLog[];
  recentGiveaways: GiveawayItem[];
  recentReports: GiveawayReport[];
  recentModerationActions: ModerationAuditLog[];
}

export interface FruitMutationPayload {
  id?: string;
  name: string;
  rarity: FruitRarity;
  beliPrice: number;
  marketValue: number;
  demand: number;
  trend: TrendType;
  icon: string;
  type: FruitType;
  description: string;
  hypeFactor: number;
  isPermanent?: boolean;
  isArchived?: boolean;
  tradingNotes?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'UPCOMING' | 'REWORK_PENDING';
  sortOrder?: number;
}

export interface FruitCatalogStats {
  totalFruits: number;
  activeFruits: number;
  archivedFruits: number;
  totalEconomyValuation: number;
  rarityBreakdown: Record<FruitRarity, number>;
  typeBreakdown: Record<FruitType, number>;
  avgDemand: number;
  risingCount: number;
  stableCount: number;
  fallingCount: number;
  lastUpdated: number;
}

export interface FruitAuditLog {
  id: string;
  fruitId: string;
  fruitName: string;
  action: 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'RESTORE' | 'DELETE' | 'BULK_UPDATE';
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
  logoUrl?: string;
  faviconUrl?: string;
  accentTheme: 'amber' | 'crimson' | 'emerald' | 'cyan' | 'violet' | 'gold';
  footerText: string;
  navLabel: string;
  updatedAt: number;
  updatedBy: string;
}

export interface FruitFilterParams {
  query?: string;
  rarity?: string;
  type?: string;
  status?: 'ALL' | 'ACTIVE' | 'ARCHIVED';
  trend?: string;
  sortBy?: 'marketValue' | 'beliPrice' | 'demand' | 'name' | 'sortOrder' | 'updatedAt';
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ==========================================
// Monetization & Advertisement Infrastructure
// ==========================================

export type AdPlacement =
  | 'home-hero-sub'
  | 'home-between-sections'
  | 'home-footer-pre'
  | 'home-below-calculator'
  | 'trading-sidebar'
  | 'trading-infeed'
  | 'trading-in-feed'
  | 'market-infeed'
  | 'marketplace-native'
  | 'community-sidebar'
  | 'community-infeed'
  | 'community-in-feed'
  | 'giveaways-banner'
  | 'giveaway-banner'
  | 'footer-top'
  | 'footer-banner';

export type AdVariant = 'Banner' | 'Rectangle' | 'Native' | 'Sidebar' | 'InFeed' | 'Footer';

export type AdProviderType = 'display_network' | 'direct_sponsor' | 'house_ad' | 'none';

export type SponsorTier = 'COMMUNITY_SPONSOR' | 'FEATURED_SPONSOR' | 'EVENT_SPONSOR' | 'PARTNER';

export type CampaignStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'PAUSED';

export interface DirectSponsorItem {
  id: string;
  tier: SponsorTier;
  sponsorName: string;
  tagline: string;
  description: string;
  targetUrl: string; // Must be strictly https://
  imageUrl?: string;
  accentColor?: string;
  badgeLabel?: string;
  status: CampaignStatus;
  category: string;
  startDate?: number;
  endDate?: number;
  approvedBy?: string;
  createdAt: number;
}

export interface HouseAdItem {
  id: string;
  title: string;
  tagline: string;
  description: string;
  buttonText: string;
  badgeText: string;
  icon: string;
  targetTab?: ActiveTab;
  externalUrl?: string;
  accentGradient: string;
}

export interface MonetizationConfig {
  enabled: boolean; // Global master killswitch
  provider: AdProviderType;
  displayAdsEnabled: boolean;
  sponsorshipsEnabled: boolean;
  featuredTradesEnabled: boolean;
  creatorPromotionsEnabled: boolean;
  enableCreatorPromotions?: boolean;
  communitySupportEnabled: boolean;
  premiumMembershipEnabled: boolean;
  houseAdsEnabled: boolean;
  adFrequency: number; // Render ad every N items (default: 10)
  mobileAdsEnabled: boolean;
  enableMobileAds?: boolean;
  mobileAdDensity: 'standard' | 'minimal' | 'disabled';
  density?: 'standard' | 'minimal' | 'disabled';
  placements: {
    home: boolean;
    trading: boolean;
    market: boolean;
    community: boolean;
    giveaways: boolean;
    footer: boolean;
  };
  directSponsors: DirectSponsorItem[];
  updatedAt?: number;
  updatedBy?: string;
}

export interface SponsorshipInquiry {
  id: string;
  companyOrCommunity: string;
  contactEmail: string;
  websiteUrl: string;
  campaignTier: SponsorTier;
  message: string;
  budgetRange?: string;
  status: 'UNREAD' | 'CONTACTED' | 'APPROVED' | 'ARCHIVED';
  createdAt: number;
  ipAddress?: string;
}

export interface CreatorPromotion {
  id: string;
  creatorId: string;
  creatorUsername: string;
  title: string;
  description: string;
  targetUrl: string;
  promoType: 'YOUTUBE' | 'DISCORD' | 'EVENT' | 'TRADING_LOBBY';
  badgeText: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  createdAt: number;
}





