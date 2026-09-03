import { Fruit } from '../types';
import { BLOX_FRUITS_DATA } from '../data/fruits';
import { safeFetchJson } from './apiHelper';
import { getAuthToken } from './auth';
import { supabase } from '../lib/supabaseClient';

let cache: Fruit[] = [...BLOX_FRUITS_DATA];
let cacheLoaded = false;
let inFlight: Promise<Fruit[]> | null = null;
const listeners = new Set<(fruits: Fruit[]) => void>();

function notifyListeners() {
  listeners.forEach((l) => l(cache));
}

async function fetchActiveFruits(): Promise<Fruit[]> {
  if (cacheLoaded && cache.length > 0) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
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
      }

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

/** Get the current active fruit catalog (cached after first call). */
export async function getFruits(): Promise<Fruit[]> {
  return fetchActiveFruits();
}

/** Subscribe to catalog updates. Calls back immediately with current cache, then periodically or when updated. */
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
  // Supabase-direct path (no Express server needed)
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    try {
      let query = supabase.from('fruits').select('*').order('sort_order', { ascending: true });
      if (filters?.rarity && filters.rarity !== 'ALL') {
        query = query.eq('rarity', filters.rarity);
      }
      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      const { data: dbFruits, error: sbErr } = await query;
      if (!sbErr && dbFruits) {
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
  }

  // Fallback: try Express API, then static data
  const token = getAuthToken();
  const queryParams = new URLSearchParams();
  if (filters?.query) queryParams.set('query', filters.query);
  if (filters?.rarity) queryParams.set('rarity', filters.rarity);
  if (filters?.type) queryParams.set('type', filters.type);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.trend) queryParams.set('trend', filters.trend);

  const res = await safeFetchJson<{ success: boolean; fruits: Fruit[]; error?: string }>(
    `/api/admin/fruits?${queryParams.toString()}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );

  if (res.success && res.data?.fruits) {
    return res.data.fruits;
  }

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
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; fruit: Fruit; error?: string }>('/api/admin/fruits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(fruit),
  });

  if (!res.success || !res.data?.success || !res.data.fruit) {
    throw new Error(res.data?.error || res.error || 'Failed to create fruit.');
  }

  cache = [...cache, res.data.fruit];
  notifyListeners();
  return res.data.fruit;
}

export async function updateFruit(id: string, changes: Partial<Fruit>): Promise<Fruit> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; fruit: Fruit; error?: string }>(`/api/admin/fruits/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(changes),
  });

  if (!res.success || !res.data?.success || !res.data.fruit) {
    throw new Error(res.data?.error || res.error || 'Failed to update fruit.');
  }

  cache = cache.map((f) => (f.id === id ? res.data!.fruit : f));
  notifyListeners();
  return res.data.fruit;
}

export async function archiveFruit(id: string): Promise<void> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; error?: string }>(`/api/admin/fruits/${id}/archive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.success || !res.data?.success) {
    throw new Error(res.data?.error || res.error || 'Failed to archive fruit.');
  }

  cache = cache.filter((f) => f.id !== id);
  notifyListeners();
}

export async function restoreFruit(id: string): Promise<void> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; fruit?: Fruit; error?: string }>(`/api/admin/fruits/${id}/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.success || !res.data?.success) {
    throw new Error(res.data?.error || res.error || 'Failed to restore fruit.');
  }

  if (res.data.fruit) {
    cache = [...cache.filter((f) => f.id !== id), res.data.fruit];
    notifyListeners();
  }
}

export async function deleteFruit(id: string): Promise<void> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; error?: string }>(`/api/admin/fruits/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.success || !res.data?.success) {
    throw new Error(res.data?.error || res.error || 'Failed to delete fruit.');
  }

  cache = cache.filter((f) => f.id !== id);
  notifyListeners();
}

export async function bulkUpdateFruits(ids: string[], changes: Partial<Fruit>): Promise<void> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; error?: string }>('/api/admin/fruits/bulk-update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ids, changes }),
  });

  if (!res.success || !res.data?.success) {
    throw new Error(res.data?.error || res.error || 'Failed to bulk update fruits.');
  }

  cache = cache.map((f) => (ids.includes(f.id) ? { ...f, ...changes } : f));
  notifyListeners();
}

export async function getFruitAuditLogs(limit = 100): Promise<any[]> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; logs: any[]; error?: string }>(
    `/api/admin/fruits/audit-logs?limit=${limit}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  return res.data?.logs || [];
}

