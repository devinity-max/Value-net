import { BRAND_CONFIG } from '../data/brand';

const DISCORD_STORAGE_KEY = 'valuenet_custom_discord_url';
const DISCORD_SUBTEXT_STORAGE_KEY = 'valuenet_custom_discord_subtext';

/**
 * Validate that a provided string looks like a valid Discord invite or web link
 */
export function isValidDiscordUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Accept standard discord invites (https://discord.gg/..., https://discord.com/invite/...) or generic https/http links
  const discordPattern = /^(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9-_]+/i;
  const generalHttps = /^https:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/i;

  return discordPattern.test(trimmed) || generalHttps.test(trimmed);
}

/**
 * Clean and standardize Discord URL
 */
export function formatDiscordUrl(url: string): string {
  let trimmed = url.trim();
  if (!trimmed) return BRAND_CONFIG.officialDiscordUrl;

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    if (trimmed.startsWith('discord.gg/') || trimmed.startsWith('discord.com/')) {
      trimmed = `https://${trimmed}`;
    } else {
      trimmed = `https://discord.gg/${trimmed.replace(/^\/+/, '')}`;
    }
  }
  return trimmed;
}

/**
 * Retrieve current active Discord invite URL (stored or default)
 */
export function getDiscordUrl(): string {
  try {
    const saved = localStorage.getItem(DISCORD_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim();
    }
  } catch (e) {
    console.warn('Unable to read discord URL from localStorage', e);
  }
  return BRAND_CONFIG.officialDiscordUrl;
}

/**
 * Save custom Discord invite URL
 */
export function setDiscordUrl(url: string): { success: boolean; url: string; error?: string } {
  try {
    const trimmed = url.trim();
    if (!trimmed) {
      localStorage.removeItem(DISCORD_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('valuenet:discord-updated', { detail: { url: BRAND_CONFIG.officialDiscordUrl } }));
      return { success: true, url: BRAND_CONFIG.officialDiscordUrl };
    }

    const formatted = formatDiscordUrl(trimmed);
    localStorage.setItem(DISCORD_STORAGE_KEY, formatted);
    window.dispatchEvent(new CustomEvent('valuenet:discord-updated', { detail: { url: formatted } }));
    return { success: true, url: formatted };
  } catch (e: any) {
    return { success: false, url: getDiscordUrl(), error: e?.message || 'Storage write failed' };
  }
}

/**
 * Reset Discord URL back to default
 */
export function resetDiscordUrl(): string {
  try {
    localStorage.removeItem(DISCORD_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('valuenet:discord-updated', { detail: { url: BRAND_CONFIG.officialDiscordUrl } }));
  } catch (e) {
    console.warn('Unable to reset discord URL', e);
  }
  return BRAND_CONFIG.officialDiscordUrl;
}
