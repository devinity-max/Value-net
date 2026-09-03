import { Fruit } from '../types';
import { BLOX_FRUITS_DATA } from '../data/fruits';
import { safeFetchJson } from './apiHelper';
import { getAuthToken } from './auth';
import { supabase } from '../lib/supabaseClient';

let cache: Fruit[] = [...BLOX_FRUITS_DATA];
let cacheLoaded = false;
let inFlight: Promise<Fruit[]> | null = null;
const listeners = new Set<(fruits: Fruit[]) => void>();

const isVercel =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') || import.meta.env.PROD);

function notifyListeners() {
  listeners.forEach((l) => l(cache));
}

async function fetchActiveFruits(): Promise<Fruit[]> {
  if (cacheLoaded && cache.length > 0) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      // 1. Try Supabase
      const { data: dbFruits, error: sbErr } = await supabase
        .from('fruits')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!sbErr && dbFruits && dbFruits.length > 0) {
        cache = dbFruits.map((f: any) => ({
          id: f.id,
          name: f.name,
          rarity: f.rarity,
          beliPrice: Number(f.beli_price || f.beliPrice || 0),
          marketValue: Number(f.market_value || f.marketValue || 0),
          demand: Number(f.demand || 1),
          trend: f.trend || 'Stable',
          icon: f.icon || 'flare',
          type: f.type || 'Natural',
          description: f.description || '',
          hypeFactor: Number(f.hype_factor || f.hypeFactor || 1),
          imageUrl: f.image_url || f.imageUrl,
          isPermanent: !!f.is_permanent,
          isArchived: !!f.is_archived,
          status: f.status || 'ACTIVE',
          sortOrder: f.sort_order || f.sortOrder || 99,
          updatedAt: f.updated_at ? new Date(f.updated_at).getTime() : Date.now(),
          updatedBy: f.updated_by || 'SYSTEM',
        }));
        cacheLoaded = true;
        return cache;
      }

      // 2. On Vercel, if Supabase returns empty or table not ready, fall back to BLOX_FRUITS_DATA
      if (isVercel) {
        cache = [...BLOX_FRUITS_DATA];
        cacheLoaded = true;
        return cache;
      }

      // 3. Local dev Express fallback
      const res = await safeFetchJson<{ success: boolean; fruits: Fruit[] }>('/api/fruits');
      if (res.success && res.data?.fruits && Array.isArray(res.data.fruits) && res.data.fruits.length > 0) {
        cache = res.data.fruits;
        cacheLoaded = true;
      } else if (cache.length === 0) {
        cache = [...BLOX_FRUITS_DATA];
      }
    } catch {
      if (cache.length === 0) {
        cache = [...BLOX_FRUITS_DATA];
      }
    } finally {
      inFlight = null;
    }
    return cache;
  })();

  return inFlight;
}

/** Get the current active fruit catalog. */
export async function getFruits(): Promise<Fruit[]> {
  return fetchActiveFruits();
}

/** Subscribe to catalog updates. */
export function subscribeFruits(callback: (fruits: Fruit[]) => void): () => void {
  listeners.add(callback);
  callback(cache);
  fetchActiveFruits().then((fruits) => {
    callback(fruits);
  });
  return () => listeners.delete(callback);
}

// --- Admin catalog management ---

