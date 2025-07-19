import { createTRPCRouter } from './server';
import { urlRouter } from './routers/urls';
import { aiAnalysisRouter } from './routers/ai-analysis';
import { reportsRouter } from './routers/reports-simple';

/**
 * Main tRPC router for the application.
 * All routers should be added here.
 */
export const appRouter = createTRPCRouter({
  url: urlRouter,
  ai: aiAnalysisRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;