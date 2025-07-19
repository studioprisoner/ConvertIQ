import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

// Create tRPC context
export const createTRPCContext = async (opts: { req?: Request }) => {
  return {
    req: opts.req,
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