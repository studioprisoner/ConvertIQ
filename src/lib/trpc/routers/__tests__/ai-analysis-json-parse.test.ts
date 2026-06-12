import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiAnalysisRouter } from '../ai-analysis';
import { db } from '@/db/connection';

// Mock the database connection used by ai-analysis.ts
vi.mock('@/db/connection', () => {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'leftJoin', 'insert', 'values', 'returning', 'update', 'set'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Drizzle query builders are thenables — resolve with whatever rows the test configured
  chain.then = undefined; // set per-test via __setRows
  return { db: chain };
});

/** Configure what the next awaited query chain resolves to. */
function setDbRows(rows: unknown[]) {
  (db as any).then = (resolve: (value: unknown) => void) => {
    resolve(rows);
    return Promise.resolve(rows);
  };
}

describe('ai-analysis router — JSON.parse resilience on corrupted DB rows (CON-92)', () => {
  const caller = aiAnalysisRouter.createCaller({
    req: undefined,
    session: null,
    user: null,
    db: db as any,
  } as any);

  const WEBSITE_ID = '0603c79d-3955-4d2b-bcb9-708ce018c968';
  const ANALYSIS_ID = '96fa66e1-860b-4fe1-8056-f592704ed55f';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLatestAnalysis', () => {
    it('returns null instead of throwing when aiAnalysis is malformed JSON', async () => {
      setDbRows([{ id: ANALYSIS_ID, aiAnalysis: '{"overallScore": 7, TRUNCATED' }]);

      const result = await caller.getLatestAnalysis({ websiteId: WEBSITE_ID });

      expect(result).toBeNull();
    });

    it('still parses valid JSON normally', async () => {
      setDbRows([{ id: ANALYSIS_ID, aiAnalysis: '{"overallScore": 7}' }]);

      const result = await caller.getLatestAnalysis({ websiteId: WEBSITE_ID });

      expect(result).toEqual({ overallScore: 7 });
    });
  });

  describe('getWebsiteAnalyses', () => {
    it('returns the corrupted row with aiAnalysis undefined while other rows parse', async () => {
      setDbRows([
        { id: 'a-good', status: 'completed', createdAt: new Date('2026-01-01'), aiAnalysis: '{"overallScore": 8}' },
        { id: 'a-bad', status: 'completed', createdAt: new Date('2026-01-02'), aiAnalysis: 'not json at all' },
      ]);

      const result = await caller.getWebsiteAnalyses({ websiteId: WEBSITE_ID });

      expect(result).toHaveLength(2);
      expect(result[0].aiAnalysis).toEqual({ overallScore: 8 });
      expect(result[1].aiAnalysis).toBeUndefined();
    });
  });

  describe('getAnalysisById', () => {
    it('throws the controlled "Analysis not found" error (not a SyntaxError) when analysis JSON is malformed', async () => {
      setDbRows([{ analysis: '{"broken":', rawData: '{}', website: { url: 'https://example.com' } }]);

      await expect(caller.getAnalysisById({ analysisId: ANALYSIS_ID })).rejects.toThrow(
        /Analysis not found/
      );
    });

    it('returns parsed analysis and crawlData for valid JSON', async () => {
      setDbRows([{ analysis: '{"score": 5}', rawData: '{"url": "https://example.com"}', website: { url: 'https://example.com' } }]);

      const result = await caller.getAnalysisById({ analysisId: ANALYSIS_ID });

      expect(result.analysis).toEqual({ score: 5 });
      expect(result.crawlData).toEqual({ url: 'https://example.com' });
    });
  });
});
