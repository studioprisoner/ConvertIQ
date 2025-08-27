import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Validate environment variables at startup (only in Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { validateEnv } = await import("./src/config/env-validation");
      validateEnv();
    } catch (error) {
      console.error('❌ Environment validation failed:', error);
      if (process.env.NODE_ENV === 'production') {
        // In production, fail fast on invalid environment
        throw new Error('Environment validation failed');
      }
    }
  }
  // DISABLED: Skip Sentry initialization in development to reduce console noise
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      debug: false,
      
      beforeSend(event, hint) {
        // Filter out development errors in production
        if (event.level === 'info') {
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

  // DISABLED: Skip Sentry initialization in development to reduce console noise
  if (process.env.NEXT_RUNTIME === 'edge' && process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
      debug: false,
      
      beforeSend(event, hint) {
        if (event.level === 'info') {
          return null;
        }
        return event;
      },
    });
  }
}

export const onRequestError = Sentry.captureRequestError;