import React, { useState, useEffect, useRef } from 'react';
import { TradeSession, TradeMessage, TraderProfile } from '../types';
import { playClickSound, playTradeSuccessSound } from '../utils/audio';

export interface TradeChatPanelProps {
  session: TradeSession;
  messages: TradeMessage[];
  currentUser: TraderProfile;
  onSendMessage: (text: string) => void | Promise<void>;
  onClose?: () => void;
  onClosePanel?: () => void;
  onConfirmTrade?: () => void | Promise<any>;
  onCancelTrade?: () => void | Promise<any>;
  onRejectTrade?: (reason?: string) => void | Promise<any>;
  onLoadTradeInCalc?: (offering: any, requesting: any) => void;
}

export const TradeChatPanel: React.FC<TradeChatPanelProps> = ({
  session,
  messages,
  currentUser,
  onSendMessage,
  onClose,
  onClosePanel,
  onConfirmTrade,
  onCancelTrade,
  onRejectTrade,
  onLoadTradeInCalc,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (onClose) onClose();
    if (onClosePanel) onClosePanel();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed bottom-2 sm:bottom-4 right-2 sm:right-4 left-2 sm:left-auto z-40 w-auto sm:w-full max-w-[calc(100vw-16px)] sm:max-w-md bg-[#0e1224] border-2 border-purple-500/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[460px] sm:h-[500px]">
      {/* Top Header */}
      <div className="p-4 bg-[#141830] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-950 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-base">forum</span>
          </div>
          <div>
            <h4 className="text-xs font-game font-bold text-white">Live Trade Negotiation</h4>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Secured Channel
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            playClickSound();
            handleClose();
          }}
          className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs bg-[#090b14]">
        {messages.length === 0 && (
          <div className="text-center py-10 text-slate-500 font-mono text-[11px]">
            Session opened. Negotiate your in-game Roblox table trade here!
          </div>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === currentUser.id;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[9px] text-slate-500 font-mono mb-0.5">{m.senderName}</span>
              <div
                className={`p-3 rounded-2xl max-w-[80%] ${
                  isMe
                    ? 'bg-purple-600 text-white rounded-br-none'
                    : 'bg-[#181d38] text-slate-200 border border-slate-800 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Action buttons */}
      <div className="p-3 bg-[#141830] border-t border-slate-800 flex gap-2">
        {onConfirmTrade && (
          <button
            type="button"
            onClick={() => {
              playTradeSuccessSound();
              onConfirmTrade();
            }}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-game font-bold text-[10px] uppercase rounded-xl transition-all"
          >
            Confirm In-Game Trade
          </button>
        )}
        {(onCancelTrade || onRejectTrade) && (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              if (onRejectTrade) onRejectTrade('Cancelled by participant');
              else if (onCancelTrade) onCancelTrade();
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-game font-bold text-[10px] uppercase rounded-xl transition-all"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Input row */}
      <form onSubmit={handleSend} className="p-3 bg-[#0e1224] border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message or share Roblox username..."
          className="flex-1 px-3.5 py-2 bg-[#141830] border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-400 font-sans"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-game font-bold text-xs uppercase rounded-xl transition-all disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
};
