import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type NextRequest } from 'next/server';
import { appRouter } from '@/lib/trpc/root';
import { createTRPCContext } from '@/lib/trpc/server';

// The comprehensive analysis runs real Anthropic calls and can exceed a minute.
// Set the timeout on the route segment itself — the vercel.json glob wasn't
// reliably applying the override and the function was killed at the 30s default
// (CON-118). Must be >= the analysis TOTAL_TIMEOUT (75s).
export const maxDuration = 90;

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };