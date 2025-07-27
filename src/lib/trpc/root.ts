import { createTRPCRouter } from './server';
import { urlRouter } from './routers/urls';
import { aiAnalysisRouter } from './routers/ai-analysis';
import { reportsRouter } from './routers/reports';
import { websitesRouter } from './routers/websites';
import { userRouter } from './routers/user';
import { searchRouter } from './routers/search';

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
  search: searchRouter,
});

export type AppRouter = typeof appRouter;