import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { getUserSubscription } from '@/lib/subscription-service';
import { handleTrpcError, addBreadcrumb } from '@/lib/sentry-utils';
import { db } from '@/db/connection';

// Create tRPC context
export const createTRPCContext = async (opts: { req?: Request }) => {
  const session = opts.req 
    ? await auth.api.getSession({ headers: opts.req.headers })
    : null;

  return {
    req: opts.req,
    session,
    user: session?.user || null,
    db,
  };
};

// Initialize tRPC with enhanced error handling
const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    // Log tRPC errors to Sentry
    handleTrpcError(error, shape.data?.path || 'unknown', shape.data);
    
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Export router and procedure helpers
export const createTRPCRouter = t.router;

// Add middleware to track tRPC calls
const loggingMiddleware = t.middleware(async ({ ctx, type, path, input, next }) => {
  const start = Date.now();
  
  // Add breadcrumb for the tRPC call
  addBreadcrumb(
    `tRPC ${type}: ${path}`,
    'trpc.call',
    { 
      type,
      path,
      userId: ctx.user?.id,
      hasInput: !!input 
    }
  );

  const result = await next();
  const duration = Date.now() - start;

  // Add breadcrumb for successful completion
  if (result.ok) {
    addBreadcrumb(
      `tRPC ${type}: ${path} completed`,
      'trpc.success',
      { 
        type,
        path,
        duration,
        userId: ctx.user?.id
      }
    );
  }

  return result;
});

export const publicProcedure = t.procedure.use(loggingMiddleware);

// In-memory cache for subscription data (short TTL to balance performance and freshness)
const subscriptionCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(loggingMiddleware).use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  // Check cache first for subscription data
  const cacheKey = `subscription:${ctx.user.id}`;
  const cached = subscriptionCache.get(cacheKey);
  
  let subscription;
  if (cached && cached.expiry > Date.now()) {
    subscription = cached.data;
  } else {
    // Get user's subscription data for plan validation
    subscription = await getUserSubscription(ctx.user.id);
    
    // Cache the result
    subscriptionCache.set(cacheKey, {
      data: subscription,
      expiry: Date.now() + CACHE_TTL
    });
  }
  
  const userPlan = subscription?.plan?.slug || 'basic';

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
      subscription,
      userPlan,
      db: ctx.db,
    },
  });
});