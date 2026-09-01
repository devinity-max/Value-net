import { Fruit } from '../types';
import { BLOX_FRUITS_DATA } from '../data/fruits';
import { safeFetchJson } from './apiHelper';
import { getAuthToken } from './auth';

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
  const token = getAuthToken();
  const queryParams = new URLSearchParams();
  if (filters?.query) queryParams.set('query', filters.query);
  if (filters?.rarity) queryParams.set('rarity', filters.rarity);
  if (filters?.type) queryParams.set('type', filters.type);
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.trend) queryParams.set('trend', filters.trend);

  const res = await safeFetchJson<{ success: boolean; fruits: Fruit[]; error?: string }>(
    `/api/admin/fruits?${queryParams.toString()}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (res.success && res.data?.fruits) {
    return res.data.fruits;
  }

  // Fallback to public catalog or data
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
  category: 'Fruit' | 'Variant' | 'Gamepass' = 'Fruit'
): Promise<{ success: boolean; path: string; matchedFruit?: Fruit }> {
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


