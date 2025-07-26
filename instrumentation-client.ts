import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  
  // Adjust sample rates based on environment
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay configuration
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.5,
  replaysOnErrorSampleRate: 1.0,

  debug: process.env.NODE_ENV !== 'production',

  beforeSend(event, hint) {
    // Filter out noise in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send console.log errors
      if (event.logger === 'console') {
        return null;
      }
      // Filter out low-priority events
      if (event.level === 'info' || event.level === 'debug') {
        return null;
      }
    }
    return event;
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
      // Privacy-focused settings for production
      maskTextSelectors: ['[data-sentry-mask]', '.sensitive-data'],
      blockSelector: '[data-sentry-block]',
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;