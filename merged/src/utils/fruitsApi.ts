import { Fruit } from '../types';
import { supabase } from '../lib/supabaseClient';

// --- row <-> Fruit mapping ---
function rowToFruit(row: any): Fruit {
  return {
    id: row.id,
    name: row.name,
    rarity: row.rarity,
    beliPrice: row.beli_price,
    marketValue: row.market_value,
    demand: row.demand,
    trend: row.trend,
    icon: row.icon,
    type: row.type,
    description: row.description || '',
    hypeFactor: row.hype_factor,
    isPermanent: row.is_permanent,
    isArchived: row.is_archived,
    archivedAt: row.archived_at ? new Date(row.archived_at).getTime() : undefined,
    tradingNotes: row.trading_notes ?? undefined,
    status: row.status,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    updatedBy: row.updated_by ?? undefined,
  };
}

function fruitToRow(f: Partial<Fruit>): Record<string, any> {
  const row: Record<string, any> = {};
  if (f.id !== undefined) row.id = f.id;
  if (f.name !== undefined) row.name = f.name;
  if (f.rarity !== undefined) row.rarity = f.rarity;
  if (f.beliPrice !== undefined) row.beli_price = f.beliPrice;
  if (f.marketValue !== undefined) row.market_value = f.marketValue;
  if (f.demand !== undefined) row.demand = f.demand;
  if (f.trend !== undefined) row.trend = f.trend;
  if (f.icon !== undefined) row.icon = f.icon;
  if (f.type !== undefined) row.type = f.type;
  if (f.description !== undefined) row.description = f.description;
  if (f.hypeFactor !== undefined) row.hype_factor = f.hypeFactor;
  if (f.isPermanent !== undefined) row.is_permanent = f.isPermanent;
  if (f.tradingNotes !== undefined) row.trading_notes = f.tradingNotes;
  if (f.status !== undefined) row.status = f.status;
  if (f.sortOrder !== undefined) row.sort_order = f.sortOrder;
  return row;
}

// --- Public catalog: fetch + shared in-memory cache with realtime sync ---
// Multiple components call getFruits()/subscribeFruits() independently (mirrors the old
// static-import pattern); this cache means only one network fetch happens regardless of
// how many components mount, and all of them stay in sync via one Realtime channel.
let cache: Fruit[] = [];
let cacheLoaded = false;
let inFlight: Promise<Fruit[]> | null = null;
const listeners = new Set<(fruits: Fruit[]) => void>();
let channelInitialized = false;

function notifyListeners() {
  listeners.forEach((l) => l(cache));
}

function ensureRealtimeChannel() {
  if (channelInitialized) return;
  channelInitialized = true;
  supabase
    .channel('public:fruits')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fruits' }, () => {
      // Any change (including admin edits) re-fetches; catalog is small (~50 rows) so this is cheap.
      inFlight = null;
      cacheLoaded = false;
      fetchActiveFruits().then(notifyListeners);
    })
    .subscribe();
}

async function fetchActiveFruits(): Promise<Fruit[]> {
  if (cacheLoaded) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { data, error } = await supabase
      .from('fruits')
      .select('*')
      .eq('is_archived', false)
      .neq('status', 'ARCHIVED')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    cache = (data || []).map(rowToFruit);
    cacheLoaded = true;
    inFlight = null;
    return cache;
  })();

  return inFlight;
}

/** Get the current active fruit catalog (cached after first call). */
export async function getFruits(): Promise<Fruit[]> {
  ensureRealtimeChannel();
  return fetchActiveFruits();
}

/** Subscribe to catalog updates. Calls back immediately with current cache (fetching if needed),
 * then again whenever the catalog changes. Returns an unsubscribe function. */
export function subscribeFruits(callback: (fruits: Fruit[]) => void): () => void {
  ensureRealtimeChannel();
  listeners.add(callback);
  fetchActiveFruits().then(callback);
  return () => listeners.delete(callback);
}

// --- Admin catalog management (RLS restricts writes to staff server-side) ---

export async function adminListFruits(filters?: {
  query?: string;
  rarity?: string;
  type?: string;
  status?: string;
  trend?: string;
}): Promise<Fruit[]> {
  let q = supabase.from('fruits').select('*').order('sort_order', { ascending: true });

  if (filters?.status && filters.status !== 'ALL') {
    if (filters.status === 'ACTIVE') q = q.eq('is_archived', false).neq('status', 'ARCHIVED');
    else if (filters.status === 'ARCHIVED') q = q.or('is_archived.eq.true,status.eq.ARCHIVED');
    else q = q.eq('status', filters.status);
  }
  if (filters?.rarity && filters.rarity !== 'ALL') q = q.eq('rarity', filters.rarity);
  if (filters?.type && filters.type !== 'ALL') q = q.eq('type', filters.type);
  if (filters?.trend && filters.trend !== 'ALL') q = q.eq('trend', filters.trend);
  if (filters?.query && filters.query.trim()) {
    const term = filters.query.trim();
    q = q.or(`name.ilike.%${term}%,id.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(rowToFruit);
}

export async function createFruit(fruit: Fruit): Promise<Fruit> {
  const { data, error } = await supabase.from('fruits').insert(fruitToRow(fruit)).select().single();
  if (error) throw error;
  return rowToFruit(data);
}

export async function updateFruit(id: string, changes: Partial<Fruit>): Promise<Fruit> {
  const { data, error } = await supabase.from('fruits').update(fruitToRow(changes)).eq('id', id).select().single();
  if (error) throw error;
  return rowToFruit(data);
}

export async function archiveFruit(id: string): Promise<void> {
  const { error } = await supabase.from('fruits').update({ is_archived: true, status: 'ARCHIVED', archived_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function restoreFruit(id: string): Promise<void> {
  const { error } = await supabase.from('fruits').update({ is_archived: false, status: 'ACTIVE', archived_at: null }).eq('id', id);
  if (error) throw error;
}

export async function deleteFruit(id: string): Promise<void> {
  const { error } = await supabase.from('fruits').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkUpdateFruits(ids: string[], changes: Partial<Fruit>): Promise<void> {
  const { error } = await supabase.from('fruits').update(fruitToRow(changes)).in('id', ids);
  if (error) throw error;
}

export async function getFruitAuditLogs(limit = 100): Promise<any[]> {
  const { data, error } = await supabase
    .from('fruit_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getCatalogSettings(): Promise<any> {
  const { data, error } = await supabase.from('catalog_settings').select('*').single();
  if (error) throw error;
  return data;
}

export async function updateCatalogSettings(changes: Record<string, any>): Promise<void> {
  const { error } = await supabase.from('catalog_settings').update(changes).eq('id', true);
  if (error) throw error;
}
