import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { auth } from '@/lib/auth';
import { getUserSubscription } from '@/lib/subscription-service';
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

// Initialize tRPC
const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
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
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  // Get user's subscription data for plan validation
  const subscription = await getUserSubscription(ctx.user.id);
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