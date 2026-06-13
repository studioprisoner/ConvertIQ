import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiAnalysisRouter } from '../ai-analysis';
import { reportsRouter } from '../reports-simple';
import { urlRouter } from '../urls';
import { db } from '@/db/connection';

// Mock the database connection used by ai-analysis.ts
vi.mock('@/db/connection', () => {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'leftJoin', 'insert', 'values', 'returning', 'update', 'set'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = undefined; // configured per-test via setDbQueue
  return { db: chain };
});

// protectedProcedure fetches the caller's subscription — keep it off the db mock
vi.mock('@/lib/subscription-service', () => ({
  getUserSubscription: vi.fn().mockResolvedValue(null),
  trackUsage: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Queue results for successive awaited query chains. Each await consumes the
 * next entry; the last entry repeats if more queries run than were queued.
 */
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
const ANALYSIS_ID = '96fa66e1-860b-4fe1-8056-f592704ed55f';

const authedCtx = {
  req: undefined,
  session: { id: 'session-1', userId: USER_ID },
  user: { id: USER_ID, email: 'owner@example.com', name: 'Owner' },
  db: db as any,
} as any;

const anonCtx = {
  req: undefined,
  session: null,
  user: null,
  db: db as any,
} as any;

describe('ai-analysis router — auth, ownership, and JSON.parse resilience (CON-92, CON-102)', () => {
  const caller = aiAnalysisRouter.createCaller(authedCtx);
  const anonCaller = aiAnalysisRouter.createCaller(anonCtx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication (CON-102)', () => {
    it('getLatestAnalysis rejects unauthenticated callers', async () => {
      await expect(anonCaller.getLatestAnalysis({ websiteId: WEBSITE_ID })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('getWebsiteAnalyses rejects unauthenticated callers', async () => {
      await expect(anonCaller.getWebsiteAnalyses({ websiteId: WEBSITE_ID })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('getAnalysisById rejects unauthenticated callers', async () => {
      await expect(anonCaller.getAnalysisById({ analysisId: ANALYSIS_ID })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('ownership (CON-102)', () => {
    it('getLatestAnalysis returns null for a website the caller does not own', async () => {
      // First query = ownership pre-check on websites → empty
      setDbQueue([]);

      const result = await caller.getLatestAnalysis({ websiteId: WEBSITE_ID });

      expect(result).toBeNull();
    });

    it('getWebsiteAnalyses returns [] for a website the caller does not own', async () => {
      setDbQueue([]);

      const result = await caller.getWebsiteAnalyses({ websiteId: WEBSITE_ID });

      expect(result).toEqual([]);
    });

    it("getAnalysisById reports not-found when the analysis belongs to another user's website", async () => {
      setDbQueue([
        { analysis: '{"score": 5}', rawData: '{}', website: { userId: 'someone-else', url: 'https://example.com' } },
      ]);

      await expect(caller.getAnalysisById({ analysisId: ANALYSIS_ID })).rejects.toThrow(/Analysis not found/);
    });
  });

  describe('getLatestAnalysis — JSON resilience (CON-92)', () => {
    it('returns null instead of throwing when aiAnalysis is malformed JSON', async () => {
      setDbQueue(
        [{ id: WEBSITE_ID }], // ownership pre-check passes
        [{ id: ANALYSIS_ID, aiAnalysis: '{"overallScore": 7, TRUNCATED' }]
      );

      const result = await caller.getLatestAnalysis({ websiteId: WEBSITE_ID });

      expect(result).toBeNull();
    });

    it('still parses valid JSON normally', async () => {
      setDbQueue(
        [{ id: WEBSITE_ID }],
        [{ id: ANALYSIS_ID, aiAnalysis: '{"overallScore": 7}' }]
      );

      const result = await caller.getLatestAnalysis({ websiteId: WEBSITE_ID });

      expect(result).toEqual({ overallScore: 7 });
    });
  });

  describe('getWebsiteAnalyses — JSON resilience (CON-92)', () => {
    it('returns the corrupted row with aiAnalysis undefined while other rows parse', async () => {
      setDbQueue(
        [{ id: WEBSITE_ID }], // ownership pre-check passes
        [
          { id: 'a-good', status: 'completed', createdAt: new Date('2026-01-01'), aiAnalysis: '{"overallScore": 8}' },
          { id: 'a-bad', status: 'completed', createdAt: new Date('2026-01-02'), aiAnalysis: 'not json at all' },
        ]
      );

      const result = await caller.getWebsiteAnalyses({ websiteId: WEBSITE_ID });

      expect(result).toHaveLength(2);
      expect(result[0].aiAnalysis).toEqual({ overallScore: 8 });
      expect(result[1].aiAnalysis).toBeUndefined();
    });
  });

  describe('retrigger procedures — auth and ownership (CON-103)', () => {
    const WEBSITE_INPUT = { analysisId: ANALYSIS_ID, websiteId: WEBSITE_ID };

    it('all four retrigger procedures reject unauthenticated callers', async () => {
      await expect(anonCaller.retriggerConversionAnalysis(WEBSITE_INPUT)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      await expect(anonCaller.retriggerUXAnalysis(WEBSITE_INPUT)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      await expect(anonCaller.retriggerSEOAnalysis({ analysisId: ANALYSIS_ID })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      await expect(anonCaller.retriggerFailedSections(WEBSITE_INPUT)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('retriggerConversionAnalysis reports not-found for an analysis the caller does not own', async () => {
      setDbQueue([]); // ownership join finds nothing
      await expect(caller.retriggerConversionAnalysis(WEBSITE_INPUT)).rejects.toThrow(/Analysis not found/);
    });

    it('retriggerSEOAnalysis reports not-found for an unowned analysis (no websiteId input)', async () => {
      setDbQueue([]);
      await expect(caller.retriggerSEOAnalysis({ analysisId: ANALYSIS_ID })).rejects.toThrow(/Analysis not found/);
    });

    it('retriggerFailedSections succeeds for an owned analysis', async () => {
      setDbQueue([{ id: ANALYSIS_ID }]); // ownership check passes
      const result = await caller.retriggerFailedSections(WEBSITE_INPUT);
      expect(result.success).toBe(true);
      expect(result.analysisId).toBe(ANALYSIS_ID);
    });
  });

  describe('AI-spend and embedding endpoints — auth (CON-104)', () => {
    // Minimal object satisfying crawlResultSchema (src/lib/crawler/types.ts)
    const minimalCrawlData = {
      url: 'https://example.com',
      timestamp: new Date('2026-01-01T00:00:00Z').toISOString(),
      statusCode: 200,
      htmlAnalysis: {
        meta: {},
        headings: [],
        images: [],
        links: [],
        forms: [],
        ctas: [],
        structure: {
          hasHeader: true,
          hasNavigation: true,
          hasFooter: true,
          hasSidebar: false,
          hasHeroSection: true,
          sectionsCount: 3,
          wordCount: 500,
        },
      },
      cssAnalysis: {
        externalStylesheets: [],
        hasInlineStyles: false,
        frameworks: [],
        responsive: { hasViewportMeta: true, hasMediaQueries: true },
      },
      performance: {
        loadTime: 1000,
        htmlSize: 50000,
        totalResourcesCount: 10,
        imagesWithoutAlt: 0,
        imagesWithoutSize: 0,
        externalResourcesCount: 5,
      },
      errors: [],
    };

    it('analyze rejects unauthenticated callers', async () => {
      await expect(
        anonCaller.analyze({ crawlData: minimalCrawlData, websiteId: WEBSITE_ID })
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it("analyze refuses a websiteId the caller doesn't own", async () => {
      setDbQueue([]); // ownership pre-check finds nothing
      await expect(
        caller.analyze({ crawlData: minimalCrawlData, websiteId: WEBSITE_ID })
      ).rejects.toThrow(/Website not found/);
    });

    it('generateEmbedding and backfillEmbeddings reject unauthenticated callers', async () => {
      await expect(anonCaller.backfillEmbeddings()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('url.crawl and url.crawlEnhanced reject unauthenticated callers', async () => {
      const anonUrlCaller = urlRouter.createCaller(anonCtx);
      await expect(anonUrlCaller.crawl({ url: 'https://example.com' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      await expect(anonUrlCaller.crawlEnhanced({ url: 'https://example.com' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      await expect(anonUrlCaller.validate({ url: 'https://example.com' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('reports.retriggerAnalysis — auth and ownership (CON-103, the live mutation)', () => {
    const reportsCaller = reportsRouter.createCaller(authedCtx);
    const anonReportsCaller = reportsRouter.createCaller(anonCtx);

    it('rejects unauthenticated callers', async () => {
      await expect(anonReportsCaller.retriggerAnalysis({ analysisId: ANALYSIS_ID })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('returns NOT_FOUND for an analysis the caller does not own (same as missing)', async () => {
      setDbQueue([]); // ownership join finds nothing
      await expect(reportsCaller.retriggerAnalysis({ analysisId: ANALYSIS_ID })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('retriggers an owned pending/failed analysis', async () => {
      setDbQueue(
        [{ id: ANALYSIS_ID, websiteId: WEBSITE_ID, status: 'failed', errorMessage: 'boom' }], // owned lookup
        [{ id: ANALYSIS_ID, status: 'pending' }] // update().returning()
      );
      const result = await reportsCaller.retriggerAnalysis({ analysisId: ANALYSIS_ID });
      expect(result.analysisId).toBe(ANALYSIS_ID);
      expect(result.status).toBe('pending');
    });

    it('refuses to retrigger a completed analysis (owned)', async () => {
      setDbQueue([{ id: ANALYSIS_ID, websiteId: WEBSITE_ID, status: 'completed', errorMessage: null }]);
      await expect(reportsCaller.retriggerAnalysis({ analysisId: ANALYSIS_ID })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });
  });

  describe('getAnalysisById — JSON resilience (CON-92)', () => {
    it('throws the controlled "Analysis not found" error (not a SyntaxError) when analysis JSON is malformed', async () => {
      setDbQueue([
        { analysis: '{"broken":', rawData: '{}', website: { userId: USER_ID, url: 'https://example.com' } },
      ]);

      await expect(caller.getAnalysisById({ analysisId: ANALYSIS_ID })).rejects.toThrow(/Analysis not found/);
    });

    it('returns parsed analysis and crawlData for valid JSON owned by the caller', async () => {
      setDbQueue([
        { analysis: '{"score": 5}', rawData: '{"url": "https://example.com"}', website: { userId: USER_ID, url: 'https://example.com' } },
      ]);

      const result = await caller.getAnalysisById({ analysisId: ANALYSIS_ID });

      expect(result.analysis).toEqual({ score: 5 });
      expect(result.crawlData).toEqual({ url: 'https://example.com' });
    });
  });
});
