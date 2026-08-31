import {
  MonetizationConfig,
  DirectSponsorItem,
  HouseAdItem,
  SponsorshipInquiry,
  AdPlacement,
} from '../types';

export const DEFAULT_MONETIZATION_CONFIG: MonetizationConfig = {
  enabled: true,
  provider: 'house_ad',
  displayAdsEnabled: false,
  sponsorshipsEnabled: true,
  featuredTradesEnabled: true,
  creatorPromotionsEnabled: true,
  communitySupportEnabled: true,
  premiumMembershipEnabled: false,
  houseAdsEnabled: true,
  adFrequency: 10,
  mobileAdsEnabled: true,
  mobileAdDensity: 'standard',
  placements: {
    home: true,
    trading: true,
    market: true,
    community: true,
    giveaways: true,
    footer: true,
  },
  directSponsors: [],
  updatedAt: Date.now(),
  updatedBy: 'SYSTEM',
};

// Helpful, non-deceptive house ads that promote the VALUE.NET ecosystem
export const HOUSE_ADS: HouseAdItem[] = [
  {
    id: 'house-discord',
    title: 'Join the Official VALUE.NET Discord',
    tagline: 'Connect with 25,000+ Blox Fruits Traders',
    description: 'Get real-time trade signals, participate in verified staff giveaways, and chat with trusted community partners.',
    buttonText: 'Join Discord Server',
    badgeText: 'COMMUNITY HUB',
    icon: 'forum',
    targetTab: 'community',
    accentGradient: 'from-[#5865F2]/30 via-indigo-950/40 to-[#070913]',
  },
  {
    id: 'house-calculator',
    title: 'Trade Value Arbitration Engine',
    tagline: 'Instant W/F/L Verdict with 40% Beli Rule Compliance',
    description: 'Test your trades against live supply-demand dynamics and avoid overpaying on high-hype mythical fruits.',
    buttonText: 'Open Calculator',
    badgeText: 'CORE TOOL',
    icon: 'calculate',
    targetTab: 'calculator',
    accentGradient: 'from-amber-500/20 via-purple-950/40 to-[#070913]',
  },
  {
    id: 'house-values',
    title: 'Fruit Values & Trend Index',
    tagline: 'Real-Time Market Values, Demands & Trends',
    description: 'Explore active values for all Physical & Permanent fruits, updated continuously with historical liquidity data.',
    buttonText: 'Explore Fruit Values',
    badgeText: 'MARKET INTELLIGENCE',
    icon: 'insights',
    targetTab: 'values',
    accentGradient: 'from-emerald-500/20 via-teal-950/40 to-[#070913]',
  },
  {
    id: 'house-giveaways',
    title: 'Verified Community Drops & Events',
    tagline: 'Cryptographically Fair Winner Selection',
    description: 'Enter creator-sponsored drops and platform events with zero entry fees and instant cryptographic winner draws.',
    buttonText: 'View Active Drops',
    badgeText: 'COMMUNITY DROPS',
    icon: 'featured_seasonal_and_gifts',
    targetTab: 'giveaways',
    accentGradient: 'from-purple-500/25 via-indigo-950/40 to-[#070913]',
  },
  {
    id: 'house-safety',
    title: 'Fair Trading & Anti-Scam Protection',
    tagline: 'Protect Your Inventory Against Common Exploits',
    description: 'Learn the safety protocols, recognize fake link phishing, and report malicious actors to our certified mod team.',
    buttonText: 'Read Safety Guide',
    badgeText: 'SECURITY & TRUST',
    icon: 'shield',
    targetTab: 'safety',
    accentGradient: 'from-rose-500/20 via-amber-950/30 to-[#070913]',
  },
];

// In-memory config cache for instant synchronous component access
let cachedConfig: MonetizationConfig = { ...DEFAULT_MONETIZATION_CONFIG };

export function getCachedMonetizationConfig(): MonetizationConfig {
  return cachedConfig;
}

export function setCachedMonetizationConfig(config: MonetizationConfig): void {
  cachedConfig = { ...config };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('valuenet:monetization-updated', { detail: { config } })
    );
  }
}

// Strict URL Validator: Only allow https:// URLs to prevent XSS / javascript: / phishing
export function isValidHttpsUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

export function sanitizeTargetUrl(urlStr: string): string {
  if (isValidHttpsUrl(urlStr)) {
    return urlStr.trim();
  }
  return '#';
}

