import { createTRPCRouter } from './server';
import { urlRouter } from './routers/urls';

/**
 * Main tRPC router for the application.
 * All routers should be added here.
 */
export const appRouter = createTRPCRouter({
  url: urlRouter,
});

export type AppRouter = typeof appRouter;