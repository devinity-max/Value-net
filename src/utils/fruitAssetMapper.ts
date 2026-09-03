// VALUE.NET — Authoritative Blox Fruits Asset & Image Integration Engine
// REAL ASSETS ONLY: Strictly maps catalog entries to real PNG asset files located in /assets/fruits/

import { Fruit, FruitRarity } from '../types';

export interface FruitAssetInfo {
  id: string;
  name: string;
  category: 'Fruit' | 'Gamepass' | 'Variant' | 'Scroll';
  rarity: FruitRarity;
  imageUrl?: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
}

export function normalizeFruitKey(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const ALIAS_MAP: Record<string, string> = {
  paw: 'pain',
  string: 'spider',
  revive: 'ghost',
  yoru: 'dark-blade',
  blade: 'chop',
  storage: 'plus-1-storage',
  '1-fruit-storage': 'plus-1-storage',
  'fruit-storage': 'plus-1-storage',
  money: '2x-money',
  mastery: '2x-mastery',
  'fast-boat': 'fast-boats',
  boats: 'fast-boats',
  notifier: 'fruit-notifier',
  door: 'portal',
  kilo: 'rocket',
  tsunami: 'quake',
  dough2: 'dough',
  rex: 't-rex',
  trex: 't-rex',
  momo: 'mammoth',
  kits: 'kitsune',
  leo: 'leopard',
  tiger: 'leopard',
};

export const BLOX_FRUITS_ASSET_REGISTRY: Record<string, FruitAssetInfo> = {
  // --- MYTHICAL FRUITS ---
  kitsune: {
    id: 'kitsune',
    name: 'Kitsune',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/462842-kitsune.png',
    primaryColor: '#0ea5e9',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.5)',
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/556737-dragonfruit.png',
    primaryColor: '#e11d48',
    accentColor: '#fb7185',
    glowColor: 'rgba(244, 63, 94, 0.5)',
  },
  leopard: {
    id: 'leopard',
    name: 'Leopard',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/988436-tigerfruit.png',
    primaryColor: '#f59e0b',
    accentColor: '#fde047',
    glowColor: 'rgba(245, 158, 11, 0.5)',
  },
  dough: {
    id: 'dough',
    name: 'Dough',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/795619-doughfruit.png',
    primaryColor: '#f97316',
    accentColor: '#ffedd5',
    glowColor: 'rgba(249, 115, 22, 0.5)',
  },
  't-rex': {
    id: 't-rex',
    name: 'T-Rex',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/778421-trexfruit.png',
    primaryColor: '#22c55e',
    accentColor: '#bbf7d0',
    glowColor: 'rgba(34, 197, 94, 0.5)',
  },
  mammoth: {
    id: 'mammoth',
    name: 'Mammoth',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/822085-mammothfruit.png',
    primaryColor: '#92400e',
    accentColor: '#fde68a',
    glowColor: 'rgba(146, 64, 14, 0.5)',
  },
  spirit: {
    id: 'spirit',
    name: 'Spirit',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/478600-spiritfruit.png',
    primaryColor: '#0ea5e9',
    accentColor: '#f43f5e',
    glowColor: 'rgba(236, 72, 153, 0.5)',
  },
  venom: {
    id: 'venom',
    name: 'Venom',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/228287-venomfruit.png',
    primaryColor: '#a855f7',
    accentColor: '#e9d5ff',
    glowColor: 'rgba(168, 85, 247, 0.5)',
  },
  control: {
    id: 'control',
    name: 'Control',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/589002-controlfruit.png',
    primaryColor: '#06b6d4',
    accentColor: '#a5f3fc',
    glowColor: 'rgba(6, 182, 212, 0.5)',
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/218104-shadowfruit.png',
    primaryColor: '#6366f1',
    accentColor: '#c7d2fe',
    glowColor: 'rgba(99, 102, 241, 0.5)',
  },
  gravity: {
    id: 'gravity',
    name: 'Gravity',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/31479-gravityfruit.png',
    primaryColor: '#64748b',
    accentColor: '#cbd5e1',
    glowColor: 'rgba(100, 116, 139, 0.5)',
  },
  yeti: {
    id: 'yeti',
    name: 'Yeti',
    category: 'Fruit',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/109777-yetifruit.png',
    primaryColor: '#38bdf8',
    accentColor: '#e0f2fe',
    glowColor: 'rgba(56, 189, 248, 0.5)',
  },

  // --- LEGENDARY FRUITS ---
  buddha: {
    id: 'buddha',
    name: 'Buddha',
    category: 'Fruit',
    rarity: 'Legendary',
    imageUrl: '/assets/fruits/462842-kitsune.png',
    primaryColor: '#eab308',
    accentColor: '#fef08a',
    glowColor: 'rgba(234, 179, 8, 0.5)',
  },
  pain: {
    id: 'pain',
    name: 'Pain (Paw)',
    category: 'Fruit',
    rarity: 'Legendary',
    imageUrl: '/assets/fruits/123059-sadnesspain.png',
    primaryColor: '#f43f5e',
    accentColor: '#fda4af',
    glowColor: 'rgba(244, 63, 94, 0.5)',
  },

  // --- COMMON / UNCOMMON / RARE FRUITS ---
  bomb: {
    id: 'bomb',
    name: 'Bomb',
    category: 'Fruit',
    rarity: 'Common',
    imageUrl: '/assets/fruits/455658-bombfruit.png',
    primaryColor: '#334155',
    accentColor: '#94a3b8',
    glowColor: 'rgba(51, 65, 85, 0.3)',
  },
  smoke: {
    id: 'smoke',
    name: 'Smoke',
    category: 'Fruit',
    rarity: 'Common',
    imageUrl: '/assets/fruits/368251-smokefruit.png',
    primaryColor: '#64748b',
    accentColor: '#e2e8f0',
    glowColor: 'rgba(100, 116, 139, 0.3)',
  },
  spin: {
    id: 'spin',
    name: 'Spin',
    category: 'Fruit',
    rarity: 'Common',
    imageUrl: '/assets/fruits/709054-spinfruit.png',
    primaryColor: '#eab308',
    accentColor: '#fef08a',
    glowColor: 'rgba(234, 179, 8, 0.3)',
  },
  spike: {
    id: 'spike',
    name: 'Spike',
    category: 'Fruit',
    rarity: 'Common',
    imageUrl: '/assets/fruits/806632-spikefruit.png',
    primaryColor: '#64748b',
    accentColor: '#94a3b8',
    glowColor: 'rgba(100, 116, 139, 0.3)',
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket',
    category: 'Fruit',
    rarity: 'Common',
    imageUrl: '/assets/fruits/824076-rocketfruit.png',
    primaryColor: '#ef4444',
    accentColor: '#fca5a5',
    glowColor: 'rgba(239, 68, 68, 0.3)',
  },
  spring: {
    id: 'spring',
    name: 'Spring',
    category: 'Fruit',
    rarity: 'Common',
    imageUrl: '/assets/fruits/150799-springfruit.png',
    primaryColor: '#64748b',
    accentColor: '#cbd5e1',
    glowColor: 'rgba(100, 116, 139, 0.3)',
  },
  chop: {
    id: 'chop',
    name: 'Chop (Blade)',
    category: 'Fruit',
    rarity: 'Common',
    imageUrl: '/assets/fruits/850974-bladefruit.png',
    primaryColor: '#3b82f6',
    accentColor: '#93c5fd',
    glowColor: 'rgba(59, 130, 246, 0.3)',
  },

  // --- GAMEPASS ASSETS ---
  'dark-blade': {
    id: 'dark-blade',
    name: 'Dark Blade (Yoru)',
    category: 'Gamepass',
    rarity: 'Gamepass',
    imageUrl: '/assets/fruits/414033-darkblade.png',
    primaryColor: '#22c55e',
    accentColor: '#bbf7d0',
    glowColor: 'rgba(34, 197, 94, 0.6)',
  },
  'fruit-notifier': {
    id: 'fruit-notifier',
    name: 'Fruit Notifier',
    category: 'Gamepass',
    rarity: 'Gamepass',
    imageUrl: '/assets/fruits/54929-fruitnotifier.png',
    primaryColor: '#a855f7',
    accentColor: '#f3e8ff',
    glowColor: 'rgba(168, 85, 247, 0.6)',
  },
  '2x-money': {
    id: '2x-money',
    name: '2x Money',
    category: 'Gamepass',
    rarity: 'Gamepass',
    imageUrl: '/assets/fruits/594113-2xmoney.png',
    primaryColor: '#eab308',
    accentColor: '#fef08a',
    glowColor: 'rgba(234, 179, 8, 0.6)',
  },
  '2x-mastery': {
    id: '2x-mastery',
    name: '2x Mastery',
    category: 'Gamepass',
    rarity: 'Gamepass',
    imageUrl: '/assets/fruits/706576-2xmastery.png',
    primaryColor: '#a855f7',
    accentColor: '#ede9fe',
    glowColor: 'rgba(168, 85, 247, 0.6)',
  },
  'fast-boats': {
    id: 'fast-boats',
    name: 'Fast Boats',
    category: 'Gamepass',
    rarity: 'Gamepass',
    imageUrl: '/assets/fruits/680106-fastboats.png',
    primaryColor: '#0ea5e9',
    accentColor: '#e0f2fe',
    glowColor: 'rgba(14, 165, 233, 0.6)',
  },
  'plus-1-storage': {
    id: 'plus-1-storage',
    name: '+1 Fruit Storage',
    category: 'Gamepass',
    rarity: 'Gamepass',
    imageUrl: '/assets/fruits/213056-fruitstorage.png',
    primaryColor: '#f59e0b',
    accentColor: '#fef3c7',
    glowColor: 'rgba(245, 158, 11, 0.6)',
  },
  'stat-reset': {
    id: 'stat-reset',
    name: 'Stat Reset',
    category: 'Gamepass',
    rarity: 'Gamepass',
    imageUrl: '/assets/fruits/753758-statreset.png',
    primaryColor: '#38bdf8',
    accentColor: '#e0f2fe',
    glowColor: 'rgba(56, 189, 248, 0.6)',
  },

  // --- VARIANTS / SKINS ---
  'galaxy-kitsune': {
    id: 'galaxy-kitsune',
    name: 'Galaxy Kitsune (Skin)',
    category: 'Variant',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/960845-galaxykitsune.png',
    primaryColor: '#8b5cf6',
    accentColor: '#c4b5fd',
    glowColor: 'rgba(139, 92, 246, 0.6)',
  },
  'crimson-kitsune': {
    id: 'crimson-kitsune',
    name: 'Crimson Kitsune (Skin)',
    category: 'Variant',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/219445-crimsonkitsune.png',
    primaryColor: '#ef4444',
    accentColor: '#fca5a5',
    glowColor: 'rgba(239, 68, 68, 0.6)',
  },
  'ember-east-dragon': {
    id: 'ember-east-dragon',
    name: 'Ember East Dragon (Skin)',
    category: 'Variant',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/151846-embereastdragon.png',
    primaryColor: '#f97316',
    accentColor: '#ffedd5',
    glowColor: 'rgba(249, 115, 22, 0.6)',
  },
  'ember-west-dragon': {
    id: 'ember-west-dragon',
    name: 'Ember West Dragon (Skin)',
    category: 'Variant',
    rarity: 'Mythical',
    imageUrl: '/assets/fruits/151221-emberwestdragon.png',
    primaryColor: '#f97316',
    accentColor: '#ffedd5',
    glowColor: 'rgba(249, 115, 22, 0.6)',
  },
};

