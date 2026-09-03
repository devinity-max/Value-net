import React, { useState, useEffect } from 'react';
import { AuthUser, UserRole } from '../types';
import {
  canAccessModeration,
  canModerateUser,
  getRoleBadgeColor,
  isRootOwner,
  isAdmin,
} from '../utils/permissions';
import { supabase } from '../lib/supabaseClient';
import { playClickSound, playSuccessSound } from '../utils/audio';

interface ModerationCenterViewProps {
  currentUser: AuthUser | null;
  onViewTraderProfile: (username: string) => void;
  onNavigateToTab: (tab: any) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface ReportItem {
  id: string;
  giveawayId?: string;
  targetUsername?: string;
  reporterUsername?: string;
  reason: string;
  notes?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: number;
}

interface ModerationLogItem {
  id: string;
  actorUsername: string;
  actorRole: UserRole;
  targetUsername: string;
  action: 'WARN' | 'MUTE' | 'SUSPEND' | 'BAN' | 'UNBAN' | 'RESOLVE_REPORT';
  reason: string;
  metadata?: Record<string, any>;
  createdAt: number;
}

export const ModerationCenterView: React.FC<ModerationCenterViewProps> = ({
  currentUser,
  onViewTraderProfile,
  onNavigateToTab,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'REPORTS' | 'MODERATE_USER' | 'BANS' | 'AUDIT_LOGS'>('REPORTS');

  // Reports Queue State
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // User Lookup / Moderation State
  const [searchUsername, setSearchUsername] = useState('');
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);

  // Action Modal State
  const [actionType, setActionType] = useState<'WARN' | 'MUTE' | 'SUSPEND' | 'BAN' | 'UNBAN' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionDurationHours, setActionDurationHours] = useState('24');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<ModerationLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const hasAccess = canAccessModeration(currentUser);

