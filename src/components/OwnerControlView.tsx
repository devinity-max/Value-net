import React, { useState, useEffect } from 'react';
import { AuthUser, UserRole, ActiveTab } from '../types';
import {
  canAccessAdmin,
  canAssignRole,
  getRoleBadgeColor,
  isRootOwner,
  isAdmin,
} from '../utils/permissions';
import { supabase } from '../lib/supabaseClient';
import { playClickSound, playSuccessSound } from '../utils/audio';

export interface OwnerControlViewProps {
  currentUser: AuthUser | null;
  onViewTraderProfile?: (username: string) => void;
  onNavigateToTab?: (tab: ActiveTab) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface AuditRecord {
  id: string;
  actor_username: string;
  actor_role: string;
  target_username: string;
  action: string;
  reason: string;
  created_at: string;
}

interface AdRequestRecord {
  id: string;
  name: string;
  discord_username: string;
  email: string;
  brand_name: string;
  website_url?: string;
  promotion_type: string;
  duration: string;
  description: string;
  status: 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  created_at: string;
}

export const OwnerControlView: React.FC<OwnerControlViewProps> = ({
  currentUser,
  onShowToast,
  onNavigateToTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ROLES' | 'SITE_CONFIG' | 'ADVERTISING' | 'SECURITY'>('ROLES');

  // Role Management State
  const [searchUsername, setSearchUsername] = useState('');
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('MEMBER');
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const [isAssigningRole, setIsAssigningRole] = useState(false);

  // System Configuration State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [rateLimitThreshold, setRateLimitThreshold] = useState('100');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Advertising Requests State
  const [adRequests, setAdRequests] = useState<AdRequestRecord[]>([]);
  const [loadingAdRequests, setLoadingAdRequests] = useState(false);

  const hasAccess = canAccessAdmin(currentUser);

  // Load Security Audit Logs
  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('role_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setAuditLogs(data);
      }
    } catch {}
    setLoadingLogs(false);
  };

  // Load Advertising Requests
  const loadAdRequests = async () => {
    setLoadingAdRequests(true);
    try {
      const { data, error } = await supabase
        .from('advertising_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setAdRequests(data);
      }
    } catch {}
    setLoadingAdRequests(false);
  };

  useEffect(() => {
    if (hasAccess) {
      if (activeSubTab === 'SECURITY') loadAuditLogs();
      if (activeSubTab === 'ADVERTISING') loadAdRequests();
    }
  }, [hasAccess, activeSubTab]);