export function getFruitAsset(fruitOrName?: Fruit | Partial<Fruit> | Record<string, any> | string | null): FruitAssetInfo {
  if (!fruitOrName) {
    return {
      id: 'unknown',
      name: 'Unknown Item',
      category: 'Fruit',
      rarity: 'Common',
      primaryColor: '#64748b',
      accentColor: '#cbd5e1',
      glowColor: 'rgba(100, 116, 139, 0.3)',
    };
  }

  const rawObj = typeof fruitOrName === 'object' && fruitOrName !== null ? (fruitOrName as Record<string, any>) : null;
  const rawId = typeof fruitOrName === 'string' ? fruitOrName : (rawObj?.id || rawObj?.fruitId);
  const rawName = typeof fruitOrName === 'string' ? fruitOrName : (rawObj?.name || rawObj?.fruitName);
  const customImageUrl = rawObj ? (rawObj.imageUrl || rawObj.image_url) : undefined;
  const rarity = (rawObj?.rarity || 'Common') as FruitRarity;

  const key = normalizeFruitKey(rawId || rawName);
  const matchedKey = ALIAS_MAP[key] || key;

  // Direct match from registry
  if (BLOX_FRUITS_ASSET_REGISTRY[matchedKey]) {
    const base = BLOX_FRUITS_ASSET_REGISTRY[matchedKey];
    return {
      ...base,
      imageUrl: customImageUrl || base.imageUrl,
    };
  }

  // Fuzzy check through registry keys
  for (const [regKey, regAsset] of Object.entries(BLOX_FRUITS_ASSET_REGISTRY)) {
    if (key.includes(regKey) || regKey.includes(key)) {
      return {
        ...regAsset,
        imageUrl: customImageUrl || regAsset.imageUrl,
      };
    }
  }

  // Dynamic clean fallback
  const dynamicCategory = rarity === 'Gamepass' ? 'Gamepass' : 'Fruit';

  return {
    id: matchedKey,
    name: rawName || 'Custom Item',
    category: dynamicCategory,
    rarity,
    imageUrl: customImageUrl,
    primaryColor: rarity === 'Mythical' ? '#e11d48' : rarity === 'Legendary' ? '#f59e0b' : '#3b82f6',
    accentColor: '#ffffff',
    glowColor: rarity === 'Mythical' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)',
  };
}

export function classifyAsset(item: Fruit | string): {
  category: 'Fruit' | 'Gamepass' | 'Variant';
  matched: boolean;
  assetKey: string;
} {
  const asset = getFruitAsset(item);
  const isDirect = !!BLOX_FRUITS_ASSET_REGISTRY[asset.id];
  return {
    category: asset.category === 'Gamepass' ? 'Gamepass' : asset.category === 'Variant' ? 'Variant' : 'Fruit',
    matched: isDirect || !!asset.imageUrl,
    assetKey: asset.id,
  };
}
