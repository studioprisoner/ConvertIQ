import { createTRPCRouter } from './server';
import { urlRouter } from './routers/urls';
import { aiAnalysisRouter } from './routers/ai-analysis';
import { reportsRouter } from './routers/reports-simple';
import { websitesRouter } from './routers/websites';
import { userRouter } from './routers/user';

/**
 * Main tRPC router for the application.
 * All routers should be added here.
 */
export const appRouter = createTRPCRouter({
  url: urlRouter,
  ai: aiAnalysisRouter,
  reports: reportsRouter,
  websites: websitesRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;