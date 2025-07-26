import { NextResponse } from 'next/server';
import { 
  handleApiError, 
  addBreadcrumb, 
  captureMessageWithContext,
  setUserContext 
} from '@/lib/sentry-utils';

export async function GET() {
  try {
    // Test breadcrumb functionality
    addBreadcrumb('Sentry test endpoint called', 'api.test', {
      endpoint: '/api/test-sentry-error',
      timestamp: new Date().toISOString()
    });

    // Test user context (mock user for testing)
    setUserContext({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User'
    });

    // Test message capture
    captureMessageWithContext(
      'Testing Sentry message capture',
      'info',
      {
        component: 'sentry-test',
        action: 'message-test',
        additionalData: { testType: 'info-message' }
      }
    );

    // Simulate some processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Intentionally throw an error for testing
    throw new Error('Enhanced Sentry test error with full context');
    
  } catch (error) {
    console.error('API Error:', error);
    
    // Use enhanced error handling
    handleApiError(error, {
      component: 'sentry-test-endpoint',
      action: 'error-simulation',
      url: '/api/test-sentry-error',
      additionalData: {
        testRun: true,
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json(
      { 
        error: 'Enhanced Sentry test error occurred',
        message: 'This error was captured with full context and breadcrumbs'
      },
      { status: 500 }
    );
  }
}