// Check whether an ad slot should be displayed
export function shouldShowAdSlot(
  config: MonetizationConfig,
  placement: AdPlacement,
  isMobile: boolean = false
): boolean {
  // Master killswitch
  if (!config.enabled) return false;

  // Mobile density check
  if (isMobile) {
    if (!config.mobileAdsEnabled || config.mobileAdDensity === 'disabled') {
      return false;
    }
  }

  // Check placement granular switches
  if (placement.startsWith('home') && !config.placements.home) return false;
  if (placement.startsWith('trading') && !config.placements.trading) return false;
  if (placement.startsWith('market') && !config.placements.market) return false;
  if (placement.startsWith('community') && !config.placements.community) return false;
  if (placement.startsWith('giveaways') && !config.placements.giveaways) return false;
  if (placement.startsWith('footer') && !config.placements.footer) return false;

  return true;
}

// Fetch monetization config from backend
export async function apiGetMonetizationConfig(): Promise<{
  success: boolean;
  config: MonetizationConfig;
}> {
  try {
    const res = await fetch('/api/monetization/config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        setCachedMonetizationConfig(data.config);
        return { success: true, config: data.config };
      }
    }
  } catch (err) {
    // Non-blocking fallback
    console.warn('Could not fetch remote monetization config, using cached:', err);
  }
  return { success: true, config: cachedConfig };
}

// Update monetization config (Admin only)
export async function apiUpdateMonetizationConfig(
  config: Partial<MonetizationConfig>
): Promise<{ success: boolean; config?: MonetizationConfig; error?: string }> {
  try {
    const res = await fetch('/api/monetization/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (data.success && data.config) {
      setCachedMonetizationConfig(data.config);
      return { success: true, config: data.config };
    }
    return { success: false, error: data.error || 'Failed to update configuration' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating monetization config' };
  }
}

// Submit a sponsorship inquiry (Public, with rate limiting protection)
export async function apiSubmitSponsorshipInquiry(inquiry: {
  companyOrCommunity: string;
  contactEmail: string;
  websiteUrl: string;
  campaignTier: string;
  message: string;
  budgetRange?: string;
  botCheck?: string; // Honeypot
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/monetization/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to transmit sponsorship inquiry' };
  }
}

// Get inquiries (Admin only)
export async function apiGetSponsorshipInquiries(): Promise<{
  success: boolean;
  inquiries?: SponsorshipInquiry[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/monetization/inquiries');
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch inquiries' };
  }
}

// Update inquiry status (Admin only)
export async function apiUpdateInquiryStatus(
  id: string,
  status: 'UNREAD' | 'CONTACTED' | 'APPROVED' | 'ARCHIVED'
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/monetization/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update status' };
  }
}

// Fetch active approved sponsors
export async function apiGetDirectSponsors(): Promise<{
  success: boolean;
  sponsors: DirectSponsorItem[];
}> {
  try {
    const res = await fetch('/api/monetization/sponsors');
    const data = await res.json();
    if (data.success && Array.isArray(data.sponsors)) {
      return { success: true, sponsors: data.sponsors };
    }
  } catch (err) {
    console.warn('Failed to load sponsors:', err);
  }
  return { success: true, sponsors: [] };
}

// Save or create direct sponsor (Admin only)
export async function apiSaveDirectSponsor(
  sponsor: Partial<DirectSponsorItem>
): Promise<{ success: boolean; sponsor?: DirectSponsorItem; error?: string }> {
  try {
    const res = await fetch('/api/monetization/sponsors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sponsor),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save direct sponsor' };
  }
}

// Update sponsor status (Admin only)
export async function apiUpdateSponsorStatus(
  id: string,
  status: DirectSponsorItem['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/monetization/sponsors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update sponsor status' };
  }
}

// Delete direct sponsor (Admin only)
export async function apiDeleteDirectSponsor(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/monetization/sponsors/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete direct sponsor' };
  }
}

// Admin aliases for consistency
export const apiGetAdminSponsors = apiGetDirectSponsors;
export const apiCreateDirectSponsor = apiSaveDirectSponsor;
export const apiUpdateDirectSponsorStatus = apiUpdateSponsorStatus;
export const apiGetAdminInquiries = apiGetSponsorshipInquiries;