export async function getCatalogSettings(): Promise<any> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; settings: any; branding: any; error?: string }>(
    '/api/admin/fruits/settings',
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  return res.data?.settings || {
    currencySymbol: 'Beli',
    baselineInflationMultiplier: 1.0,
    autoRebalanceHype: true,
    demandScaleMax: 10,
    allowCommunityValuationProposals: true,
    requireAdminApprovalForPriceChanges: false,
  };
}

export async function updateCatalogSettings(changes: Record<string, any>): Promise<void> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; error?: string }>('/api/admin/fruits/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ settings: changes }),
  });

  if (!res.success || !res.data?.success) {
    throw new Error(res.data?.error || res.error || 'Failed to update catalog settings.');
  }
}

export async function updateFruitImage(fruitId: string, imageUrl: string): Promise<Fruit> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; fruit: Fruit; error?: string }>(
    `/api/admin/fruits/${fruitId}/image`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ imageUrl }),
    }
  );

  if (!res.success || !res.data?.success || !res.data.fruit) {
    throw new Error(res.data?.error || res.error || 'Failed to update fruit artwork.');
  }

  cache = cache.map((f) => (f.id === fruitId ? res.data!.fruit : f));
  notifyListeners();
  return res.data.fruit;
}

export async function batchMatchAssets(overwrite = false): Promise<{ success: boolean; fruits: Fruit[]; matchedCount: number }> {
  const token = getAuthToken();
  const res = await safeFetchJson<{ success: boolean; fruits: Fruit[]; matchedCount: number; error?: string }>(
    '/api/admin/fruits/batch-match-assets',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ overwrite }),
    }
  );

  if (!res.success || !res.data?.success || !res.data.fruits) {
    throw new Error(res.data?.error || res.error || 'Failed to batch match assets.');
  }

  cache = res.data.fruits;
  notifyListeners();
  return {
    success: true,
    fruits: res.data.fruits,
    matchedCount: res.data.matchedCount || 0,
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
  // On Vercel/production, there is no local filesystem. Return empty gracefully.
  // Asset management (artwork) is handled via Supabase Storage instead.
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    return {
      success: true,
      assets: [],
      totalCount: 0,
      fruitsCount: 0,
      variantsCount: 0,
      gamepassesCount: 0,
    };
  }

  const token = getAuthToken();
  const res = await safeFetchJson<{
    success: boolean;
    assets: DiskAssetItem[];
    totalCount: number;
    fruitsCount: number;
    variantsCount: number;
    gamepassesCount: number;
    error?: string;
  }>('/api/admin/assets', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.success || !res.data?.success) {
    return {
      success: false,
      assets: [],
      totalCount: 0,
      fruitsCount: 0,
      variantsCount: 0,
      gamepassesCount: 0,
    };
  }

  return res.data;
}

