'use client';

import { ErrorBoundary } from "@sentry/react";
import { ReactNode, Component, ErrorInfo } from "react";

interface SentryErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
}

// Simple error boundary for development (no Sentry)
class SimpleErrorBoundary extends Component<{children: ReactNode, fallback: React.ComponentType<any>}, {hasError: boolean}> {
  constructor(props: {children: ReactNode, fallback: React.ComponentType<any>}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      return <Fallback />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-gray-900 text-center mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 text-center mb-4">
          We apologize for the inconvenience. An error has occurred and has been reported to our team.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

export function SentryErrorBoundary({ children, fallback: Fallback = DefaultErrorFallback }: SentryErrorBoundaryProps) {
  // DISABLED: Use simple error boundary in development to reduce Sentry noise
  if (process.env.NODE_ENV === 'development') {
    return (
      <SimpleErrorBoundary fallback={Fallback}>
        {children}
      </SimpleErrorBoundary>
    );
  }

  // Use Sentry error boundary only in production
  return (
    <ErrorBoundary fallback={Fallback} showDialog>
      {children}
    </ErrorBoundary>
  );
}