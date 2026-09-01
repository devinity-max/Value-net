import React, { useState, useEffect, useRef } from 'react';
import { AuthUser, ActiveTab, Fruit } from '../types';
import {
  adminListFruits,
  updateFruit,
  batchMatchAssets,
  fetchDiskAssets,
  uploadAssetsZip,
  uploadSingleAsset,
  DiskAssetItem,
} from '../utils/fruitsApi';
import { formatMoney } from '../utils/calc';
import { isOwner, isAdmin } from '../utils/permissions';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';
import { FruitImage } from './FruitImage';

interface FruitCatalogAdminViewProps {
  currentUser: AuthUser | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onShowAuthModal: () => void;
}

export const FruitCatalogAdminView: React.FC<FruitCatalogAdminViewProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const [fruitsList, setFruitsList] = useState<Fruit[]>([]);
  const [editingFruit, setEditingFruit] = useState<Fruit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matchingAssets, setMatchingAssets] = useState(false);

  // Real disk assets state
  const [diskAssets, setDiskAssets] = useState<DiskAssetItem[]>([]);
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<'ALL' | 'Fruit' | 'Variant' | 'Gamepass'>('ALL');
  const [uploadingZip, setUploadingZip] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<'Fruit' | 'Variant' | 'Gamepass'>('Fruit');

  const zipInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAccess = isOwner(currentUser) || isAdmin(currentUser);

  const loadCatalog = async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const [fruits, assetsRes] = await Promise.all([
        adminListFruits(),
        fetchDiskAssets().catch(() => ({ success: false, assets: [] })),
      ]);
      setFruitsList(fruits);
      if (assetsRes.assets) {
        setDiskAssets(assetsRes.assets);
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, [canAccess]);

  if (!canAccess) {
    return (
      <div className="pt-28 sm:pt-32 pb-20 px-4 max-w-xl mx-auto text-center font-sans">
        <div className="p-8 bg-[#12162d] border border-rose-500/50 rounded-3xl">
          <span className="material-symbols-outlined text-4xl text-rose-400 mb-3">lock</span>
          <h2 className="text-xl font-black font-game text-white mb-2">Restricted Access</h2>
          <p className="text-xs text-slate-400 mb-4">
            Catalog administration requires elevated platform permissions.
          </p>
          <button
            onClick={() => onNavigateTab('calculator')}
            className="px-6 py-2.5 bg-purple-600 text-white font-game text-xs font-bold uppercase rounded-xl"
          >
            Return to Calculator
          </button>
        </div>
      </div>
    );
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFruit) return;

    setSaving(true);
    setErrorNotice(null);
    try {
      const updated = await updateFruit(editingFruit.id, {
        marketValue: editingFruit.marketValue,
        demand: editingFruit.demand,
        trend: editingFruit.trend,
        beliPrice: editingFruit.beliPrice,
        imageUrl: editingFruit.imageUrl || editingFruit.image_url || undefined,
      });
      setFruitsList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      playTradeSuccessSound();
      setSuccessNotice(`Updated valuation & artwork parameters for ${updated.name}`);
      setEditingFruit(null);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchSyncAssets = async () => {
    playClickSound();
    setMatchingAssets(true);
    setErrorNotice(null);
    try {
      const res = await batchMatchAssets(true);
      if (res.success) {
        playTradeSuccessSound();
        setSuccessNotice(`Successfully matched ${res.matchedCount} fruit artwork assets!`);
        if (res.fruits && res.fruits.length > 0) {
          setFruitsList(res.fruits);
        } else {
          loadCatalog();
        }
        setTimeout(() => setSuccessNotice(null), 4000);
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to batch sync fruit assets.');
    } finally {
      setMatchingAssets(false);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingZip(true);
    setErrorNotice(null);
    playClickSound();

    try {
      const res = await uploadAssetsZip(file);
      playTradeSuccessSound();
      setSuccessNotice(`ZIP archive imported! Extracted ${res.assetsCount || 0} PNGs, matched ${res.matchedCount} fruits.`);
      if (res.fruits) {
        setFruitsList(res.fruits);
      }
      if (res.assets) {
        setDiskAssets(res.assets);
      }
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to upload and extract ZIP file.');
    } finally {
      setUploadingZip(false);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setErrorNotice(null);
    playClickSound();

    try {
      const res = await uploadSingleAsset(file, selectedUploadCategory);
      playTradeSuccessSound();
      setSuccessNotice(`Asset "${file.name}" uploaded successfully!`);
      // Refresh assets
      const assetsRes = await fetchDiskAssets();
      if (assetsRes.assets) {
        setDiskAssets(assetsRes.assets);
      }
      // If editing a fruit, assign it directly
      if (editingFruit && res.path) {
        setEditingFruit({ ...editingFruit, imageUrl: res.path, image_url: res.path });
      }
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to upload asset.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSelectAssetForFruit = (assetPath: string) => {
    if (!editingFruit) return;
    playClickSound();
    setEditingFruit({
      ...editingFruit,
      imageUrl: assetPath,
      image_url: assetPath,
    });
  };

  const handleClearFruitImage = () => {
    if (!editingFruit) return;
    playClickSound();
    setEditingFruit({
      ...editingFruit,
      imageUrl: '',
      image_url: '',
    });
  };

  const filtered = fruitsList.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.rarity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAssets = diskAssets.filter((a) => {
    if (assetCategoryFilter !== 'ALL' && a.category !== assetCategoryFilter) return false;
    if (assetSearchTerm) {
      const q = assetSearchTerm.toLowerCase();
      return a.filename.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1300px] mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-game font-bold uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            OFFICIAL FRUIT ARTWORK // ASSET PIPELINE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-game text-white tracking-wide uppercase">
            Fruit Catalog & Artwork Management
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
            Integrate authentic Blox Fruits PNG artwork. Strict asset integrity: No AI generation, no synthetic illustrations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* ZIP Archive Upload */}
          <input
            type="file"
            ref={zipInputRef}
            onChange={handleZipUpload}
            accept=".zip,application/zip"
            className="hidden"
          />
          <button
            onClick={() => zipInputRef.current?.click()}
            disabled={uploadingZip}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-game font-bold text-xs uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Upload a ZIP archive containing Blox Fruits PNG assets"
          >
            <span className={`material-symbols-outlined text-sm ${uploadingZip ? 'animate-spin' : ''}`}>
              {uploadingZip ? 'sync' : 'folder_zip'}
            </span>
            <span>{uploadingZip ? 'Extracting ZIP…' : 'Import ZIP Archive'}</span>
          </button>

          {/* Sync All Button */}
          <button
            onClick={handleBatchSyncAssets}
            disabled={matchingAssets}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Auto-reconcile and link PNG assets with catalog entries"
          >
            <span className={`material-symbols-outlined text-sm ${matchingAssets ? 'animate-spin' : ''}`}>
              {matchingAssets ? 'sync' : 'auto_fix_high'}
            </span>
            <span>{matchingAssets ? 'Syncing…' : 'Sync All Artwork'}</span>
          </button>

          <button
            onClick={() => onNavigateTab('owner-control')}
            className="px-4 py-2 bg-[#181d38] border border-slate-700 text-slate-300 font-game font-bold text-xs uppercase rounded-xl hover:text-white"
          >
            ← Back to Admin
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorNotice && (
        <div className="mb-6 p-4 bg-rose-950/80 border border-rose-500 rounded-2xl text-rose-300 text-xs font-game font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {errorNotice}
        </div>
      )}

      {successNotice && (
        <div className="mb-6 p-4 bg-emerald-950/80 border border-emerald-500 rounded-2xl text-emerald-300 text-xs font-game font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successNotice}
        </div>
      )}

      {/* Asset Repository Summary Bar */}
      <div className="mb-8 p-4 bg-[#0e1224] border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400 text-lg">folder</span>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Available Assets</span>
              <span className="text-sm font-bold font-game text-white">{diskAssets.length} Files</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-lg">nutrition</span>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Catalog Items</span>
              <span className="text-sm font-bold font-game text-white">{fruitsList.length} Items</span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-lg">verified</span>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Artwork Status</span>
              <span className="text-sm font-bold font-game text-amber-300">Real PNG Assets Only</span>
            </div>
          </div>
        </div>

        {/* Upload Single Asset Button */}
        <div className="flex items-center gap-2">
          <select
            value={selectedUploadCategory}
            onChange={(e) => setSelectedUploadCategory(e.target.value as any)}
            className="px-2.5 py-1.5 bg-[#141830] border border-slate-700 rounded-xl text-xs text-slate-300 font-mono outline-none"
          >
            <option value="Fruit">Fruit Asset</option>
            <option value="Variant">Skin / Variant</option>
            <option value="Gamepass">Gamepass Asset</option>
          </select>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleSingleFileUpload}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="px-3 py-1.5 bg-[#1e2448] hover:bg-purple-600 text-white font-game text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">upload</span>
            <span>{uploadingFile ? 'Uploading…' : 'Upload PNG'}</span>
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {editingFruit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0e1224] border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <FruitImage
                  fruit={editingFruit}
                  size="xl"
                  showGlow={editingFruit.rarity === 'Mythical' || editingFruit.rarity === 'Legendary'}
                  className="w-16 h-16 rounded-2xl shrink-0"
                />
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block">
                    {editingFruit.rarity} // {editingFruit.type}
                  </span>
                  <h3 className="text-xl font-black font-game text-white">
                    {editingFruit.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono block mt-0.5">
                    ID: {editingFruit.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditingFruit(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Asset Assignment Section */}
              <div className="p-4 bg-[#141830] border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-400 uppercase font-game text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">image</span>
                    Assigned Real Artwork PNG
                  </label>
                  {editingFruit.imageUrl && (
                    <button
                      type="button"
                      onClick={handleClearFruitImage}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-mono uppercase flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                      Remove Image
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={editingFruit.imageUrl || editingFruit.image_url || ''}
                  onChange={(e) =>
                    setEditingFruit({
                      ...editingFruit,
                      imageUrl: e.target.value,
                      image_url: e.target.value,
                    })
                  }
                  placeholder="e.g. /assets/fruits/kitsune.png"
                  className="w-full px-3 py-2 bg-[#0e1224] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400 font-mono text-xs"
                />

                {/* Available Assets Quick Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-300 uppercase font-game">
                      Available Imported Assets (Click to Assign)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {diskAssets.length} total files
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-[#0e1224] p-2 rounded-xl border border-slate-800">
                    {diskAssets.length === 0 ? (
                      <div className="text-center py-3 text-slate-500 font-mono text-[11px]">
                        No assets in folder. Upload a ZIP archive or PNG file above.
                      </div>
                    ) : (
                      diskAssets.map((asset) => {
                        const isSelected = editingFruit.imageUrl === asset.path;
                        return (
                          <div
                            key={asset.path}
                            onClick={() => handleSelectAssetForFruit(asset.path)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 border border-amber-500/60 text-amber-200'
                                : 'bg-[#181d38]/50 hover:bg-[#181d38] border border-transparent text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <img
                                src={asset.path}
                                alt={asset.name}
                                className="w-6 h-6 object-contain rounded bg-black/40"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                              <span className="font-mono text-xs truncate">{asset.filename}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                {asset.category}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined text-amber-400 text-sm shrink-0">
                                check_circle
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Valuation Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Market Value ($)</label>
                  <input
                    type="number"
                    value={editingFruit.marketValue}
                    onChange={(e) =>
                      setEditingFruit({ ...editingFruit, marketValue: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Demand (1 - 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingFruit.demand || 5}
                    onChange={(e) =>
                      setEditingFruit({ ...editingFruit, demand: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Trend</label>
                  <select
                    value={editingFruit.trend || 'Stable'}
                    onChange={(e) =>
                      setEditingFruit({ ...editingFruit, trend: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400"
                  >
                    <option value="Rising">Rising</option>
                    <option value="Stable">Stable</option>
                    <option value="Falling">Falling</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase font-mono">Beli In-Game Price ($)</label>
                  <input
                    type="number"
                    value={editingFruit.beliPrice || 0}
                    onChange={(e) =>
                      setEditingFruit({ ...editingFruit, beliPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-game font-bold uppercase rounded-xl shadow-lg disabled:opacity-50 active:scale-98 transition-all"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFruit(null)}
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 font-game font-bold uppercase rounded-xl hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Catalog items search and list */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search catalog fruits by name, type, or rarity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-3 bg-[#141830] border border-slate-700 rounded-2xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-mono text-xs">
            Loading fruit catalog & assets…
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((fruit) => {
              const hasExplicitAsset = !!(fruit.imageUrl || fruit.image_url);
              return (
                <div
                  key={fruit.id}
                  className="bg-[#0e1224] border border-slate-800 hover:border-purple-500/40 p-4 rounded-2xl flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <FruitImage
                      fruit={fruit}
                      size="md"
                      showGlow={fruit.rarity === 'Mythical'}
                      className="w-12 h-12 rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block">
                          {fruit.rarity}
                        </span>
                        {hasExplicitAsset && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            PNG
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white font-game truncate">{fruit.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                        <span className="text-amber-400 font-bold">${formatMoney(fruit.marketValue)}</span>
                        <span className="text-slate-400 text-[10px]">Dem: {fruit.demand}/10</span>
                        <span
                          className={`text-[10px] ${
                            fruit.trend === 'Rising'
                              ? 'text-emerald-400'
                              : fruit.trend === 'Falling'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {fruit.trend}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      playClickSound();
                      setEditingFruit({ ...fruit });
                    }}
                    className="p-2.5 bg-[#181d38] hover:bg-amber-500 hover:text-black text-amber-300 rounded-xl transition-all shrink-0 flex items-center gap-1"
                    title="Edit valuation & assign artwork"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
