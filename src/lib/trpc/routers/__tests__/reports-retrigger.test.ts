import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reportsRouter } from '../reports';

// protectedProcedure loads the caller's subscription
vi.mock('@/lib/subscription-service', () => ({
  getUserSubscription: vi.fn().mockResolvedValue(null),
  trackUsage: vi.fn().mockResolvedValue(undefined),
}));

// A chainable, thenable mock db passed in via ctx (reports.ts uses ctx.db).
function makeMockDb() {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'leftJoin', 'limit', 'update', 'set', 'returning']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = undefined;
  return chain as any;
}

const USER_ID = 'user-owner-123';
const ANALYSIS_ID = '96fa66e1-860b-4fe1-8056-f592704ed55f';
const WEBSITE_ID = '0603c79d-3955-4d2b-bcb9-708ce018c968';

function setQueue(db: any, ...resultSets: unknown[][]) {
  const queue = [...resultSets];
  db.then = (resolve: (value: unknown) => void) => {
    const rows = queue.length > 1 ? queue.shift() : queue[0];
    resolve(rows);
    return Promise.resolve(rows);
  };
}

describe('reports.retriggerAnalysis — auth + ownership + status (CON-113)', () => {
  let db: any;
  let caller: ReturnType<typeof reportsRouter.createCaller>;
  let anonCaller: ReturnType<typeof reportsRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockDb();
    caller = reportsRouter.createCaller({
      req: undefined,
      session: { id: 's1', userId: USER_ID },
      user: { id: USER_ID, email: 'owner@example.com', name: 'Owner' },
      db,
    } as any);
    anonCaller = reportsRouter.createCaller({ req: undefined, session: null, user: null, db } as any);
  });

  it('rejects unauthenticated callers', async () => {
    await expect(anonCaller.retriggerAnalysis({ analysisId: ANALYSIS_ID })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('returns NOT_FOUND for an analysis the caller does not own (same as missing)', async () => {
    setQueue(db, []); // ownership join finds nothing
    await expect(caller.retriggerAnalysis({ analysisId: ANALYSIS_ID })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('retriggers an owned failed analysis (resets to pending)', async () => {
    setQueue(
      db,
      [{ id: ANALYSIS_ID, websiteId: WEBSITE_ID, status: 'failed' }], // owned lookup
      [{ id: ANALYSIS_ID, status: 'pending' }] // update().returning()
    );
    const result = await caller.retriggerAnalysis({ analysisId: ANALYSIS_ID });
    expect(result.analysisId).toBe(ANALYSIS_ID);
    expect(result.status).toBe('pending');
  });

  it('refuses to retrigger a completed analysis (BAD_REQUEST)', async () => {
    setQueue(db, [{ id: ANALYSIS_ID, websiteId: WEBSITE_ID, status: 'completed' }]);
    await expect(caller.retriggerAnalysis({ analysisId: ANALYSIS_ID })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });
});
