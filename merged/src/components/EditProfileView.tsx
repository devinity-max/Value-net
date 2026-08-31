import React, { useState, useEffect } from 'react';
import { AuthUser, Fruit, ProfileTheme, TradingStyle, UserProfile } from '../types';
import { getStoredUser, setStoredUser } from '../utils/auth';
import { safeFetchJson } from '../utils/apiHelper';
import { BLOX_FRUITS_DATA } from '../data/fruits';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface EditProfileViewProps {
  onSaveComplete: (updatedProfile: UserProfile) => void;
  onCancel: () => void;
  onLoginRequired: () => void;
}

const AVATAR_OPTIONS = [
  'swords',
  'crown',
  'military_tech',
  'shield_person',
  'visibility',
  'skull',
  'local_fire_department',
  'diamond',
  'psychology',
  'stars',
  'electric_bolt',
  'rocket_launch',
];

const THEME_OPTIONS: { id: ProfileTheme; label: string; bg: string }[] = [
  { id: 'midnight', label: 'Midnight Obsidian', bg: 'bg-slate-900 border-slate-700' },
  { id: 'violet', label: 'Neon Violet', bg: 'bg-purple-950 border-purple-500' },
  { id: 'gold', label: 'Aura Gold', bg: 'bg-amber-950 border-amber-500' },
  { id: 'ocean', label: 'Abyssal Ocean', bg: 'bg-cyan-950 border-cyan-500' },
  { id: 'crimson', label: 'Crimson Fire', bg: 'bg-rose-950 border-rose-500' },
];

const TRADING_STYLES: TradingStyle[] = [
  'Fair Trades',
  'W Trades',
  'Collector',
  'Fruit Hunter',
  'Value Trader',
  'Flexible',
];

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  onSaveComplete,
  onCancel,
  onLoginRequired,
}) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('swords');
  const [profileTheme, setProfileTheme] = useState<ProfileTheme>('midnight');
  const [tradingStyle, setTradingStyle] = useState<TradingStyle>('Fair Trades');
  const [server, setServer] = useState('US-EAST #412');
  const [favoriteFruitId, setFavoriteFruitId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      onLoginRequired();
      return;
    }
    setCurrentUser(user);
    setDisplayName(user.displayName || user.username);
    setBio(user.profile?.bio || '');
    setAvatarUrl(user.avatarUrl || user.profile?.avatarUrl || 'swords');
    setProfileTheme(user.profile?.profileTheme || 'midnight');
    setTradingStyle(user.profile?.tradingStyle || 'Fair Trades');
    setServer(user.profile?.server || 'US-EAST #412');
    setFavoriteFruitId(user.profile?.favoriteFruitId || '');
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setError(null);

    const res = await safeFetchJson<{ success: boolean; profile: UserProfile; error?: string }>(
      `/api/profiles/${encodeURIComponent(currentUser.id)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          displayName,
          bio,
          avatarUrl,
          profileTheme,
          tradingStyle,
          server,
          favoriteFruitId: favoriteFruitId || null,
        }),
      }
    );

    if (res.success && res.data?.success && res.data.profile) {
      const updatedProfile = res.data.profile;
      const updatedUser: AuthUser = {
        ...currentUser,
        displayName: updatedProfile.displayName,
        avatarUrl: updatedProfile.avatarUrl,
        profile: updatedProfile,
      };
      setStoredUser(updatedUser);
      playSuccessSound();
      onSaveComplete(updatedProfile);
    } else {
      setError(res.data?.error || res.error || 'Failed to save changes.');
    }
    setSaving(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0a0d1a]/95 rounded-3xl border border-purple-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-300 text-xl">manage_accounts</span>
          </div>
          <div>
            <h2 className="text-xl font-game font-black text-white uppercase tracking-wider">
              Edit Player Profile
            </h2>
            <p className="text-xs text-slate-400">Configure your trader identity, theme & preferences</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playClickSound();
            onCancel();
          }}
          className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-rose-950/80 border border-rose-500/50 p-3.5 rounded-xl text-rose-300 text-xs font-game flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block text-xs font-game font-bold text-slate-300 uppercase tracking-wider mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={32}
            className="w-full bg-[#0e1224] border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
            placeholder="Your public trader name"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-game font-bold text-slate-300 uppercase tracking-wider mb-2">
            Trader Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={250}
            className="w-full bg-[#0e1224] border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
            placeholder="Tell other traders about your inventory, preferred servers, and trading goals..."
          />
        </div>

        {/* Avatar Selection */}
        <div>
          <label className="block text-xs font-game font-bold text-slate-300 uppercase tracking-wider mb-2">
            Avatar Crest
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {AVATAR_OPTIONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => {
                  playClickSound();
                  setAvatarUrl(iconName);
                }}
                className={`h-12 rounded-xl border flex items-center justify-center transition-all ${
                  avatarUrl === iconName
                    ? 'bg-purple-900/60 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-105'
                    : 'bg-[#0e1224] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-2xl">{iconName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Profile Theme Selection */}
        <div>
          <label className="block text-xs font-game font-bold text-slate-300 uppercase tracking-wider mb-2">
            Profile Theme
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  setProfileTheme(t.id);
                }}
                className={`p-3 rounded-xl border text-xs font-game font-bold text-left transition-all ${t.bg} ${
                  profileTheme === t.id
                    ? 'ring-2 ring-purple-400 shadow-lg text-white'
                    : 'text-slate-400 hover:text-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trading Style & Preferred Server */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-game font-bold text-slate-300 uppercase tracking-wider mb-2">
              Trading Style
            </label>
            <select
              value={tradingStyle}
              onChange={(e) => setTradingStyle(e.target.value as TradingStyle)}
              className="w-full bg-[#0e1224] border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
            >
              {TRADING_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-game font-bold text-slate-300 uppercase tracking-wider mb-2">
              Primary Server
            </label>
            <input
              type="text"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className="w-full bg-[#0e1224] border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-colors"
              placeholder="e.g. US-EAST #412"
            />
          </div>
        </div>

        {/* Favorite Fruit */}
        <div>
          <label className="block text-xs font-game font-bold text-slate-300 uppercase tracking-wider mb-2">
            Favorite Fruit
          </label>
          <select
            value={favoriteFruitId}
            onChange={(e) => setFavoriteFruitId(e.target.value)}
            className="w-full bg-[#0e1224] border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
          >
            <option value="">-- None Selected --</option>
            {BLOX_FRUITS_DATA.map((fruit) => (
              <option key={fruit.id} value={fruit.id}>
                {fruit.name} ({fruit.rarity})
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onCancel();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-game font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 active:scale-98 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
