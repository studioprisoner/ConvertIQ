import * as Sentry from "@sentry/nextjs";
import { validateEnv } from "./src/lib/env-validation";

export async function register() {
  // Validate environment variables at startup
  try {
    validateEnv();
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast on invalid environment
      process.exit(1);
    }
  }
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV !== 'production',
      
      beforeSend(event, hint) {
        // Filter out development errors in production
        if (process.env.NODE_ENV === 'production' && event.level === 'info') {
          return null;
        }
        return event;
      },

      integrations: [
        Sentry.httpIntegration(),
        Sentry.prismaIntegration(),
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV !== 'production',
      
      beforeSend(event, hint) {
        if (process.env.NODE_ENV === 'production' && event.level === 'info') {
          return null;
        }
        return event;
      },
    });
  }
}

export const onRequestError = Sentry.captureRequestError;