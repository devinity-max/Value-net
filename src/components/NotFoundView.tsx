import React from 'react';

export const NotFoundView: React.FC<{ onReturnHome: () => void }> = ({ onReturnHome }) => {
  return (
    <div className="pt-32 pb-20 px-4 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl font-black text-amber-400 mx-auto mb-4 font-mono">
        404
      </div>
      <h1 className="text-2xl font-black text-white font-mono uppercase mb-2">PAGE NOT FOUND</h1>
      <p className="text-xs text-slate-400 mb-6">
        The realm or trade chamber you are looking for does not exist in VALUE.NET.
      </p>
      <button
        onClick={onReturnHome}
        className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
      >
        Return to Trade Calculator
      </button>
    </div>
  );
};
