'use client';
// NOTE: ErrorBoundary is intentionally a class component (React requirement).
// The 'use client' directive is correct here IF ever migrated to App Router;
// for now it is harmless in Pages Router.
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children?: ReactNode;
  /**
   * When `resetKey` changes, the error boundary automatically resets.
   * Pass `router.asPath` to reset on navigation.
   */
  resetKey?: string;
  /** Optional fallback UI to render instead of the default error screen. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Structured error log — easy to hook into Sentry/Datadog later
    const errorReport = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
    };
    console.error('[ErrorBoundary] Uncaught error:', errorReport);

    // TODO: Send to error tracking service
    // Sentry.captureException(error, { extra: errorInfo });
  }

  public componentDidUpdate(prevProps: Props) {
    // Auto-reset when the resetKey changes (e.g., on route change)
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
          <div className="max-w-md w-full bg-white border border-stone-200 p-8 rounded-2xl shadow-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-stone-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-stone-500 mb-8 leading-relaxed">
              We encountered an unexpected error. Please try refreshing the page or going back home.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold transition-colors text-sm"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl font-semibold transition-colors text-sm"
              >
                <Home size={14} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
