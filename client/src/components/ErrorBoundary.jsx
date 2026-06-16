import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-[#1c1c1c] border border-red-500/20 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-6">
            <div className="inline-flex p-4 bg-red-500/10 rounded-full text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Something went wrong</h1>
              <p className="text-sm text-zinc-400">
                An unexpected error occurred in the application. Please try reloading.
              </p>
            </div>

            {this.state.error && (
              <pre className="text-left bg-[#0a0a0a] border border-zinc-800 p-4 rounded-lg text-xs text-red-400 font-mono overflow-x-auto max-h-40 custom-scrollbar">
                {this.state.error.toString()}
              </pre>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-amber-500 text-[#0a0a0a] font-extrabold tracking-wide rounded-md flex justify-center items-center hover:bg-amber-400 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Reload Page
              </button>
              <a
                href="/"
                className="flex-1 py-3 border border-zinc-700 text-zinc-300 font-bold tracking-wide rounded-md flex justify-center items-center hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <Home className="w-4 h-4 mr-2" /> Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
