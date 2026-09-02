import React from 'react';
import { TradeNotification } from '../types';

export interface NotificationToastProps {
  toast?: {
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;
  onClose?: () => void;
  notification?: TradeNotification | null;
  onDismiss?: () => void;
  onOpenSession?: (sessionId: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  toast,
  onClose,
  notification,
  onDismiss,
  onOpenSession,
}) => {
  const activeToast = toast || (notification ? {
    message: `${notification.title}: ${notification.message}`,
    type: notification.type === 'rejected' || notification.type === 'cancelled' ? 'error' as const : 'success' as const,
  } : null);

  const handleClose = onDismiss || onClose;

  if (!activeToast) return null;

  const bgStyles = {
    success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-500/10',
    error: 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-500/10',
    info: 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200 shadow-indigo-500/10',
  };

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${bgStyles[activeToast.type]}`}
      >
        <span className="material-symbols-outlined text-xl">{icons[activeToast.type]}</span>
        <div className="text-sm font-semibold tracking-wide">
          {activeToast.message}
          {notification?.sessionId && onOpenSession && (
            <button
              onClick={() => onOpenSession(notification.sessionId!)}
              className="ml-2 underline font-bold text-amber-300 hover:text-amber-200 text-xs"
            >
              Open Chamber &rarr;
            </button>
          )}
        </div>
        {handleClose && (
          <button
            onClick={handleClose}
            className="ml-2 text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
    </div>
  );
};