export async function uploadAssetsZip(file: File): Promise<{
  success: boolean;
  message: string;
  matchedCount: number;
  assetsCount: number;
  assets: DiskAssetItem[];
  fruits: Fruit[];
}> {
  // On Vercel, upload via Supabase Storage instead of Express server filesystem
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    throw new Error('ZIP asset upload is not supported on Vercel. Please upload individual PNG files instead.');
  }

  const token = getAuthToken();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await safeFetchJson<any>('/api/admin/assets/upload-zip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            zipBase64: base64,
            filename: file.name,
          }),
        });

        if (!res.success || !res.data?.success) {
          throw new Error(res.data?.error || res.error || 'Failed to extract and process zip file.');
        }

        if (res.data.fruits) {
          cache = res.data.fruits;
          notifyListeners();
        }

        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read zip file.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadSingleAsset(
  file: File,
  category: 'Fruit' | 'Variant' | 'Gamepass' = 'Fruit',
  fruitId?: string
): Promise<{ success: boolean; path: string; matchedFruit?: Fruit; assets?: DiskAssetItem[] }> {
  // On Vercel: upload directly to Supabase Storage
  if (import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
    const BUCKET = 'fruit-assets';
    const storagePath = `fruits/${fruitId || file.name.replace(/\.[^.]+$/, '')}/${file.name}`;

    // Try upload — if bucket doesn't exist, create it first then retry
    let uploadErr: any = null;
    let uploadResult = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, { upsert: true, contentType: file.type });

    if (uploadResult.error && uploadResult.error.message?.toLowerCase().includes('bucket')) {
      // Create the bucket as public, then retry
      await supabase.storage.createBucket(BUCKET, { public: true });
      uploadResult = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: true, contentType: file.type });
    }

    uploadErr = uploadResult.error;
    if (uploadErr) {
      throw new Error(uploadErr.message || 'Failed to upload to Supabase Storage.');
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl || '';

    // If a fruitId is specified, update the fruit's image_url in the database
    if (fruitId && publicUrl) {
      const { data: updatedFruit } = await supabase
        .from('fruits')
        .update({ image_url: publicUrl })
        .eq('id', fruitId)
        .select()
        .maybeSingle();

      if (updatedFruit) {
        const mapped: Fruit = {
          id: updatedFruit.id,
          name: updatedFruit.name,
          rarity: updatedFruit.rarity,
          beliPrice: Number(updatedFruit.beli_price || 0),
          marketValue: Number(updatedFruit.market_value || 0),
          demand: Number(updatedFruit.demand || 1),
          trend: updatedFruit.trend || 'Stable',
          icon: updatedFruit.icon || 'flare',
          type: updatedFruit.type || 'Natural',
          description: updatedFruit.description || '',
          hypeFactor: Number(updatedFruit.hype_factor || 1),
          imageUrl: publicUrl,
          isPermanent: !!updatedFruit.is_permanent,
          isArchived: !!updatedFruit.is_archived,
          status: updatedFruit.status || 'ACTIVE',
          sortOrder: updatedFruit.sort_order || 99,
          updatedAt: Date.now(),
          updatedBy: 'ADMIN',
        };
        cache = cache.map((f) => (f.id === fruitId ? mapped : f));
        notifyListeners();
        return { success: true, path: publicUrl, matchedFruit: mapped };
      }
    }

    return { success: true, path: publicUrl };
  }

  // Local dev fallback: use Express server
  const token = getAuthToken();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await safeFetchJson<any>('/api/admin/assets/upload-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            fileBase64: base64,
            filename: file.name,
            category,
            fruitId,
          }),
        });

        if (!res.success || !res.data?.success) {
          throw new Error(res.data?.error || res.error || 'Failed to upload asset file.');
        }

        if (res.data.matchedFruit) {
          cache = cache.map((f) => (f.id === res.data.matchedFruit.id ? res.data.matchedFruit : f));
          notifyListeners();
        }

        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadMultipleAssets(
  files: File[],
  category: 'Fruit' | 'Variant' | 'Gamepass' = 'Fruit',
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<{ successCount: number; failedCount: number; lastAssets?: DiskAssetItem[] }> {
  let successCount = 0;
  let failedCount = 0;
  let lastAssets: DiskAssetItem[] | undefined;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i + 1, files.length, file.name);
    }
    try {
      const res = await uploadSingleAsset(file, category);
      if (res.success) {
        successCount++;
        if (res.assets) lastAssets = res.assets;
      } else {
        failedCount++;
      }
    } catch (err) {
      console.warn(`Failed to upload ${file.name}:`, err);
      failedCount++;
    }
  }

  return { successCount, failedCount, lastAssets };
}