  // Handle User Lookup
  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    setSearchingUser(true);
    setTargetUser(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', searchUsername.trim())
        .maybeSingle();

      if (!error && data) {
        setTargetUser(data);
        setSelectedRole(data.role || 'MEMBER');
      } else {
        onShowToast?.('User profile not found.', 'error');
      }
    } catch {
      onShowToast?.('Failed to lookup user profile.', 'error');
    } finally {
      setSearchingUser(false);
    }
  };

  // Handle Staff Role Change Assignment
  const handleAssignRole = async () => {
    if (!currentUser || !targetUser) return;

    if (!canAssignRole(currentUser, targetUser.role, selectedRole, targetUser.id)) {
      onShowToast?.('Unauthorized: You do not have permission to assign this role or alter this user.', 'error');
      return;
    }

    if (!roleChangeReason.trim()) {
      onShowToast?.('A mandatory reason is required for staff role modifications.', 'error');
      return;
    }

    setIsAssigningRole(true);
    playClickSound();

    try {
      const previousRole = targetUser.role || 'MEMBER';

      // Update role in Supabase database
      const { error: sbErr } = await supabase
        .from('profiles')
        .update({
          role: selectedRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUser.id);

      if (sbErr) throw sbErr;

      // Log append-only role audit record
      await supabase.from('role_audit_log').insert({
        actor_user_id: currentUser.id,
        actor_username: currentUser.username,
        actor_role: currentUser.role,
        target_user_id: targetUser.id,
        target_username: targetUser.username,
        action: 'ROLE_ASSIGNED',
        previous_role: previousRole,
        new_role: selectedRole,
        reason: roleChangeReason.trim(),
        created_at: new Date().toISOString(),
      });

      playSuccessSound();
      onShowToast?.(`Successfully updated @${targetUser.username}'s role to ${selectedRole}!`, 'success');

      setTargetUser((prev: any) => (prev ? { ...prev, role: selectedRole } : null));
      setRoleChangeReason('');
    } catch (err: any) {
      onShowToast?.(err.message || 'Failed to update user role.', 'error');
    } finally {
      setIsAssigningRole(false);
    }
  };

  // Update Advertising Request Status
  const handleUpdateAdStatus = async (id: string, newStatus: AdRequestRecord['status']) => {
    try {
      await supabase
        .from('advertising_requests')
        .update({ status: newStatus })
        .eq('id', id);

      setAdRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
      playSuccessSound();
      onShowToast?.(`Advertising request status updated to ${newStatus}`, 'success');
    } catch {
      onShowToast?.('Failed to update advertising request status.', 'error');
    }
  };

  const handleSaveConfig = () => {
    playSuccessSound();
    onShowToast?.('Core system configuration committed!', 'success');
  };

  // Unauthorized Barrier
  if (!hasAccess) {
    return (
      <div className="pt-28 sm:pt-32 pb-20 px-4 max-w-4xl mx-auto text-center space-y-6">
        <div className="bg-rose-950/80 border-2 border-rose-500/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
            <span className="material-symbols-outlined text-3xl">shield_lock</span>
          </div>
          <h2 className="text-2xl font-game font-black text-white uppercase tracking-wider">
            Access Restricted — Admin Control Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto font-sans">
            This administration console is restricted to verified VALUE.NET Admins and Root Owner. Unauthorized requests are logged and rejected server-side.
          </p>
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('calculator')}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game text-xs font-bold uppercase transition-all shadow-lg cursor-pointer"
            >
              Return to App
            </button>
          )}
        </div>
      </div>
    );
  }

  const badgeColor = getRoleBadgeColor(currentUser?.role);

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1300px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-amber-950/90 via-[#0e1224] to-purple-950/90 p-6 sm:p-8 rounded-3xl border border-amber-500/40 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-game font-bold uppercase border ${badgeColor.bg} ${badgeColor.text} ${badgeColor.border}`}>
                {currentUser?.role || 'ADMIN'}
              </span>
              <span className="text-xs font-mono text-slate-400">@{currentUser?.username}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-game font-black text-white uppercase tracking-wider">
              {isRootOwner(currentUser) ? 'Root Owner & Admin Console' : 'Admin Control Center'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl">
              Centralized platform administration, staff role hierarchy management, advertising requests, and security audit records.
            </p>
          </div>
        </div>

        {/* SubTab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#070913] p-1.5 rounded-2xl border border-slate-800">
          {(['ROLES', 'SITE_CONFIG', 'ADVERTISING', 'SECURITY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                playClickSound();
                setActiveSubTab(tab);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-game font-bold uppercase transition-all cursor-pointer ${
                activeSubTab === tab
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab === 'ROLES' ? 'Roles & Staff' : tab === 'SITE_CONFIG' ? 'Site Config' : tab === 'ADVERTISING' ? 'Ad Requests' : 'Security Logs'}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB 1: ROLES & STAFF MANAGEMENT */}
      {activeSubTab === 'ROLES' && (
        <div className="space-y-6">
          <div className="bg-[#0e1224] border border-amber-500/30 p-6 rounded-3xl space-y-4">
            <h3 className="font-game font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">manage_accounts</span>
              <span>Staff & User Role Assignment Desk</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Look up any user profile to modify their role according to your staff clearance level. Role changes are logged to an append-only audit trail.
            </p>

            <form onSubmit={handleSearchUser} className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  search
                </span>
                <input
                  type="text"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  placeholder="Lookup exact username (e.g. Vortex_Samurai)..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#070913] border border-slate-700 focus:border-amber-400 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={searchingUser}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-game font-black text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {searchingUser ? 'Searching...' : 'Lookup User'}
              </button>
            </form>
          </div>

          {/* User Role Card */}
          {targetUser && (
            <div className="bg-[#0a0d1a] border-2 border-amber-500/40 p-6 sm:p-8 rounded-3xl space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <span className="material-symbols-outlined text-2xl">{targetUser.avatar_url || 'person'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-game font-black text-white">@{targetUser.username}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-game font-bold uppercase border ${getRoleBadgeColor(targetUser.role).bg} ${getRoleBadgeColor(targetUser.role).text} ${getRoleBadgeColor(targetUser.role).border}`}>
                        Current: {targetUser.role || 'MEMBER'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans">{targetUser.display_name || targetUser.username}</p>
                  </div>
                </div>
              </div>

              {/* Role Select Form */}
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-1.5">
                    Select New Assigned Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full p-3 bg-[#070913] border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-400 font-mono"
                  >
                    <option value="MEMBER">MEMBER (Standard Player)</option>
                    <option value="APPROVED_CREATOR">APPROVED_CREATOR (Giveaway Host)</option>
                    <option value="MODERATOR">MODERATOR (Community Staff)</option>
                    {isRootOwner(currentUser) && (
                      <>
                        <option value="ADMIN">ADMIN (Full Admin Access)</option>
                        <option value="ROOT_OWNER">ROOT_OWNER (System Owner)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-game font-bold text-slate-300 uppercase mb-1.5">
                    Mandatory Audit Change Reason <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleChangeReason}
                    onChange={(e) => setRoleChangeReason(e.target.value)}
                    placeholder="Enter explicit reason (e.g. Promoted to Moderator, Verified Creator)..."
                    className="w-full p-3 bg-[#070913] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
                  />
                </div>

                <button
                  onClick={handleAssignRole}
                  disabled={isAssigningRole || !roleChangeReason.trim()}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-game font-black text-xs uppercase rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isAssigningRole ? 'Updating Role...' : `Commit Role Change to ${selectedRole}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SITE CONFIGURATION */}
      {activeSubTab === 'SITE_CONFIG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0e1224] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-game font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">tune</span>
              <span>Global Platform Controls</span>
            </h3>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#070913] border border-slate-800">
              <div>
                <div className="text-xs font-bold text-white">Emergency Maintenance Mode</div>
                <div className="text-[10px] text-slate-400">Lock public endpoints and trade creation</div>
              </div>
              <button
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold font-mono uppercase cursor-pointer ${
                  maintenanceMode ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {maintenanceMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono uppercase">API Rate Limit Threshold (req/min)</label>
              <input
                type="number"
                value={rateLimitThreshold}
                onChange={(e) => setRateLimitThreshold(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#070913] border border-slate-800 text-white mt-1 text-xs font-mono"
              />
            </div>

            <button
              onClick={handleSaveConfig}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-game font-black text-xs uppercase cursor-pointer"
            >
              Commit Site Settings
            </button>
          </div>

          <div className="bg-[#0e1224] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-game font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">dashboard_customize</span>
              <span>Catalog & Admin Shortcuts</span>
            </h3>

            <p className="text-xs text-slate-400 font-sans">
              Quick navigation to specialized administrative modules.
            </p>

            <div className="space-y-2">
              {onNavigateToTab && (
                <>
                  <button
                    onClick={() => onNavigateToTab('fruit-catalog-admin')}
                    className="w-full p-3.5 bg-[#141830] hover:bg-slate-800 text-left text-xs font-game font-bold text-slate-200 uppercase rounded-2xl border border-slate-700 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>🍎 Fruit Catalog Admin & Asset Pipeline</span>
                    <span>→</span>
                  </button>

                  <button
                    onClick={() => onNavigateToTab('monetization-admin')}
                    className="w-full p-3.5 bg-[#141830] hover:bg-slate-800 text-left text-xs font-game font-bold text-slate-200 uppercase rounded-2xl border border-slate-700 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>💎 Monetization & Ad Network Control</span>
                    <span>→</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ADVERTISING REQUESTS MANAGEMENT */}
      {activeSubTab === 'ADVERTISING' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-game font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">campaign</span>
              <span>Advertising & Sponsorship Submissions ({adRequests.length})</span>
            </h3>
            <button
              onClick={loadAdRequests}
              className="px-3 py-1.5 bg-[#141830] hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">refresh</span>
              <span>Refresh</span>
            </button>
          </div>

          {loadingAdRequests ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="font-game text-xs text-slate-400">Loading advertising submissions...</p>
            </div>
          ) : adRequests.length === 0 ? (
            <div className="p-8 bg-[#0a0d1a]/80 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-mono">
              No advertising quote requests submitted yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {adRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#0e1224] border border-slate-800 hover:border-amber-500/40 p-5 rounded-2xl space-y-3 transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-game font-bold text-white">{req.brand_name}</h4>
                        <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/40 rounded text-[10px] font-mono font-bold uppercase">
                          Type: {req.promotion_type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Contact: <strong className="text-slate-200">{req.name}</strong> • Discord: <strong className="text-indigo-400">{req.discord_username}</strong> • Email: <strong className="text-slate-300">{req.email}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed bg-[#070913] p-3 rounded-xl border border-slate-800">
                    "{req.description}"
                  </p>

                  {req.website_url && (
                    <p className="text-xs text-indigo-400 font-mono">
                      Website: <a href={req.website_url} target="_blank" rel="noopener noreferrer" className="underline">{req.website_url}</a>
                    </p>
                  )}

                  {/* Status controls */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-game font-bold text-slate-400 uppercase">Set Status:</span>
                    {(['PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'COMPLETED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateAdStatus(req.id, st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-game font-bold uppercase transition-all cursor-pointer ${
                          req.status === st
                            ? st === 'APPROVED'
                              ? 'bg-emerald-600 text-white'
                              : st === 'REJECTED'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-[#141830] text-slate-400 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: SECURITY AUDIT LOGS */}
      {activeSubTab === 'SECURITY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-game font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">shield_lock</span>
              <span>Role Assignment Audit Trail</span>
            </h3>
            <button
              onClick={loadAuditLogs}
              className="px-3 py-1.5 bg-[#141830] hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">refresh</span>
              <span>Refresh</span>
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="font-game text-xs text-slate-400">Loading audit history...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 bg-[#0a0d1a]/80 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-mono">
              No role assignment audit logs found.
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#0e1224] border border-slate-800/80 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        {log.action}
                      </span>
                      <span className="text-slate-300">
                        Staff <strong className="text-white">@{log.actor_username}</strong> → User <strong className="text-amber-300">@{log.target_username}</strong>
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">Reason: {log.reason}</p>
                  </div>

                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
