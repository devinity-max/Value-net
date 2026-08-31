import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught component error in', this.props.moduleName, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-[#12162d] border border-rose-500/50 rounded-2xl text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-950/80 border border-rose-500 flex items-center justify-center text-rose-400">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
          <h2 className="text-xl font-black font-game text-white mb-2">
            Module Encountered an Issue
          </h2>
          <p className="text-sm text-slate-400 mb-6 font-sans">
            {this.props.moduleName || 'This section'} encountered an unexpected runtime error.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-game text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
          >
            Reload Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
