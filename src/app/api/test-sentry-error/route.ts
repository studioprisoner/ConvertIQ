import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    // Simulate some processing
    Sentry.addBreadcrumb({
      message: 'API test endpoint called',
      level: 'info',
      category: 'api'
    });

    // Intentionally throw an error for testing
    throw new Error('Test API error for Sentry monitoring');
    
  } catch (error) {
    console.error('API Error:', error);
    Sentry.captureException(error);
    
    return NextResponse.json(
      { error: 'Test API error occurred' },
      { status: 500 }
    );
  }
}