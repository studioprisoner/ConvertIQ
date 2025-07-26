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
 * Enhanced error capture with context
 */
export function captureErrorWithContext(error: Error, context: ErrorContext = {}) {
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
 * Capture message with context for non-error events
 */
export function captureMessageWithContext(
  message: string, 
  level: Sentry.SeverityLevel = 'info',
  context: ErrorContext = {}
) {
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
 * Set user context for the current session
 */
export function setUserContext(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

/**
 * Add breadcrumb for tracking user actions
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Performance monitoring wrapper for async functions
 */
export function withSentryTracing<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string,
  description?: string
): T {
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