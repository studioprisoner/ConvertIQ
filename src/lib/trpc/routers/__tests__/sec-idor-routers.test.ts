import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchRouter } from '../search';
import { streamingAnalysisRouter } from '../streaming-analysis';
import { db } from '@/db/connection';

// Mock the db connection (used by the streaming ownership checks)
vi.mock('@/db/connection', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = undefined; // configured per-test
  return { db: chain };
});

// protectedProcedure loads the caller's subscription — keep it off the db mock
vi.mock('@/lib/subscription-service', () => ({
  getUserSubscription: vi.fn().mockResolvedValue(null),
  trackUsage: vi.fn().mockResolvedValue(undefined),
}));

// Heavy service deps — mocked so importing the routers stays cheap. Anon callers
// never reach these (protectedProcedure rejects first); ownership-denied callers
// throw before reaching them too.
vi.mock('@/lib/search/vector-search', () => ({
  vectorSearchService: {
    findSimilarReports: vi.fn(),
    keywordSearch: vi.fn(),
    findSimilarRecommendations: vi.fn(),
    searchByEmbedding: vi.fn(),
    getStatsWithoutEmbeddings: vi.fn(),
  },
}));

function setDbQueue(...resultSets: unknown[][]) {
  const queue = [...resultSets];
  (db as any).then = (resolve: (value: unknown) => void) => {
    const rows = queue.length > 1 ? queue.shift() : queue[0];
    resolve(rows);
    return Promise.resolve(rows);
  };
}

const USER_ID = 'user-owner-123';
const WEBSITE_ID = '0603c79d-3955-4d2b-bcb9-708ce018c968';

const authedCtx = {
  req: undefined,
  session: { id: 'session-1', userId: USER_ID },
  user: { id: USER_ID, email: 'owner@example.com', name: 'Owner' },
  db: db as any,
} as any;

const anonCtx = { req: undefined, session: null, user: null, db: db as any } as any;

describe('search router — auth (CON-111)', () => {
  const anon = searchRouter.createCaller(anonCtx);

  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated callers across all procedures', async () => {
    await expect(anon.searchReports({ query: 'x' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.findSimilarReports({ reportId: 'r1' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.advancedSearch({ embedding: [0.1] })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.getRecommendationClusters({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.expandedSearch({ query: 'x' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.getSearchStats({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('no longer accepts a caller-supplied userId (input schema rejects it)', async () => {
    // userId is no longer in the schema — passing it is an excess property the
    // typed client wouldn't send; the point is the handler uses ctx.user.id only.
    const caller = searchRouter.createCaller(authedCtx);
    const { vectorSearchService } = await import('@/lib/search/vector-search');
    (vectorSearchService.getStatsWithoutEmbeddings as any).mockResolvedValue({ totalReports: 0, averageScore: 0 });
    await caller.getSearchStats({});
    // the service was called with the SESSION user id, never a caller-supplied one
    expect(vectorSearchService.getStatsWithoutEmbeddings).toHaveBeenCalledWith(USER_ID);
  });

  it('findSimilarReports scopes to the session user (CON-24 IDOR fix)', async () => {
    // Cross-tenant guard: the reportId comes from the caller, but the service
    // must receive the SESSION user id so similarity is restricted to the
    // caller's own analyses and a foreign reportId cannot leak other users' data.
    const caller = searchRouter.createCaller(authedCtx);
    const { vectorSearchService } = await import('@/lib/search/vector-search');
    (vectorSearchService.findSimilarRecommendations as any).mockResolvedValue([]);
    await caller.findSimilarReports({ reportId: 'r1', limit: 5 });
    expect(vectorSearchService.findSimilarRecommendations).toHaveBeenCalledWith('r1', USER_ID, 5);
  });
});

describe('streaming-analysis router — auth + ownership (CON-111)', () => {
  const caller = streamingAnalysisRouter.createCaller(authedCtx);
  const anon = streamingAnalysisRouter.createCaller(anonCtx);

  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated callers', async () => {
    await expect(anon.prepareCrawlData({ websiteId: WEBSITE_ID })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      anon.saveStreamingResults({
        websiteId: WEBSITE_ID,
        analysisType: 'comprehensive',
        results: {},
        metadata: { processingTime: 1, modelUsed: 'm', confidence: 1 },
      })
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.getStreamingHistory({ websiteId: WEBSITE_ID })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('prepareCrawlData rejects a website the caller does not own (NOT_FOUND)', async () => {
    setDbQueue([]); // ownership lookup finds nothing
    await expect(caller.prepareCrawlData({ websiteId: WEBSITE_ID })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('saveStreamingResults rejects a website the caller does not own (NOT_FOUND)', async () => {
    setDbQueue([]);
    await expect(
      caller.saveStreamingResults({
        websiteId: WEBSITE_ID,
        analysisType: 'comprehensive',
        results: {},
        metadata: { processingTime: 1, modelUsed: 'm', confidence: 1 },
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('getStreamingHistory rejects a website the caller does not own (NOT_FOUND)', async () => {
    setDbQueue([]);
    await expect(caller.getStreamingHistory({ websiteId: WEBSITE_ID })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
