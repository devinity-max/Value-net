import React from 'react';
import { TradeNotification } from '../types';

export interface NotificationToastProps {
  notification: TradeNotification | null | undefined;
  onClose?: () => void;
  onDismiss?: () => void;
  onAction?: () => void;
  onOpenSession?: (sessionId?: any) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onDismiss,
  onAction,
  onOpenSession,
}) => {
  if (!notification) {
    return null;
  }

  const handleClose = () => {
    if (onClose) onClose();
    if (onDismiss) onDismiss();
  };

  const handleAction = () => {
    if (onAction) onAction();
    if (onOpenSession) onOpenSession(notification.sessionId);
  };

  return (
    <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-[#12162d]/95 border-2 border-purple-500/60 text-slate-100 p-4 rounded-2xl shadow-2xl backdrop-blur-xl flex items-start gap-3 animate-in slide-in-from-top-5 duration-200">
      <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-amber-400 shrink-0">
        <span className="material-symbols-outlined text-base">notifications_active</span>
      </div>
      <div className="flex-1 font-sans">
        <h5 className="text-xs font-bold font-game text-amber-300 uppercase tracking-wide">
          {notification.title || 'Notification'}
        </h5>
        <p className="text-xs text-slate-300 mt-0.5">{notification.message || ''}</p>
        {(onAction || onOpenSession) && notification.sessionId && (
          <button
            onClick={handleAction}
            className="mt-2 text-[11px] font-game font-bold text-amber-400 hover:text-amber-300 underline block uppercase cursor-pointer"
          >
            View Live Session →
          </button>
        )}
      </div>
      <button onClick={handleClose} className="text-slate-500 hover:text-white cursor-pointer">
        <span className="material-symbols-outlined text-xs">close</span>
      </button>
    </div>
  );
};
