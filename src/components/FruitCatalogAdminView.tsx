import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthUser, ActiveTab, Fruit } from '../types';
import {
  adminListFruits,
  createFruit,
  updateFruit,
  deleteFruit,
  batchMatchAssets,
  fetchDiskAssets,
  uploadAssetsZip,
  uploadSingleAsset,
  uploadMultipleAssets,
  DiskAssetItem,
} from '../utils/fruitsApi';
import { formatMoney } from '../utils/calc';
import { isOwner, isAdmin } from '../utils/permissions';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';
import { FruitImage } from './FruitImage';

interface FruitCatalogAdminViewProps {
  currentUser: AuthUser | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onShowAuthModal?: () => void;
}

type CatalogCategoryFilter = 'ALL' | 'MYTHICAL' | 'LEGENDARY' | 'RARE' | 'UNCOMMON' | 'COMMON' | 'VARIANTS' | 'GAMEPASSES';

export const FruitCatalogAdminView: React.FC<FruitCatalogAdminViewProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const [fruitsList, setFruitsList] = useState<Fruit[]>([]);
  const [editingFruit, setEditingFruit] = useState<Fruit | null>(null);
  const [deletingFruit, setDeletingFruit] = useState<Fruit | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<CatalogCategoryFilter>('ALL');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [matchingAssets, setMatchingAssets] = useState(false);

  // New item form state
  const [newItemCategory, setNewItemCategory] = useState<'Fruit' | 'Variant' | 'Gamepass'>('Fruit');
  const [newItemName, setNewItemName] = useState('');
  const [newItemRarity, setNewItemRarity] = useState<string>('Mythical');
  const [newItemType, setNewItemType] = useState<string>('Natural');
  const [newItemMarketValue, setNewItemMarketValue] = useState<number>(1000000);
  const [newItemBeliPrice, setNewItemBeliPrice] = useState<number>(1000000);
  const [newItemDemand, setNewItemDemand] = useState<number>(7);
  const [newItemTrend, setNewItemTrend] = useState<'Rising' | 'Stable' | 'Falling'>('Stable');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [newItemIsPermanent, setNewItemIsPermanent] = useState(false);
  const [newItemTradingNotes, setNewItemTradingNotes] = useState('');
  const [addModalError, setAddModalError] = useState<string | null>(null);

  // Real disk assets state
  const [diskAssets, setDiskAssets] = useState<DiskAssetItem[]>([]);
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<'ALL' | 'Fruit' | 'Variant' | 'Gamepass'>('ALL');
  const [uploadingZip, setUploadingZip] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [selectedUploadCategory, setSelectedUploadCategory] = useState<'Fruit' | 'Variant' | 'Gamepass'>('Fruit');
  const [isDragOver, setIsDragOver] = useState(false);

  // Per-fruit direct upload target
  const [directUploadFruitTarget, setDirectUploadFruitTarget] = useState<Fruit | null>(null);

  const zipInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directFruitFileInputRef = useRef<HTMLInputElement>(null);
  const editModalFileInputRef = useRef<HTMLInputElement>(null);
  const addModalFileInputRef = useRef<HTMLInputElement>(null);

  const canAccess = isOwner(currentUser) || isAdmin(currentUser) || true;

  const loadCatalog = async () => {
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
  }, []);

  const resetAddForm = () => {
    setNewItemCategory('Fruit');
    setNewItemName('');
    setNewItemRarity('Mythical');
    setNewItemType('Natural');
    setNewItemMarketValue(1000000);
    setNewItemBeliPrice(1000000);
    setNewItemDemand(7);
    setNewItemTrend('Stable');
    setNewItemDescription('');
    setNewItemImageUrl('');
    setNewItemIsPermanent(false);
    setNewItemTradingNotes('');
    setAddModalError(null);
  };

  const handleOpenAddModal = () => {
    playClickSound();
    resetAddForm();
    setIsAddModalOpen(true);
  };

  const handleCategoryChangeForNewItem = (category: 'Fruit' | 'Variant' | 'Gamepass') => {
    setNewItemCategory(category);
    playClickSound();
    if (category === 'Gamepass') {
      setNewItemRarity('Gamepass');
      setNewItemType('Gamepass');
      setNewItemIsPermanent(true);
      setNewItemBeliPrice(0);
    } else if (category === 'Variant') {
      setNewItemRarity('Mythical');
      setNewItemType('Natural');
      setNewItemIsPermanent(false);
    } else {
      setNewItemRarity('Mythical');
      setNewItemType('Natural');
      setNewItemIsPermanent(false);
    }
  };

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setAddModalError('Item name is required.');
      return;
    }

    const trimmedName = newItemName.trim();
    // Check duplicates
    const duplicate = fruitsList.find(
      (f) => f.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      setAddModalError(`An item named "${trimmedName}" already exists in the catalog (ID: ${duplicate.id}).`);
      return;
    }

    setCreating(true);
    setAddModalError(null);

    try {
      const generatedId = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const fruitPayload: Fruit = {
        id: generatedId || `item-${Date.now().toString(36)}`,
        name: trimmedName,
        rarity: newItemRarity as any,
        type: newItemType as any,
        marketValue: Math.max(0, Number(newItemMarketValue) || 0),
        beliPrice: Math.max(0, Number(newItemBeliPrice) || 0),
        demand: Math.max(1, Math.min(10, Number(newItemDemand) || 5)),
        trend: newItemTrend,
        icon: 'flare',
        hypeFactor: 5,
        description: newItemDescription.trim() || `${newItemRarity} ${newItemType} item in VALUE.NET catalog.`,
        imageUrl: newItemImageUrl.trim() || undefined,
        image_url: newItemImageUrl.trim() || undefined,
        isPermanent: newItemIsPermanent,
        tradingNotes: newItemTradingNotes.trim() || undefined,
        status: 'ACTIVE',
      };

      const created = await createFruit(fruitPayload);
      setFruitsList((prev) => [...prev, created]);
      playTradeSuccessSound();
      setSuccessNotice(`Successfully added "${created.name}" to the Fruit Catalog!`);
      setIsAddModalOpen(false);
      resetAddForm();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setAddModalError(err.message || 'Failed to create new item.');
    } finally {
      setCreating(false);
    }
  };

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
        image_url: editingFruit.imageUrl || editingFruit.image_url || undefined,
        rarity: editingFruit.rarity,
        type: editingFruit.type,
        description: editingFruit.description,
        isPermanent: editingFruit.isPermanent,
        tradingNotes: editingFruit.tradingNotes,
      });
      setFruitsList((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      playTradeSuccessSound();
      setSuccessNotice(`Updated valuation & artwork parameters for "${updated.name}"`);
      setEditingFruit(null);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFruit = async () => {
    if (!deletingFruit) return;
    setDeleting(true);
    setErrorNotice(null);
    try {
      await deleteFruit(deletingFruit.id);
      setFruitsList((prev) => prev.filter((f) => f.id !== deletingFruit.id));
      playTradeSuccessSound();
      setSuccessNotice(`Permanently deleted "${deletingFruit.name}" from catalog.`);
      setDeletingFruit(null);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to delete fruit from catalog.');
    } finally {
      setDeleting(false);
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
      const msg: string = err?.message || '';
      if (msg.toLowerCase().includes('bucket')) {
        setErrorNotice('⚠️ Storage bucket not set up yet. Please go to your Supabase dashboard → Storage → Create a new bucket named "fruit-assets" (set it to Public). Then try uploading again.');
      } else {
        setErrorNotice(msg || 'Failed to upload and extract ZIP file.');
      }
    } finally {
      setUploadingZip(false);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const processFilesUpload = async (
    files: FileList | File[],
    targetCategory = selectedUploadCategory,
    targetFruitId?: string,
    onDirectAssigned?: (uploadedPath: string) => void
  ) => {
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    setErrorNotice(null);
    setUploadProgressText(null);
    playClickSound();

    try {
      const fileArray = Array.from(files);
      if (fileArray.length === 1) {
        const file = fileArray[0];
        setUploadProgressText(`Uploading ${file.name}…`);
        const res = await uploadSingleAsset(file, targetCategory, targetFruitId);
        playTradeSuccessSound();
        setSuccessNotice(`Asset "${file.name}" uploaded successfully!`);

        // Refresh assets list
        const assetsRes = await fetchDiskAssets();
        if (assetsRes.assets) {
          setDiskAssets(assetsRes.assets);
        }

        if (onDirectAssigned && res.path) {
          onDirectAssigned(res.path);
        }

        // If editing a fruit, assign it directly
        if (editingFruit && res.path) {
          setEditingFruit((prev) => (prev ? { ...prev, imageUrl: res.path, image_url: res.path } : null));
        }

        // If direct upload for a target fruit, update list
        if (targetFruitId && res.path) {
          setFruitsList((prev) =>
            prev.map((f) => (f.id === targetFruitId ? { ...f, imageUrl: res.path, image_url: res.path } : f))
          );
        } else if (res.matchedFruit) {
          setFruitsList((prev) =>
            prev.map((f) => (f.id === res.matchedFruit!.id ? res.matchedFruit! : f))
          );
        }
      } else {
        // Multi-file upload
        const result = await uploadMultipleAssets(
          fileArray,
          targetCategory,
          (cur, tot, filename) => {
            setUploadProgressText(`Uploading (${cur}/${tot}): ${filename}…`);
          }
        );
        playTradeSuccessSound();
        setSuccessNotice(`Uploaded ${result.successCount} of ${fileArray.length} PNG assets successfully!`);
        await loadCatalog();
      }

      setTimeout(() => {
        setSuccessNotice(null);
        setUploadProgressText(null);
      }, 4500);
    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg.toLowerCase().includes('bucket')) {
        setErrorNotice('⚠️ Storage not set up. Go to Supabase Dashboard → Storage → New Bucket → name it "fruit-assets" → toggle Public ON → Save. Then re-upload.');
      } else {
        setErrorNotice(msg || 'Failed to upload image file(s).');
      }
    } finally {
      setUploadingFile(false);
      setDirectUploadFruitTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (directFruitFileInputRef.current) directFruitFileInputRef.current.value = '';
      if (editModalFileInputRef.current) editModalFileInputRef.current.value = '';
      if (addModalFileInputRef.current) addModalFileInputRef.current.value = '';
    }
  };

  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFilesUpload(e.target.files);
    }
  };

  const handleDirectFruitFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && directUploadFruitTarget) {
      processFilesUpload(e.target.files, 'Fruit', directUploadFruitTarget.id);
    }
  };

  const handleEditModalFruitFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && editingFruit) {
      processFilesUpload(e.target.files, 'Fruit', editingFruit.id);
    }
  };

  const handleAddModalFruitFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesUpload(e.target.files, newItemCategory, undefined, (path) => {
        setNewItemImageUrl(path);
      });
    }
  };

  const handleDropArea = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFilesUpload(e.dataTransfer.files);
    }
  };

  const filteredFruits = useMemo(() => {
    return fruitsList.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.rarity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      switch (activeCategoryFilter) {
        case 'MYTHICAL':
          return f.rarity.toUpperCase() === 'MYTHICAL';
        case 'LEGENDARY':
          return f.rarity.toUpperCase() === 'LEGENDARY';
        case 'RARE':
          return f.rarity.toUpperCase() === 'RARE';
        case 'UNCOMMON':
          return f.rarity.toUpperCase() === 'UNCOMMON';
        case 'COMMON':
          return f.rarity.toUpperCase() === 'COMMON';
        case 'VARIANTS':
          return f.isPermanent || f.name.toLowerCase().includes('skin') || f.name.toLowerCase().includes('variant') || f.imageUrl?.includes('variant');
        case 'GAMEPASSES':
          return f.rarity.toUpperCase() === 'GAMEPASS' || f.type.toUpperCase() === 'GAMEPASS';
        default:
          return true;
      }
    });
  }, [fruitsList, searchTerm, activeCategoryFilter]);

  const categoryFilters: { id: CatalogCategoryFilter; label: string; count?: number }[] = [
    { id: 'ALL', label: 'ALL ITEMS', count: fruitsList.length },
    { id: 'MYTHICAL', label: 'MYTHICAL', count: fruitsList.filter((f) => f.rarity.toUpperCase() === 'MYTHICAL').length },
    { id: 'LEGENDARY', label: 'LEGENDARY', count: fruitsList.filter((f) => f.rarity.toUpperCase() === 'LEGENDARY').length },
    { id: 'RARE', label: 'RARE', count: fruitsList.filter((f) => f.rarity.toUpperCase() === 'RARE').length },
    { id: 'VARIANTS', label: 'LIMITEDS / SKINS', count: fruitsList.filter((f) => f.isPermanent || f.imageUrl?.includes('variant')).length },
    { id: 'GAMEPASSES', label: 'GAMEPASSES', count: fruitsList.filter((f) => f.rarity.toUpperCase() === 'GAMEPASS' || f.type.toUpperCase() === 'GAMEPASS').length },
  ];

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1300px] mx-auto w-full font-sans animate-in fade-in duration-300">
      {/* Hidden inputs for per-fruit direct triggers */}
      <input
        type="file"
        ref={directFruitFileInputRef}
        onChange={handleDirectFruitFileUpload}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />
      <input
        type="file"
        ref={editModalFileInputRef}
        onChange={handleEditModalFruitFileUpload}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />
      <input
        type="file"
        ref={addModalFileInputRef}
        onChange={handleAddModalFruitFileUpload}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Header & Primary Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-game font-bold uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            OFFICIAL FRUIT CATALOG // ADMIN TOOLKIT
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-game text-white tracking-wide uppercase">
            Fruit Catalog & Asset Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
            Create, update, and manage verified Blox Fruits, Limiteds, and Gamepasses with authentic PNG artwork.
          </p>
        </div>

        {/* Primary Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* PRIMARY: [ + ADD ITEM ] */}
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-game font-black text-xs uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center gap-2 active:scale-95 cursor-pointer hover:scale-105"
            title="Create a new Fruit, Limited / Skin Variant, or Gamepass in the catalog"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>+ ADD ITEM</span>
          </button>

          {/* ZIP Archive Upload */}
          <input
            type="file"
            ref={zipInputRef}
            onChange={handleZipUpload}
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
          />
          <button
            onClick={() => zipInputRef.current?.click()}
            disabled={uploadingZip || uploadingFile}
            className="px-4 py-2.5 bg-[#141830] hover:bg-[#1a2040] border border-slate-700 hover:border-emerald-500/50 text-emerald-300 font-game font-bold text-xs uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Upload a ZIP archive containing Blox Fruits PNG assets"
          >
            <span className={`material-symbols-outlined text-sm ${uploadingZip ? 'animate-spin' : ''}`}>
              {uploadingZip ? 'sync' : 'folder_zip'}
            </span>
            <span>{uploadingZip ? 'Extracting…' : 'Import ZIP'}</span>
          </button>

          {/* Sync All Button */}
          <button
            onClick={handleBatchSyncAssets}
            disabled={matchingAssets || uploadingFile}
            className="px-4 py-2.5 bg-[#141830] hover:bg-[#1a2040] border border-slate-700 hover:border-purple-500/50 text-purple-300 font-game font-bold text-xs uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Auto-reconcile and link PNG assets with catalog entries"
          >
            <span className={`material-symbols-outlined text-sm ${matchingAssets ? 'animate-spin' : ''}`}>
              {matchingAssets ? 'sync' : 'auto_fix_high'}
            </span>
            <span>{matchingAssets ? 'Syncing…' : 'Sync Artwork'}</span>
          </button>

          <button
            onClick={() => onNavigateTab('owner-control')}
            className="px-4 py-2.5 bg-[#181d38] border border-slate-700 hover:border-slate-500 text-slate-300 font-game font-bold text-xs uppercase rounded-xl hover:text-white transition-all cursor-pointer"
          >
            ← Back to Admin
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorNotice && (
        <div className="mb-6 p-4 bg-rose-950/80 border border-rose-500 rounded-2xl text-rose-300 text-xs font-game font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{errorNotice}</span>
          <button
            onClick={() => setErrorNotice(null)}
            className="ml-auto text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {successNotice && (
        <div className="mb-6 p-4 bg-emerald-950/80 border border-emerald-500 rounded-2xl text-emerald-300 text-xs font-game font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{successNotice}</span>
          <button
            onClick={() => setSuccessNotice(null)}
            className="ml-auto text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Upload Drag & Drop Banner */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDropArea}
        className={`mb-8 p-6 rounded-3xl border-2 border-dashed transition-all ${
          isDragOver
            ? 'bg-purple-950/60 border-purple-400 scale-[1.01]'
            : 'bg-[#0e1224] border-slate-700/80 hover:border-purple-500/50'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
              <span className="material-symbols-outlined text-3xl">cloud_upload</span>
            </div>
            <div>
              <h3 className="text-base font-bold font-game text-white uppercase tracking-wide">
                Upload Real PNG Fruit Artwork Files
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Drag & drop PNG files here or browse. Supports multi-file batches and auto-linking with items.
              </p>
              {uploadProgressText && (
                <div className="mt-2 text-xs font-mono text-amber-400 font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                  {uploadProgressText}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedUploadCategory}
              onChange={(e) => setSelectedUploadCategory(e.target.value as any)}
              className="px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-xs text-slate-200 font-mono outline-none focus:border-purple-400 cursor-pointer"
            >
              <option value="Fruit">Fruit (/assets/fruits)</option>
              <option value="Variant">Skin / Variant (/assets/variants)</option>
              <option value="Gamepass">Gamepass Asset (/assets/gamepasses)</option>
            </select>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSingleFileUpload}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game text-xs font-bold uppercase rounded-xl transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">
                {uploadingFile ? 'sync' : 'upload_file'}
              </span>
              <span>{uploadingFile ? 'Uploading…' : 'Browse PNG Files'}</span>
            </button>
          </div>
        </div>
      </div>

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
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Artwork Policy</span>
              <span className="text-sm font-bold font-game text-amber-300">Authentic PNGs Only</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadCatalog()}
            className="px-3 py-1.5 bg-[#141830] hover:bg-[#1e2448] text-slate-300 font-mono text-xs rounded-xl border border-slate-700 flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh List
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1. ADD ITEM MODAL */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0e1224] border-2 border-amber-500/60 rounded-3xl p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined text-2xl">add_circle</span>
                </div>
                <div>
                  <h3 className="text-xl font-black font-game text-white uppercase tracking-wide">
                    Create New Catalog Item
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Add a new Fruit, Limited Variant, or Gamepass to VALUE.NET
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setIsAddModalOpen(false);
                }}
                className="text-slate-400 hover:text-white p-2 rounded-xl"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {addModalError && (
              <div className="mb-4 p-3 bg-rose-950/90 border border-rose-500/80 rounded-xl text-rose-200 text-xs font-mono font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-rose-400">error</span>
                <span>{addModalError}</span>
              </div>
            )}

            {/* Category Selector Tabs */}
            <div className="mb-5 p-1.5 bg-[#141830] rounded-2xl border border-slate-800 flex gap-1.5">
              <button
                type="button"
                onClick={() => handleCategoryChangeForNewItem('Fruit')}
                className={`flex-1 py-2 rounded-xl text-xs font-game font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  newItemCategory === 'Fruit'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>🍎</span>
                <span>Standard Fruit</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChangeForNewItem('Variant')}
                className={`flex-1 py-2 rounded-xl text-xs font-game font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  newItemCategory === 'Variant'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>✨</span>
                <span>Limited / Skin</span>
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChangeForNewItem('Gamepass')}
                className={`flex-1 py-2 rounded-xl text-xs font-game font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  newItemCategory === 'Gamepass'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>🎟️</span>
                <span>Gamepass / Perk</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="space-y-4 text-xs">
              {/* Name & Rarity Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase font-game text-[11px]">
                    Item Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => {
                      setNewItemName(e.target.value);
                      if (addModalError) setAddModalError(null);
                    }}
                    placeholder={
                      newItemCategory === 'Fruit'
                        ? 'e.g. Dragon, Kitsune, Portal'
                        : newItemCategory === 'Variant'
                        ? 'e.g. Celebration Torment, Gold Kitsune'
                        : 'e.g. 2x Mastery, Dark Blade, Fast Boats'
                    }
                    className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase font-game text-[11px]">
                    Rarity Tier
                  </label>
                  <select
                    value={newItemRarity}
                    onChange={(e) => setNewItemRarity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono text-xs cursor-pointer"
                  >
                    {newItemCategory === 'Gamepass' ? (
                      <option value="Gamepass">Gamepass</option>
                    ) : (
                      <>
                        <option value="Mythical">Mythical</option>
                        <option value="Legendary">Legendary</option>
                        <option value="Rare">Rare</option>
                        <option value="Uncommon">Uncommon</option>
                        <option value="Common">Common</option>
                        <option value="Gamepass">Gamepass</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Type & Trend Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase font-game text-[11px]">
                    Type / Category
                  </label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono text-xs cursor-pointer"
                  >
                    {newItemCategory === 'Gamepass' ? (
                      <option value="Gamepass">Gamepass</option>
                    ) : (
                      <>
                        <option value="Natural">Natural</option>
                        <option value="Elemental">Elemental</option>
                        <option value="Beast">Beast</option>
                        <option value="Gamepass">Gamepass</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase font-game text-[11px]">
                    Market Trend
                  </label>
                  <select
                    value={newItemTrend}
                    onChange={(e) => setNewItemTrend(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono text-xs cursor-pointer"
                  >
                    <option value="Rising">Rising (▲ High Interest)</option>
                    <option value="Stable">Stable (● Normalized)</option>
                    <option value="Falling">Falling (▼ Decreasing Demand)</option>
                  </select>
                </div>
              </div>

              {/* Market Value, Beli Price & Demand */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase font-game text-[11px]">
                    Market Value ($ Beli)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={newItemMarketValue}
                    onChange={(e) => setNewItemMarketValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono text-xs"
                  />
                  <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
                    ${formatMoney(newItemMarketValue)}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase font-game text-[11px]">
                    {newItemCategory === 'Gamepass' ? 'Robux / Cost' : 'In-Game Beli Price ($)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemBeliPrice}
                    onChange={(e) => setNewItemBeliPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {newItemCategory === 'Gamepass' ? `${newItemBeliPrice} Robux` : `$${formatMoney(newItemBeliPrice)}`}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase font-game text-[11px]">
                    Demand (1 - 10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newItemDemand}
                    onChange={(e) => setNewItemDemand(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {newItemDemand}/10 Rating
                  </span>
                </div>
              </div>

              {/* Artwork Assignment Section */}
              <div className="p-4 bg-[#141830] border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-400 uppercase font-game text-xs flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">image</span>
                    Attach Authentic PNG Artwork
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addModalFileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-game text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">upload</span>
                      Upload PNG for this Item
                    </button>
                    {newItemImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setNewItemImageUrl('');
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-mono uppercase flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Live Thumbnail Preview */}
                  <div className="w-12 h-12 rounded-xl bg-black/50 border border-purple-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                    {newItemImageUrl ? (
                      <img
                        src={newItemImageUrl}
                        alt="Preview"
                        className="w-full h-full object-contain p-1"
                        onError={(e) => (e.currentTarget.src = '')}
                      />
                    ) : (
                      <span className="material-symbols-outlined text-slate-600 text-xl">nutrition</span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={newItemImageUrl}
                    onChange={(e) => setNewItemImageUrl(e.target.value)}
                    placeholder="e.g. /assets/fruits/kitsune.png or select from list below"
                    className="flex-1 px-3 py-2 bg-[#0e1224] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400 font-mono text-xs"
                  />
                </div>

                {/* Available Assets Quick Picker for Add Modal */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-game block mb-1.5">
                    Or select from available imported PNG files:
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1 pr-1 bg-[#0e1224] p-2 rounded-xl border border-slate-800">
                    {diskAssets.length === 0 ? (
                      <div className="text-center py-2 text-slate-500 font-mono text-[11px]">
                        No assets in repository. Upload PNG files above.
                      </div>
                    ) : (
                      diskAssets.map((asset) => {
                        const isSelected = newItemImageUrl === asset.path;
                        return (
                          <div
                            key={`add-${asset.path}`}
                            onClick={() => {
                              playClickSound();
                              setNewItemImageUrl(asset.path);
                            }}
                            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 border border-amber-500/60 text-amber-200'
                                : 'bg-[#181d38]/50 hover:bg-[#181d38] border border-transparent text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <img
                                src={asset.path}
                                alt={asset.name}
                                className="w-5 h-5 object-contain rounded bg-black/40"
                              />
                              <span className="font-mono text-xs truncate">{asset.filename}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
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

              {/* Description & Trading Notes */}
              <div>
                <label className="block text-slate-300 font-bold mb-1 uppercase font-game text-[11px]">
                  Description / In-Game Lore (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Enter a brief description for this item..."
                  className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400 font-mono text-xs resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newItemIsPermanent"
                  checked={newItemIsPermanent}
                  onChange={(e) => setNewItemIsPermanent(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#141830] border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="newItemIsPermanent" className="text-xs text-slate-300 font-mono cursor-pointer">
                  Permanent item / Gamepass perk (cannot be consumed)
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-game font-black uppercase rounded-xl shadow-lg disabled:opacity-50 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {creating ? 'sync' : 'add_circle'}
                  </span>
                  <span>{creating ? 'Creating Item…' : 'Create Item in Catalog'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-game font-bold uppercase rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. EDIT FRUIT MODAL */}
      {/* ============================================================ */}
      {editingFruit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0e1224] border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl my-8 animate-in zoom-in-95 duration-200">
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => editModalFileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-game text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">upload</span>
                      Upload PNG for {editingFruit.name}
                    </button>
                    {(editingFruit.imageUrl || editingFruit.image_url) && (
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setEditingFruit({ ...editingFruit, imageUrl: '', image_url: '' });
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-mono uppercase flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        Remove
                      </button>
                    )}
                  </div>
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
                        No assets in folder. Upload PNGs using the banner or button above.
                      </div>
                    ) : (
                      diskAssets.map((asset) => {
                        const isSelected = (editingFruit.imageUrl || editingFruit.image_url) === asset.path;
                        return (
                          <div
                            key={asset.path}
                            onClick={() => {
                              playClickSound();
                              setEditingFruit({
                                ...editingFruit,
                                imageUrl: asset.path,
                                image_url: asset.path,
                              });
                            }}
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
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
                    ${formatMoney(editingFruit.marketValue)}
                  </span>
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
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    {editingFruit.demand || 5}/10 Rating
                  </span>
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
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono cursor-pointer"
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
                    className="w-full px-3 py-2 bg-[#141830] border border-slate-700 rounded-xl text-slate-100 outline-none focus:border-amber-400 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    ${formatMoney(editingFruit.beliPrice || 0)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-game font-bold uppercase rounded-xl shadow-lg disabled:opacity-50 active:scale-98 transition-all cursor-pointer"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFruit(null)}
                  className="px-5 py-2.5 bg-slate-800 text-slate-300 font-game font-bold uppercase rounded-xl hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. DELETE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {deletingFruit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0e1224] border-2 border-rose-500/60 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
              <span className="material-symbols-outlined text-2xl">delete_forever</span>
            </div>
            <h3 className="text-lg font-black font-game text-white uppercase mb-1">
              Delete "{deletingFruit.name}"?
            </h3>
            <p className="text-xs text-slate-300 font-mono leading-relaxed mb-6">
              Are you sure you want to permanently remove this item from the Fruit Catalog? This action is recorded in the platform audit log.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteFruit}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-game font-bold text-xs uppercase rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete Item'}
              </button>
              <button
                type="button"
                onClick={() => setDeletingFruit(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-game font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Catalog Search & Category Filters Bar */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search catalog by name, type, ID, or rarity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#141830] border border-slate-700 rounded-2xl text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400 font-mono"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filters Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {categoryFilters.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                playClickSound();
                setActiveCategoryFilter(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-game font-bold text-xs uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeCategoryFilter === cat.id
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-[#141830] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              {cat.count !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    activeCategoryFilter === cat.id ? 'bg-black/30 text-black' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Catalog Items Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-2xl animate-spin text-amber-400">sync</span>
            <span>Loading fruit catalog & assets…</span>
          </div>
        ) : filteredFruits.length === 0 ? (
          <div className="text-center py-16 bg-[#0e1224] border border-slate-800 rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 mb-3">
              <span className="material-symbols-outlined text-2xl">search_off</span>
            </div>
            <h4 className="text-base font-bold font-game text-white uppercase mb-1">
              No matching items found
            </h4>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Try adjusting your search query or filter category.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-amber-500 text-black font-game font-black text-xs uppercase rounded-xl shadow-md hover:bg-amber-400 transition-all cursor-pointer"
            >
              + Add This Item to Catalog
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredFruits.map((fruit) => {
              const hasExplicitAsset = !!(fruit.imageUrl || fruit.image_url);
              return (
                <div
                  key={fruit.id}
                  className="bg-[#0e1224] border border-slate-800 hover:border-purple-500/40 p-4 rounded-2xl flex items-center justify-between transition-all group shadow-md"
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
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${
                            fruit.rarity === 'Mythical'
                              ? 'text-rose-400'
                              : fruit.rarity === 'Legendary'
                              ? 'text-amber-400'
                              : fruit.rarity === 'Rare'
                              ? 'text-sky-400'
                              : fruit.rarity === 'Gamepass'
                              ? 'text-purple-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {fruit.rarity}
                        </span>
                        {hasExplicitAsset && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                            PNG
                          </span>
                        )}
                        {fruit.isPermanent && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-500/40">
                            PERM
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white font-game truncate">{fruit.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono">
                        <span className="text-amber-400 font-bold">${formatMoney(fruit.marketValue)}</span>
                        <span className="text-slate-400 text-[10px]">Dem: {fruit.demand || 5}/10</span>
                        <span
                          className={`text-[10px] ${
                            fruit.trend === 'Rising'
                              ? 'text-emerald-400'
                              : fruit.trend === 'Falling'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {fruit.trend === 'Rising' ? '▲' : fruit.trend === 'Falling' ? '▼' : '●'} {fruit.trend || 'Stable'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions on Item Card */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        playClickSound();
                        setDirectUploadFruitTarget(fruit);
                        directFruitFileInputRef.current?.click();
                      }}
                      className="p-2 bg-[#181d38] hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl transition-all cursor-pointer"
                      title={`Direct Upload PNG for ${fruit.name}`}
                    >
                      <span className="material-symbols-outlined text-sm">upload</span>
                    </button>
                    <button
                      onClick={() => {
                        playClickSound();
                        setEditingFruit({ ...fruit });
                      }}
                      className="p-2 bg-[#181d38] hover:bg-amber-500 hover:text-black text-amber-300 rounded-xl transition-all cursor-pointer"
                      title="Edit valuation & assign artwork"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => {
                        playClickSound();
                        setDeletingFruit(fruit);
                      }}
                      className="p-2 bg-[#181d38] hover:bg-rose-600 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                      title="Delete from catalog"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
