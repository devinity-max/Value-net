import React, { useState } from 'react';
import { Fruit, TradeSession, TradeMessage, TraderProfile, AuthUser } from '../types';
import { formatMoney } from '../utils/calc';
import { FruitImage } from './FruitImage';

export interface TradeChatPanelProps {
  session?: TradeSession | null;
  currentUser?: TraderProfile | AuthUser | null;
  messages?: TradeMessage[];
  onSendMessage?: (text: string) => void;
  onConfirmTrade?: (sessionId: string) => void;
  onRejectTrade?: (sessionId: string, reason?: string) => void;
  onClosePanel?: () => void;
  onLoadTradeInCalc?: (offered: Fruit[], requested: Fruit[]) => void;
  // Legacy / fallback props
  onOpenAuth?: () => void;
  activeTradeId?: string | null;
  counterpartUsername?: string;
  onClose?: () => void;
}

export const TradeChatPanel: React.FC<TradeChatPanelProps> = ({
  session,
  currentUser,
  messages = [],
  onSendMessage,
  onConfirmTrade,
  onRejectTrade,
  onClosePanel,
  onLoadTradeInCalc,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');
  const handleClose = onClosePanel || onClose;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (onSendMessage) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const isCreator = currentUser && session?.creatorId === currentUser.id;
  const counterpartName = isCreator
    ? session?.participantName || 'Trader'
    : session?.creatorName || 'Trader';

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              TRADE WITH @{counterpartName}
            </h3>
            <div className="text-[10px] text-slate-400 font-mono">
              Status: <span className="text-amber-400 font-bold">{session?.status || 'IN_PROGRESS'}</span>
            </div>
          </div>
        </div>
        {handleClose && (
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Trade Overview Mini Card */}
      {session?.tradeAd && (
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Offered ({formatMoney(session.tradeAd.offeredTotalValue)})</div>
              <div className="flex gap-1 overflow-x-auto py-1">
                {session.tradeAd.offeredFruits.map((f) => (
                  <FruitImage key={f.id} fruit={f} size="xs" />
                ))}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Requested ({formatMoney(session.tradeAd.requestedTotalValue)})</div>
              <div className="flex gap-1 overflow-x-auto py-1">
                {session.tradeAd.requestedFruits.map((f) => (
                  <FruitImage key={f.id} fruit={f} size="xs" />
                ))}
              </div>
            </div>
          </div>
          {onLoadTradeInCalc && (
            <button
              onClick={() => onLoadTradeInCalc(session.tradeAd.offeredFruits, session.tradeAd.requestedFruits)}
              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold uppercase transition-colors cursor-pointer"
            >
              Analyze in Calculator
            </button>
          )}
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            Start the trade negotiation or share your Roblox join link...
          </div>
        ) : (
          messages.map((m) => {
            const isMe = currentUser && (m.senderId === currentUser.id || m.senderName === currentUser.username);
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mb-0.5">
                  <span className="font-bold">{m.senderName || m.senderUsername || 'Trader'}</span>
                  <span>•</span>
                  <span>{new Date(m.createdAt || m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                    isMe
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {m.message || m.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Bar (Confirm / Reject) */}
      {session && session.status === 'IN_PROGRESS' && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
          {onRejectTrade && (
            <button
              onClick={() => onRejectTrade(session.id, 'Declined by trader')}
              className="flex-1 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase transition-colors cursor-pointer"
            >
              Decline Trade
            </button>
          )}
          {onConfirmTrade && (
            <button
              onClick={() => onConfirmTrade(session.id)}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Confirm Complete
            </button>
          )}
        </div>
      )}

      {/* Input Field */}
      <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a trade negotiation message..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase transition-colors cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
};
