import React, { useState } from 'react';
import { AuthUser } from '../types';
import { apiLogin, apiSignup, apiForgotPassword } from '../utils/auth';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await apiLogin({ identifier: username || email, password });
        if (res.success && res.user) {
          playTradeSuccessSound();
          if (onSuccess) onSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Login failed.');
        }
      } else if (tab === 'signup') {
        if (!username.trim() || !email.trim() || !password.trim()) {
          setError('Please fill in all required fields.');
          setLoading(false);
          return;
        }
        const res = await apiSignup({
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
          displayName: displayName.trim() || username.trim(),
        });
        if (res.success && res.user) {
          playTradeSuccessSound();
          if (onSuccess) onSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Sign up failed.');
        }
      } else if (tab === 'forgot') {
        if (!email.trim()) {
          setError('Please enter your email address.');
          setLoading(false);
          return;
        }
        const res = await apiForgotPassword(email.trim());
        if (res.success) {
          setSuccessMsg(res.message || 'Recovery email sent. Check your inbox.');
        } else {
          setError(res.error || 'Failed to send recovery code.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0e1224] border-2 border-purple-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative my-auto box-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-amber-400 shrink-0">
              <span className="material-symbols-outlined text-lg sm:text-xl">account_circle</span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-game font-bold text-amber-400 uppercase tracking-widest block truncate">
                AUTHENTICATION PORTAL
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white font-game truncate">
                {tab === 'login' ? 'Trader Sign In' : tab === 'signup' ? 'Create Account' : 'Reset Password'}
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#161b36] hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-white flex items-center justify-center transition-all shrink-0 min-h-[36px] min-w-[36px]"
          >
            <span className="material-symbols-outlined text-sm sm:text-base">close</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#141830] p-1 rounded-xl border border-slate-800 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-game font-bold rounded-lg transition-all min-h-[38px] ${
              tab === 'login'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setTab('signup');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-game font-bold rounded-lg transition-all min-h-[38px] ${
              tab === 'signup'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setTab('forgot');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-game font-bold rounded-lg transition-all min-h-[38px] ${
              tab === 'forgot'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Forgot
          </button>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">error</span>
            <span className="break-words">{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
            <span className="break-words">{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 font-sans w-full">
          {tab === 'signup' && (
            <div className="w-full">
              <label className="block text-[11px] sm:text-xs font-mono font-bold text-slate-400 mb-1 uppercase">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Admiral Marco"
                className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 outline-none box-border"
              />
            </div>
          )}

          {(tab === 'login' || tab === 'signup') && (
            <div className="w-full">
              <label className="block text-[11px] sm:text-xs font-mono font-bold text-slate-400 mb-1 uppercase">
                {tab === 'login' ? 'Username or Email' : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="e.g. Vortex_Samurai"
                className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 outline-none box-border"
              />
            </div>
          )}

          {(tab === 'signup' || tab === 'forgot') && (
            <div className="w-full">
              <label className="block text-[11px] sm:text-xs font-mono font-bold text-slate-400 mb-1 uppercase">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="trader@valuenet.com"
                className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 outline-none box-border"
              />
            </div>
          )}

          {tab !== 'forgot' && (
            <div className="w-full">
              <label className="block text-[11px] sm:text-xs font-mono font-bold text-slate-400 mb-1 uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[#141830] border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 outline-none box-border"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-game font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 min-h-[44px] cursor-pointer"
          >
            {loading ? 'Processing...' : tab === 'login' ? 'Sign In to Terminal' : tab === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};
