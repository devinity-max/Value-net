import crestLogo from '../assets/images/valuenet_crest_logo_1788209621725.jpg';
import heroEmergence from '../assets/images/valuenet_hero_emergence_1788209636759.jpg';

export interface Founder {
  id: string;
  name: 'YAMI' | 'VOID' | 'REX';
  title: 'FOUNDER';
  role: string;
  bio: string;
  avatarGradient: string;
  glowColor: string;
  badge: string;
  icon: string;
}

export interface CommunityPillar {
  title: string;
  description: string;
  icon: string;
  accentColor: string;
}

export const BRAND_CONFIG = {
  name: 'VALUE.NET',
  shortName: 'VALUE.NET',
  domain: 'value.net',
  tagline: 'Trade. Connect. Build your legacy.',
  subtitle: 'A community built around trading, creators, events, and players.',
  officialDiscordUrl: 'https://discord.gg/np4sVrpypF',
  discordLabel: 'JOIN DISCORD',
  discordSubtext: 'Join the community beyond VALUE.NET.',
  logoCrestUrl: crestLogo,
  heroEmergenceUrl: heroEmergence,
  disclaimer:
    'VALUE.NET is an independent community platform and trading terminal. It is not affiliated with, endorsed by, or sponsored by Roblox Corporation or Gamer Robot Inc.',
} as const;

export const FOUNDERS: Founder[] = [
  {
    id: 'founder-yami',
    name: 'YAMI',
    title: 'FOUNDER',
    role: 'Founder & Community Lead',
    bio: 'Pioneered the VALUE.NET community vision, championing fair trading transparency, market liquidity, and competitive fruit economics across all seas.',
    avatarGradient: 'from-amber-400 via-amber-500 to-yellow-600',
    glowColor: 'rgba(245, 158, 11, 0.25)',
    badge: 'CORE FOUNDER',
    icon: 'crown',
  },
  {
    id: 'founder-void',
    name: 'VOID',
    title: 'FOUNDER',
    role: 'Founder & Systems Architect',
    bio: 'Engineered the high-precision fair exchange matrix, 40% Beli arbitrage compliance algorithms, and real-time trade verification protocols.',
    avatarGradient: 'from-purple-500 via-indigo-600 to-purple-800',
    glowColor: 'rgba(168, 85, 247, 0.25)',
    badge: 'CORE FOUNDER',
    icon: 'token',
  },
  {
    id: 'founder-rex',
    name: 'REX',
    title: 'FOUNDER',
    role: 'Founder & Operations Lead',
    bio: 'Directs community trust standards, verified creator drop programs, community trader certifications, and cross-platform integrity.',
    avatarGradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    glowColor: 'rgba(52, 211, 153, 0.25)',
    badge: 'CORE FOUNDER',
    icon: 'shield_person',
  },
];

export const COMMUNITY_PILLARS: CommunityPillar[] = [
  {
    title: 'Fair Trade Arbitrage',
    description:
      'Mathematically balanced 40% in-game Beli threshold validation and demand-adjusted market liquidity metrics built for transparent exchanges.',
    icon: 'balance',
    accentColor: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
  },
  {
    title: 'Trust & Reputation Ledger',
    description:
      'Community trust scores, completed trade ledgers, and verified feedback preventing scams and boosting honest traders.',
    icon: 'verified_user',
    accentColor: 'text-purple-400 bg-purple-950/40 border-purple-500/30',
  },
  {
    title: 'Verified Creator Drops',
    description:
      'Transparent community giveaways powered by verified creators and founders with automated random winner selection.',
    icon: 'featured_seasonal_and_gifts',
    accentColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
  },
  {
    title: 'Zero-Scam Standard',
    description:
      'Strict community guidelines, temporary negotiation rooms, and active reporting mechanisms guarding players around the clock.',
    icon: 'gavel',
    accentColor: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
  },
];
