import React, { useState } from 'react';
import { AuthUser } from '../types';

export interface EditProfileViewProps {
  currentUser?: AuthUser | null;
  onSave?: (updated: any) => void;
  onSaveComplete?: (updated: any) => void;
  onCancel?: () => void;
  onLoginRequired?: () => void;
}

export const EditProfileView: React.FC<EditProfileViewProps> = ({
  currentUser,
  onSave,
  onSaveComplete,
  onCancel,
}) => {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.profile?.bio || '');
  const [server, setServer] = useState(currentUser?.profile?.server || 'Sea 3');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...currentUser,
      displayName,
      profile: {
        ...currentUser?.profile,
        bio,
        server,
      },
    };
    if (onSaveComplete) onSaveComplete(updated);
    else if (onSave) onSave(updated);
  };

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-2xl mx-auto w-full animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
        <h1 className="text-2xl font-black text-white font-mono uppercase tracking-wide">
          EDIT TRADER PROFILE
        </h1>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-mono uppercase">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white mt-1"
            />
          </div>

          <div>
            <label className="text-slate-400 font-mono uppercase">Trading Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="e.g. Always looking for Dragon and Kitsune..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white mt-1"
            />
          </div>

          <div>
            <label className="text-slate-400 font-mono uppercase">Default Sea / Realm</label>
            <input
              type="text"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white mt-1"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase font-mono cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase font-mono cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
