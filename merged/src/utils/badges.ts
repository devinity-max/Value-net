import { UserBadge, BadgeRarity } from '../types';

export const ALL_BADGES: UserBadge[] = [
  {
    id: 'community_member',
    name: 'Community Member',
    description: 'Verified member of the VALUE.NET trading community.',
    icon: 'verified_user',
    rarity: 'Common',
    unlockCondition: 'Create an account on VALUE.NET',
  },
  {
    id: 'early_trader',
    name: 'Early Trader',
    description: 'Joined during the inaugural season of VALUE.NET.',
    icon: 'military_tech',
    rarity: 'Rare',
    unlockCondition: 'Pioneer platform supporter',
  },
  {
    id: 'mythical_collector',
    name: 'Mythical Collector',
    description: 'Possesses high-tier mythical fruits in trade listings.',
    icon: 'flare',
    rarity: 'Epic',
    unlockCondition: 'List or trade 5+ Mythical tier fruits',
  },
  {
    id: 'value_expert',
    name: 'Value Expert',
    description: 'Demonstrated exceptional market literacy and fair trade arbitrations.',
    icon: 'query_stats',
    rarity: 'Legendary',
    unlockCondition: 'Execute 25+ trades with 90%+ positive reputation',
  },
  {
    id: 'verified_trader',
    name: 'Verified Trader',
    description: 'Authenticated trader with zero scam reports and confirmed trades.',
    icon: 'check_circle',
    rarity: 'Rare',
    unlockCondition: 'Pass trust threshold verification',
  },
  {
    id: 'trade_scout',
    name: 'Trade Scout',
    description: 'Actively monitors market shifts and discovers top-tier bargains.',
    icon: 'radar',
    rarity: 'Rare',
    unlockCondition: 'Active peer-to-peer trade search engagement',
  },
  {
    id: 'master_negotiator',
    name: 'Master Negotiator',
    description: 'Successfully finalized high-stakes trades across Second and Third Seas.',
    icon: 'handshake',
    rarity: 'Epic',
    unlockCondition: 'Complete 50+ total peer trades',
  },
  {
    id: 'dragon_lord',
    name: 'Dragon Sovereign',
    description: 'Elite owner of physical Dragon rework assets.',
    icon: 'local_fire_department',
    rarity: 'Mythical',
    unlockCondition: 'Possess or trade Dragon (Physical)',
  },
];

export const ALL_TITLES = [
  { id: 'rookie_trader', name: 'Rookie Trader', description: 'Beginner starting out in the First Sea.', rarity: 'Common' },
  { id: 'trade_scout', name: 'Trade Scout', description: 'Market observer looking for fair exchanges.', rarity: 'Common' },
  { id: 'value_hunter', name: 'Value Hunter', description: 'Seeking profitable arbitrage opportunities.', rarity: 'Rare' },
  { id: 'elite_trader', name: 'Elite Trader', description: 'High-volume trader with positive reputation.', rarity: 'Epic' },
  { id: 'value_expert', name: 'Value Expert', description: 'Master of Blox Fruits market dynamics.', rarity: 'Legendary' },
  { id: 'dragon_emperor', name: 'Dragon Emperor', description: 'Supreme apex trader of mythical assets.', rarity: 'Mythical' },
];

export function getBadgeById(id: string): UserBadge | undefined {
  return ALL_BADGES.find((b) => b.id === id);
}

export function getUserBadges(badgeIds: string[] = []): UserBadge[] {
  return badgeIds
    .map((id) => getBadgeById(id))
    .filter((b): b is UserBadge => b !== undefined);
}

export function getTitleName(titleId: string): string {
  const t = ALL_TITLES.find((item) => item.id === titleId);
  return t ? t.name : titleId.replace(/_/g, ' ').toUpperCase();
}

export function getBadgeRarityColor(rarity: BadgeRarity | string): {
  bg: string;
  border: string;
  text: string;
  badge: string;
} {
  switch (rarity) {
    case 'Mythical':
      return {
        bg: 'bg-rose-950/60',
        border: 'border-rose-500/50',
        text: 'text-rose-300',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    case 'Legendary':
      return {
        bg: 'bg-amber-950/60',
        border: 'border-amber-500/50',
        text: 'text-amber-300',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'Epic':
      return {
        bg: 'bg-purple-950/60',
        border: 'border-purple-500/50',
        text: 'text-purple-300',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      };
    case 'Rare':
      return {
        bg: 'bg-sky-950/60',
        border: 'border-sky-500/50',
        text: 'text-sky-300',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      };
    default:
      return {
        bg: 'bg-slate-900/80',
        border: 'border-slate-700',
        text: 'text-slate-300',
        badge: 'bg-slate-800 text-slate-300 border-slate-700',
      };
  }
}

export interface BannerPresetConfig {
  id: string;
  name: string;
  cssBackground: string;
  borderGlow: string;
  accentColor: string;
}

export function getBannerPreset(preset: string): BannerPresetConfig {
  switch (preset) {
    case 'violet':
      return {
        id: 'violet',
        name: 'Void Violet',
        cssBackground: 'linear-gradient(135deg, #180b33 0%, #4c1d95 50%, #1e1b4b 100%)',
        borderGlow: 'rgba(147, 51, 234, 0.4)',
        accentColor: '#a855f7',
      };
    case 'gold':
      return {
        id: 'gold',
        name: 'Pirate Gold',
        cssBackground: 'linear-gradient(135deg, #1c1304 0%, #78350f 50%, #1e1b4b 100%)',
        borderGlow: 'rgba(245, 158, 11, 0.4)',
        accentColor: '#f59e0b',
      };
    case 'ocean':
      return {
        id: 'ocean',
        name: 'Sea Storm',
        cssBackground: 'linear-gradient(135deg, #041b2d 0%, #0c4a6e 50%, #082f49 100%)',
        borderGlow: 'rgba(14, 165, 233, 0.4)',
        accentColor: '#0ea5e9',
      };
    case 'crimson':
      return {
        id: 'crimson',
        name: 'Crimson Flame',
        cssBackground: 'linear-gradient(135deg, #24050b 0%, #881337 50%, #1f0409 100%)',
        borderGlow: 'rgba(244, 63, 94, 0.4)',
        accentColor: '#f43f5e',
      };
    case 'void':
      return {
        id: 'void',
        name: 'Abyssal Void',
        cssBackground: 'linear-gradient(135deg, #030408 0%, #090d1f 50%, #020305 100%)',
        borderGlow: 'rgba(99, 102, 241, 0.4)',
        accentColor: '#6366f1',
      };
    case 'midnight':
    default:
      if (preset && (preset.startsWith('data:') || preset.startsWith('http') || preset.startsWith('linear-gradient'))) {
        return {
          id: 'custom',
          name: 'Custom Theme',
          cssBackground: preset,
          borderGlow: 'rgba(168, 85, 247, 0.4)',
          accentColor: '#a855f7',
        };
      }
      return {
        id: 'midnight',
        name: 'Midnight Sea',
        cssBackground: 'linear-gradient(135deg, #070913 0%, #1e1b4b 50%, #0f172a 100%)',
        borderGlow: 'rgba(168, 85, 247, 0.4)',
        accentColor: '#a855f7',
      };
  }
}
