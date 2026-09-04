import React, { useState } from 'react';
import { AuthUser } from '../types';
import { apiLogin, apiRegister, apiResendConfirmationEmail } from '../utils/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await apiLogin(username.trim(), password);
        if (res.success && res.user) {
          onSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Invalid credentials');
        }
      } else {
        const res = await apiRegister(username.trim(), password, email.trim() || undefined);
        if (res.success && res.confirmationRequired) {
          setInfoMessage(res.message || 'Account created! Please check your email to confirm your account before logging in.');
          setResendEmail(email.trim() || null);
          setMode('login');
        } else if (res.success && res.user) {
          onSuccess(res.user);
          onClose();
        } else {
          setError(res.error || 'Registration failed');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!resendEmail) return;
    setResending(true);
    setError(null);
    try {
      const res = await apiResendConfirmationEmail(resendEmail);
      if (res.success) {
        setInfoMessage(res.message || 'Confirmation email resent! Please check your inbox.');
      } else {
        setError(res.error || 'Failed to resend confirmation email.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="text-center mb-6 flex flex-col items-center">
          <div className="relative mb-3">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/50 via-amber-500/40 to-purple-600/50 rounded-2xl blur-sm opacity-70 pointer-events-none" />
            <div className="w-16 h-16 relative rounded-2xl bg-gradient-to-tr from-[#7c3aed] via-[#a855f7] to-[#fbbf24] p-0.5 shadow-lg shadow-purple-950/80 overflow-hidden">
              <img
                src="/assets/logo.png"
                alt="Value.NET Official Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
          </div>
          <h3 className="text-xl font-black text-white font-game uppercase tracking-wider">
            {mode === 'login' ? 'TRADER LOGIN' : 'CREATE VALUE.NET ACCOUNT'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Access live trade matchmaking, reputation stats, and giveaways.'
              : 'Join over 10,000+ Blox Fruits traders.'}
          </p>
        </div>

        {infoMessage && (
          <div className="p-3 mb-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-amber-400">mark_email_read</span>
              <span>{infoMessage}</span>
            </div>
            {resendEmail && (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline self-start cursor-pointer disabled:opacity-50"
              >
                {resending ? 'Sending...' : `Resend confirmation link to ${resendEmail}`}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase font-bold mb-1">
              {mode === 'login' ? 'Email or Roblox Username' : 'Roblox / Trading Username'}
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'login' ? 'e.g. you@example.com or Vortex_Samurai' : 'e.g. Vortex_Samurai'}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase font-bold mb-1">
                Email Address (Required)
              </label>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none disabled:opacity-50"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase font-bold mb-1">
              Password
            </label>
            <input
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs font-mono tracking-wider uppercase transition-all duration-200 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? mode === 'register'
                ? 'CREATING ACCOUNT...'
                : 'AUTHENTICATING...'
              : mode === 'login'
              ? 'SIGN IN'
              : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <div>
              Don't have an account yet?{' '}
              <button
                onClick={() => {
                  setInfoMessage(null);
                  setError(null);
                  setMode('register');
                }}
                className="text-amber-400 font-bold hover:underline"
              >
                Register Free
              </button>
            </div>
          ) : (
            <div>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setInfoMessage(null);
                  setError(null);
                  setMode('login');
                }}
                className="text-amber-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