  // Load Reports
  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('giveaway_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setReports(
          data.map((r: any) => ({
            id: r.id,
            giveawayId: r.giveaway_id,
            reason: r.reason,
            notes: r.notes,
            status: r.status || 'OPEN',
            createdAt: r.reported_at ? new Date(r.reported_at).getTime() : Date.now(),
          }))
        );
      }
    } catch {}
    setLoadingReports(false);
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('moderation_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setAuditLogs(
          data.map((l: any) => ({
            id: l.id,
            actorUsername: l.actor_username || 'Staff',
            actorRole: l.actor_role || 'MODERATOR',
            targetUsername: l.target_username || 'User',
            action: l.action || 'WARN',
            reason: l.reason || 'Violation of community guidelines',
            createdAt: l.created_at ? new Date(l.created_at).getTime() : Date.now(),
          }))
        );
      }
    } catch {}
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (hasAccess) {
      if (activeSubTab === 'REPORTS') loadReports();
      if (activeSubTab === 'AUDIT_LOGS') loadAuditLogs();
    }
  }, [hasAccess, activeSubTab]);

  // Handle User Search (Privileged Staff Lookup)
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
      } else {
        onShowToast('User not found.', 'error');
      }
    } catch {
      onShowToast('Failed to lookup user profile.', 'error');
    } finally {
      setSearchingUser(false);
    }
  };

  // Handle Moderation Action Submission
  const handleConfirmAction = async () => {
    if (!currentUser || !targetUser || !actionType) return;

    if (!canModerateUser(currentUser, targetUser.role, targetUser.id)) {
      onShowToast('Unauthorized: You cannot moderate staff members equal to or higher than your role.', 'error');
      return;
    }

    if (!actionReason.trim()) {
      onShowToast('A moderation reason is required for all staff actions.', 'error');
      return;
    }

    setIsSubmittingAction(true);
    playClickSound();

    try {
      const isBanAction = actionType === 'BAN';
      const isUnbanAction = actionType === 'UNBAN';

      // Update user profile status in Supabase
      if (isBanAction || isUnbanAction) {
        await supabase
          .from('profiles')
          .update({
            is_banned: isBanAction,
            ban_reason: isBanAction ? actionReason.trim() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetUser.id);
      }

      // Log immutable audit record
      await supabase.from('moderation_audit_log').insert({
        actor_user_id: currentUser.id,
        actor_username: currentUser.username,
        actor_role: currentUser.role,
        target_user_id: targetUser.id,
        target_username: targetUser.username,
        action: actionType,
        reason: actionReason.trim(),
        created_at: new Date().toISOString(),
      });

      playSuccessSound();
      onShowToast(`Successfully applied action "${actionType}" to @${targetUser.username}!`, 'success');

      // Update local target state
      setTargetUser((prev: any) => (prev ? { ...prev, is_banned: isBanAction, ban_reason: actionReason.trim() } : null));

      // Reset modal
      setActionType(null);
      setActionReason('');
    } catch (err: any) {
      onShowToast(err.message || 'Failed to apply moderation action.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Report Status Change
  const handleUpdateReportStatus = async (reportId: string, newStatus: ReportItem['status']) => {
    try {
      await supabase
        .from('giveaway_reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)));
      onShowToast(`Report status updated to ${newStatus}`, 'info');
    } catch {
      onShowToast('Failed to update report status.', 'error');
    }
  };

  // Unauthorized Barrier
  if (!hasAccess) {
    return (
      <div className="pt-28 sm:pt-32 pb-20 px-4 max-w-4xl mx-auto text-center space-y-6">
        <div className="bg-rose-950/80 border-2 border-rose-500/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
            <span className="material-symbols-outlined text-3xl">gavel</span>
          </div>
          <h2 className="text-2xl font-game font-black text-white uppercase tracking-wider">
            Access Restricted — Staff Moderation Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto font-sans">
            This terminal is restricted strictly to verified VALUE.NET Moderators, Admins, and Root Owner. Client-side attempts to bypass access will be rejected server-side.
          </p>
          <button
            onClick={() => onNavigateToTab('calculator')}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-game text-xs font-bold uppercase transition-all shadow-lg cursor-pointer"
          >
            Return to Calculator
          </button>
        </div>
      </div>
    );
  }

  const badgeColor = getRoleBadgeColor(currentUser?.role);

  return (
    <div className="pt-28 sm:pt-32 pb-20 px-4 md:px-8 max-w-[1300px] mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Moderation Banner */}
      <div className="bg-gradient-to-r from-indigo-950/90 via-[#0e1224] to-purple-950/90 p-6 sm:p-8 rounded-3xl border border-indigo-500/40 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border-2 border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <span className="material-symbols-outlined text-3xl">gavel</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-game font-bold uppercase border ${badgeColor.bg} ${badgeColor.text} ${badgeColor.border}`}>
                {currentUser?.role || 'MODERATOR'}
              </span>
              <span className="text-xs font-mono text-slate-400">@{currentUser?.username}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-game font-black text-white uppercase tracking-wider">
              Moderation Control Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-sans max-w-xl">
              Privileged community oversight, user restrictions, safety report queue, and append-only moderation audit history.
            </p>
          </div>
        </div>

        {/* SubTab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#070913] p-1.5 rounded-2xl border border-slate-800">
          {(['REPORTS', 'MODERATE_USER', 'AUDIT_LOGS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                playClickSound();
                setActiveSubTab(tab);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-game font-bold uppercase transition-all cursor-pointer ${
                activeSubTab === tab
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB 1: COMMUNITY REPORTS QUEUE */}
      {activeSubTab === 'REPORTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-game font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400">report</span>
              <span>Community Safety Reports Queue ({reports.length})</span>
            </h3>
            <button
              onClick={loadReports}
              className="px-3 py-1.5 bg-[#141830] hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">refresh</span>
              <span>Refresh</span>
            </button>
          </div>

          {loadingReports ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="font-game text-xs text-slate-400">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 bg-[#0a0d1a]/80 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-mono">
              No open community reports at this time.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-[#0e1224] border border-slate-800 hover:border-indigo-500/40 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-500/40 rounded text-[10px] font-mono font-bold uppercase">
                        Reason: {report.reason}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(report.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {report.notes && (
                      <p className="text-xs text-slate-300 font-sans">{report.notes}</p>
                    )}
                    {report.giveawayId && (
                      <p className="text-[11px] text-indigo-400 font-mono">Target Giveaway ID: {report.giveawayId}</p>
                    )}
                  </div>

                  {/* Status controls */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateReportStatus(report.id, st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-game font-bold uppercase transition-all cursor-pointer ${
                          report.status === st
                            ? st === 'RESOLVED'
                              ? 'bg-emerald-600 text-white'
                              : st === 'DISMISSED'
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-indigo-600 text-white'
                            : 'bg-[#141830] text-slate-400 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: PRIVILEGED USER MODERATION DESK */}
      {activeSubTab === 'MODERATE_USER' && (
        <div className="space-y-6">
          <div className="bg-[#0e1224] border border-indigo-500/30 p-6 rounded-3xl space-y-4">
            <h3 className="font-game font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400">person_search</span>
              <span>Privileged Staff User Lookup</span>
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Look up any registered player by username to review their role, account status, active restrictions, and issue staff moderation actions.
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
                  placeholder="Enter exact username (e.g. Vortex_Samurai)..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#070913] border border-slate-700 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={searchingUser}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-game font-bold text-xs uppercase rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {searchingUser ? 'Searching...' : 'Lookup Player'}
              </button>
            </form>
          </div>

          {/* User Profile Moderation Profile Card */}
          {targetUser && (
            <div className="bg-[#0a0d1a] border-2 border-indigo-500/40 p-6 sm:p-8 rounded-3xl space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                    <span className="material-symbols-outlined text-2xl">{targetUser.avatar_url || 'person'}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-game font-black text-white">@{targetUser.username}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-game font-bold uppercase border ${getRoleBadgeColor(targetUser.role).bg} ${getRoleBadgeColor(targetUser.role).text} ${getRoleBadgeColor(targetUser.role).border}`}>
                        {targetUser.role || 'MEMBER'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans">{targetUser.display_name || targetUser.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-xl text-xs font-game font-bold uppercase border ${
                    targetUser.is_banned
                      ? 'bg-rose-950 text-rose-300 border-rose-500/60'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                  }`}>
                    {targetUser.is_banned ? '🚫 BANNED' : '✅ ACTIVE'}
                  </span>
                  <button
                    onClick={() => onViewTraderProfile(targetUser.username)}
                    className="px-3 py-1.5 bg-[#141830] hover:bg-slate-800 text-slate-300 text-xs font-game font-bold uppercase rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    View Trader Profile
                  </button>
                </div>
              </div>

              {targetUser.is_banned && targetUser.ban_reason && (
                <div className="p-4 bg-rose-950/80 border border-rose-500/80 rounded-2xl text-rose-200 text-xs font-mono">
                  <span className="font-bold uppercase block mb-1">Active Ban Reason:</span>
                  {targetUser.ban_reason}
                </div>
              )}

              {/* Action Trigger Buttons */}
              <div className="space-y-2">
                <h5 className="font-game font-bold text-xs text-slate-400 uppercase tracking-wider">Issue Staff Moderation Action:</h5>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { setActionType('WARN'); setActionReason(''); }}
                    className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-game font-bold text-xs uppercase rounded-xl border border-amber-500/40 transition-all cursor-pointer"
                  >
                    ⚠️ Issue Warning
                  </button>

                  <button
                    onClick={() => { setActionType('MUTE'); setActionReason(''); }}
                    className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white font-game font-bold text-xs uppercase rounded-xl border border-indigo-500/40 transition-all cursor-pointer"
                  >
                    🔇 Timeout / Mute
                  </button>

                  {!targetUser.is_banned ? (
                    <button
                      onClick={() => { setActionType('BAN'); setActionReason(''); }}
                      className="px-4 py-2 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white font-game font-bold text-xs uppercase rounded-xl border border-rose-500/40 transition-all cursor-pointer"
                    >
                      🚫 Ban Player
                    </button>
                  ) : (
                    <button
                      onClick={() => { setActionType('UNBAN'); setActionReason(''); }}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-game font-bold text-xs uppercase rounded-xl border border-emerald-500/40 transition-all cursor-pointer"
                    >
                      🔓 Lift Ban (Unban)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Moderation Action Modal */}
          {actionType && targetUser && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-[#0e1224] border-2 border-indigo-500/60 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-in zoom-in-95 duration-200 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="font-game font-black text-lg text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-400">gavel</span>
                    <span>Confirm Action: {actionType}</span>
                  </h4>
                  <button
                    onClick={() => setActionType(null)}
                    className="text-slate-400 hover:text-white text-xl cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <p><span className="text-slate-500">Target User:</span> <strong className="text-white">@{targetUser.username}</strong> ({targetUser.role})</p>
                  <p><span className="text-slate-500">Action:</span> <strong className="text-amber-400">{actionType}</strong></p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-game font-bold text-slate-300 uppercase">
                    Mandatory Staff Moderation Reason <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter explicit reason for audit log (e.g. Scammed trade, Abusive language)..."
                    rows={3}
                    className="w-full p-3 bg-[#070913] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-sans"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setActionType(null)}
                    className="flex-1 py-2.5 bg-[#141830] hover:bg-slate-800 text-slate-300 font-game font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={isSubmittingAction || !actionReason.trim()}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-game font-bold text-xs uppercase rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAction ? 'Processing...' : 'Confirm Action'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: MODERATION AUDIT LOGS */}
      {activeSubTab === 'AUDIT_LOGS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-game font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400">history</span>
              <span>Append-Only Moderation Audit Logs</span>
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
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="font-game text-xs text-slate-400">Loading audit history...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 bg-[#0a0d1a]/80 rounded-2xl border border-slate-800 text-center text-slate-500 text-xs font-mono">
              No staff moderation audit records found.
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
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold">
                        {log.action}
                      </span>
                      <span className="text-slate-300">
                        Staff <strong className="text-white">@{log.actorUsername}</strong> → Target <strong className="text-amber-300">@{log.targetUsername}</strong>
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">Reason: {log.reason}</p>
                  </div>

                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
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
