import * as Sentry from "@sentry/nextjs";

// DISABLED: Skip Sentry initialization in development to reduce console noise
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Production-only sample rates
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,

    // Session Replay configuration
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    debug: false,

    beforeSend(event, hint) {
      // Don't send console.log errors
      if (event.logger === 'console') {
        return null;
      }
      // Filter out low-priority events
      if (event.level === 'info' || event.level === 'debug') {
        return null;
      }
      return event;
    },

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
        // Privacy-focused settings for production
        mask: ['[data-sentry-mask]', '.sensitive-data'],
        block: ['[data-sentry-block]'],
      }),
      Sentry.browserTracingIntegration({
        // Track navigation and interactions
        enableInp: true,
      }),
    ],

    // Add user context and tags
    initialScope: {
      tags: {
        component: 'client',
      },
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;