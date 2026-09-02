import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VALUE.NET ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 mx-auto max-w-lg rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-2xl">warning</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            {this.props.moduleName || 'Component'} Encountered an Issue
          </h3>
          <p className="text-xs text-rose-300/80 mb-4">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Try Reloading Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
