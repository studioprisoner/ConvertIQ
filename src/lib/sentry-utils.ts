import * as Sentry from "@sentry/nextjs";

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  url?: string;
  component?: string;
  action?: string;
  additionalData?: Record<string, any>;
}

/**
 * Enhanced error capture with context - DISABLED in development
 */
export function captureErrorWithContext(error: Error, context: ErrorContext = {}) {
  // DISABLED: Skip Sentry capture in development to reduce console noise
  if (process.env.NODE_ENV === 'development') {
    console.error('Error (Sentry disabled in dev):', error, context);
    return;
  }

  return Sentry.captureException(error, {
    tags: {
      component: context.component,
      action: context.action,
    },
    user: {
      id: context.userId,
      email: context.userEmail,
    },
    extra: {
      url: context.url,
      ...context.additionalData,
    },
  });
}

/**
 * Capture message with context for non-error events - DISABLED in development
 */
export function captureMessageWithContext(
  message: string, 
  level: Sentry.SeverityLevel = 'info',
  context: ErrorContext = {}
) {
  // DISABLED: Skip Sentry capture in development to reduce console noise
  if (process.env.NODE_ENV === 'development') {
    console.log(`Message (Sentry disabled in dev) [${level}]:`, message, context);
    return;
  }

  return Sentry.captureMessage(message, {
    level,
    tags: {
      component: context.component,
      action: context.action,
    },
    user: {
      id: context.userId,
      email: context.userEmail,
    },
    extra: {
      url: context.url,
      ...context.additionalData,
    },
  });
}

/**
 * Set user context for the current session - DISABLED in development
 */
export function setUserContext(user: { id: string; email?: string; name?: string }) {
  // DISABLED: Skip Sentry user context in development
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

/**
 * Add breadcrumb for tracking user actions - DISABLED in development
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  // DISABLED: Skip Sentry breadcrumbs in development
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Performance monitoring wrapper for async functions - DISABLED in development
 */
export function withSentryTracing<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string,
  description?: string
): T {
  // DISABLED: Skip Sentry tracing in development
  if (process.env.NODE_ENV === 'development') {
    return fn;
  }

  return (async (...args: Parameters<T>) => {
    return await Sentry.startSpan(
      {
        name: operationName,
        op: 'function',
        description,
      },
      async () => {
        try {
          return await fn(...args);
        } catch (error) {
          Sentry.captureException(error, {
            tags: { operation: operationName },
            extra: { args: args.length > 0 ? args : undefined },
          });
          throw error;
        }
      }
    );
  }) as T;
}

/**
 * API route error handler
 */
export function handleApiError(error: unknown, context: ErrorContext = {}) {
  if (error instanceof Error) {
    captureErrorWithContext(error, {
      ...context,
      component: context.component || 'api-route',
    });
  } else {
    captureMessageWithContext(
      `Unknown error: ${String(error)}`,
      'error',
      context
    );
  }
}

/**
 * tRPC error handler
 */
export function handleTrpcError(error: unknown, procedure: string, input?: any) {
  const context: ErrorContext = {
    component: 'trpc',
    action: procedure,
    additionalData: { input },
  };

  if (error instanceof Error) {
    captureErrorWithContext(error, context);
  } else {
    captureMessageWithContext(
      `tRPC error in ${procedure}: ${String(error)}`,
      'error',
      context
    );
  }
}