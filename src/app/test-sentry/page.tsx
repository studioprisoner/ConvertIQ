'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/react';

export default function TestSentryPage() {
  const [error, setError] = useState<string>('');

  const testClientError = () => {
    try {
      throw new Error('Test client-side error for Sentry');
    } catch (error) {
      Sentry.captureException(error);
      setError('Client error captured and sent to Sentry');
    }
  };

  const testApiError = async () => {
    try {
      const response = await fetch('/api/test-sentry-error');
      if (!response.ok) {
        throw new Error('API test failed');
      }
      setError('API error test completed - check Sentry dashboard');
    } catch (error) {
      Sentry.captureException(error);
      setError('API error captured and sent to Sentry');
    }
  };

  const testUserContext = () => {
    Sentry.setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser'
    });
    
    Sentry.addBreadcrumb({
      message: 'User context test',
      level: 'info',
      category: 'test'
    });

    Sentry.captureMessage('Test message with user context', 'info');
    setError('User context and message sent to Sentry');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Sentry Integration Test
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Test Sentry Error Tracking
            </h2>
            <p className="text-gray-600 mb-4">
              Use these buttons to test different types of error tracking with Sentry.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={testClientError}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Test Client Error
            </button>

            <button
              onClick={testApiError}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test API Error
            </button>

            <button
              onClick={testUserContext}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Test User Context
            </button>
          </div>

          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">{error}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Click the buttons above to generate test errors</li>
              <li>Check your Sentry dashboard to verify errors are being captured</li>
              <li>Verify source maps are working for stack traces</li>
              <li>Check that user context and breadcrumbs are included</li>
            </ol>
          </div>

          <div className="border-t pt-4">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}