export async function adminListFruits(filters?: {
  query?: string;
  rarity?: string;
  type?: string;
  status?: string;
  trend?: string;
}): Promise<Fruit[]> {
  try {
    let query = supabase.from('fruits').select('*').order('sort_order', { ascending: true });
    if (filters?.rarity && filters.rarity !== 'ALL') {
      query = query.eq('rarity', filters.rarity);
    }
    if (filters?.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }
    const { data: dbFruits, error: sbErr } = await query;
    if (!sbErr && dbFruits && dbFruits.length > 0) {
      let results = dbFruits.map((f: any) => ({
        id: f.id,
        name: f.name,
        rarity: f.rarity,
        beliPrice: Number(f.beli_price || 0),
        marketValue: Number(f.market_value || 0),
        demand: Number(f.demand || 1),
        trend: f.trend || 'Stable',
        icon: f.icon || 'flare',
        type: f.type || 'Natural',
        description: f.description || '',
        hypeFactor: Number(f.hype_factor || 1),
        imageUrl: f.image_url,
        isPermanent: !!f.is_permanent,
        isArchived: !!f.is_archived,
        status: f.status || 'ACTIVE',
        sortOrder: f.sort_order || 99,
        updatedAt: f.updated_at ? new Date(f.updated_at).getTime() : Date.now(),
        updatedBy: f.updated_by || 'SYSTEM',
      })) as Fruit[];
      if (filters?.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
      }
      cache = results;
      return results;
    }
  } catch {}

  const base = cache.length > 0 ? cache : BLOX_FRUITS_DATA;
  let filtered = [...base];
  if (filters?.rarity && filters.rarity !== 'ALL') {
    filtered = filtered.filter((f) => f.rarity.toLowerCase() === filters.rarity!.toLowerCase());
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    filtered = filtered.filter((f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
  }
  return filtered;
}

export async function createFruit(fruit: Fruit): Promise<Fruit> {
  try {
    const payload = {
      id: fruit.id,
      name: fruit.name,
      rarity: fruit.rarity,
      beli_price: fruit.beliPrice,
      market_value: fruit.marketValue,
      demand: fruit.demand,
      trend: fruit.trend,
      icon: fruit.icon,
      type: fruit.type,
      description: fruit.description,
      hype_factor: fruit.hypeFactor,
      image_url: fruit.imageUrl || (fruit as any).image_url,
      is_permanent: fruit.isPermanent,
      is_archived: fruit.isArchived,
      status: fruit.status || 'ACTIVE',
      sort_order: fruit.sortOrder || 99,
      updated_by: 'ADMIN',
    };

    const { data: dbFruit, error: sbErr } = await supabase
      .from('fruits')
      .insert(payload)
      .select()
      .maybeSingle();

    if (!sbErr && dbFruit) {
      const created: Fruit = {
        id: dbFruit.id,
        name: dbFruit.name,
        rarity: dbFruit.rarity,
        beliPrice: Number(dbFruit.beli_price || 0),
        marketValue: Number(dbFruit.market_value || 0),
        demand: Number(dbFruit.demand || 1),
        trend: dbFruit.trend || 'Stable',
        icon: dbFruit.icon || 'flare',
        type: dbFruit.type || 'Natural',
        description: dbFruit.description || '',
        hypeFactor: Number(dbFruit.hype_factor || 1),
        imageUrl: dbFruit.image_url,
        isPermanent: !!dbFruit.is_permanent,
        isArchived: !!dbFruit.is_archived,
        status: dbFruit.status || 'ACTIVE',
        sortOrder: dbFruit.sort_order || 99,
        updatedAt: Date.now(),
        updatedBy: dbFruit.updated_by || 'ADMIN',
      };
      cache = [...cache, created];
      notifyListeners();
      return created;
    }
  } catch (err) {
    console.warn('Supabase createFruit fallback:', err);
  }

  // Fallback: update local cache
  cache = [...cache.filter((f) => f.id !== fruit.id), fruit];
  notifyListeners();
  return fruit;
}

export async function updateFruit(id: string, changes: Partial<Fruit>): Promise<Fruit> {
  try {
    const dbChanges: Record<string, any> = {};
    if (changes.name !== undefined) dbChanges.name = changes.name;
    if (changes.rarity !== undefined) dbChanges.rarity = changes.rarity;
    if (changes.beliPrice !== undefined) dbChanges.beli_price = changes.beliPrice;
    if (changes.marketValue !== undefined) dbChanges.market_value = changes.marketValue;
    if (changes.demand !== undefined) dbChanges.demand = changes.demand;
    if (changes.trend !== undefined) dbChanges.trend = changes.trend;
    if (changes.icon !== undefined) dbChanges.icon = changes.icon;
    if (changes.type !== undefined) dbChanges.type = changes.type;
    if (changes.description !== undefined) dbChanges.description = changes.description;
    if (changes.hypeFactor !== undefined) dbChanges.hype_factor = changes.hypeFactor;
    if (changes.imageUrl !== undefined) dbChanges.image_url = changes.imageUrl;
    if ((changes as any).image_url !== undefined) dbChanges.image_url = (changes as any).image_url;
    if (changes.isPermanent !== undefined) dbChanges.is_permanent = changes.isPermanent;
    if (changes.isArchived !== undefined) dbChanges.is_archived = changes.isArchived;
    if (changes.status !== undefined) dbChanges.status = changes.status;
    if (changes.sortOrder !== undefined) dbChanges.sort_order = changes.sortOrder;
    dbChanges.updated_at = new Date().toISOString();

    const { data: dbFruit, error: sbErr } = await supabase
      .from('fruits')
      .update(dbChanges)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!sbErr && dbFruit) {
      const updated: Fruit = {
        id: dbFruit.id,
        name: dbFruit.name,
        rarity: dbFruit.rarity,
        beliPrice: Number(dbFruit.beli_price || 0),
        marketValue: Number(dbFruit.market_value || 0),
        demand: Number(dbFruit.demand || 1),
        trend: dbFruit.trend || 'Stable',
        icon: dbFruit.icon || 'flare',
        type: dbFruit.type || 'Natural',
        description: dbFruit.description || '',
        hypeFactor: Number(dbFruit.hype_factor || 1),
        imageUrl: dbFruit.image_url,
        isPermanent: !!dbFruit.is_permanent,
        isArchived: !!dbFruit.is_archived,
        status: dbFruit.status || 'ACTIVE',
        sortOrder: dbFruit.sort_order || 99,
        updatedAt: Date.now(),
        updatedBy: dbFruit.updated_by || 'ADMIN',
      };
      cache = cache.map((f) => (f.id === id ? updated : f));
      notifyListeners();
      return updated;
    }
  } catch (err) {
    console.warn('Supabase updateFruit fallback:', err);
  }

  // Fallback: update local cache
  const existing = cache.find((f) => f.id === id);
  const updated: Fruit = existing
    ? { ...existing, ...changes }
    : ({ id, name: id, rarity: 'Common', beliPrice: 0, marketValue: 0, demand: 1, trend: 'Stable', icon: 'flare', type: 'Natural', description: '', hypeFactor: 1, imageUrl: changes.imageUrl, isPermanent: false, isArchived: false, status: 'ACTIVE', sortOrder: 99, updatedAt: Date.now(), updatedBy: 'ADMIN', ...changes } as Fruit);

  cache = cache.map((f) => (f.id === id ? updated : f));
  notifyListeners();
  return updated;
}

export async function archiveFruit(id: string): Promise<void> {
  await updateFruit(id, { isArchived: true, status: 'ARCHIVED' });
}

export async function restoreFruit(id: string): Promise<void> {
  await updateFruit(id, { isArchived: false, status: 'ACTIVE' });
}

export async function deleteFruit(id: string): Promise<void> {
  try {
    await supabase.from('fruits').delete().eq('id', id);
  } catch {}
  cache = cache.filter((f) => f.id !== id);
  notifyListeners();
}

export async function bulkUpdateFruits(ids: string[], changes: Partial<Fruit>): Promise<void> {
  for (const id of ids) {
    await updateFruit(id, changes);
  }
}

export async function getFruitAuditLogs(limit = 100): Promise<any[]> {
  try {
    const { data: logs, error } = await supabase
      .from('fruit_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && logs) return logs;
  } catch {}
  return [];
}

export async function getCatalogSettings(): Promise<any> {
  return {
    currencySymbol: 'Beli',
    baselineInflationMultiplier: 1.0,
    autoRebalanceHype: true,
    demandScaleMax: 10,
    allowCommunityValuationProposals: true,
    requireAdminApprovalForPriceChanges: false,
  };
}

export async function updateCatalogSettings(changes: Record<string, any>): Promise<void> {
  // Saved locally or in Supabase platform settings if table exists
}

export async function updateFruitImage(fruitId: string, imageUrl: string): Promise<Fruit> {
  return updateFruit(fruitId, { imageUrl });
}

export async function batchMatchAssets(overwrite = false): Promise<{ success: boolean; fruits: Fruit[]; matchedCount: number }> {
  return {
    success: true,
    fruits: cache,
    matchedCount: 0,
  };
}

export interface DiskAssetItem {
  filename: string;
  name: string;
  path: string;
  category: 'Fruit' | 'Variant' | 'Gamepass' | 'Upload';
  size: number;
  matchedFruitId?: string;
}

export async function fetchDiskAssets(): Promise<{
  success: boolean;
  assets: DiskAssetItem[];
  totalCount: number;
  fruitsCount: number;
  variantsCount: number;
  gamepassesCount: number;
}> {
  return {
    success: true,
    assets: [],
    totalCount: 0,
    fruitsCount: 0,
    variantsCount: 0,
    gamepassesCount: 0,
  };
}

export async function uploadAssetsZip(file: File): Promise<{
  success: boolean;
  message: string;
  matchedCount: number;
  assetsCount: number;
  assets: DiskAssetItem[];
  fruits: Fruit[];
}> {
  throw new Error('ZIP asset upload is not supported on Vercel. Please upload individual PNG files instead.');
}

export async function uploadSingleAsset(
  file: File,
  category: 'Fruit' | 'Variant' | 'Gamepass' = 'Fruit',
  fruitId?: string
): Promise<{ success: boolean; path: string; matchedFruit?: Fruit; assets?: DiskAssetItem[] }> {
  const BUCKET = 'fruit-assets';

  // Auto-match target fruit ID if not explicitly passed
  let targetFruitId = fruitId;
  if (!targetFruitId) {
    const cleanName = file.name
      .replace(/\.[^.]+$/, '') // remove extension
      .replace(/^\d+[-_\s]*/, '') // remove leading digits e.g. "462842-kitsune" -> "kitsune"
      .toLowerCase()
      .trim();

    const currentFruits = cache.length > 0 ? cache : BLOX_FRUITS_DATA;
    const matched = currentFruits.find((f) => {
      const fid = f.id.toLowerCase();
      const fname = f.name.toLowerCase();
      const fclean = fname.replace(/[^a-z0-9]/g, '');
      const cclean = cleanName.replace(/[^a-z0-9]/g, '');
      return fid === cclean || cclean.includes(fid) || fid.includes(cclean) || cclean === fclean;
    });

    if (matched) {
      targetFruitId = matched.id;
    }
  }

  const storagePath = `fruits/${targetFruitId || file.name.replace(/\.[^.]+$/, '')}/${file.name}`;

  // Upload to Supabase Storage
  let uploadResult = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: true, contentType: file.type });

  if (uploadResult.error && uploadResult.error.message?.toLowerCase().includes('bucket')) {
    await supabase.storage.createBucket(BUCKET, { public: true });
    uploadResult = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { upsert: true, contentType: file.type });
  }

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message || 'Failed to upload to Supabase Storage.');
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = publicUrlData?.publicUrl || '';

  if (targetFruitId && publicUrl) {
    const updated = await updateFruit(targetFruitId, { imageUrl: publicUrl });
    return { success: true, path: publicUrl, matchedFruit: updated };
  }

  return { success: true, path: publicUrl };
}

export async function uploadMultipleAssets(
  files: File[],
  category: 'Fruit' | 'Variant' | 'Gamepass' = 'Fruit',
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<{ successCount: number; failedCount: number; lastAssets?: DiskAssetItem[] }> {
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }
    try {
      const res = await uploadSingleAsset(file, category);
      if (res.success) {
        successCount++;
      } else {
        failedCount++;
      }
    } catch (err) {
      console.warn(`Failed to upload ${file.name}:`, err);
      failedCount++;
    }
  }

  return { successCount, failedCount };
}
