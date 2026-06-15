import { describe, it, expect, beforeEach, vi } from 'vitest';

// Spies shared between the mock factories and the assertions. Declared via
// vi.hoisted so they exist when the hoisted vi.mock factories run.
const { add, execute } = vi.hoisted(() => ({
  add: vi.fn(),
  execute: vi.fn(),
}));

// Mock the embeddings barrel so importing database.ts neither constructs the
// real Voyage service (which throws without VOYAGE_API_KEY) nor enqueues real
// work — we just want to observe the queue call.
vi.mock('@/lib/embeddings', () => ({
  embeddingService: { generateEmbedding: vi.fn() },
  textProcessor: { extractKeyContent: vi.fn(() => 'content') },
  embeddingQueue: { add },
}));

// Chainable db mock: select().from().where().limit() resolves to the website
// existence check; execute() stands in for the raw INSERT.
vi.mock('@/db/connection', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'from', 'where', 'limit', 'update', 'set']) {
    chain[m] = vi.fn(() => chain);
  }
  (chain as any).then = (resolve: (value: unknown) => void) => resolve([{ id: 'website-1' }]);
  (chain as any).execute = execute;
  return { db: chain };
});

import { aiAnalysisDb } from '@/lib/ai/database';

const crawlData: any = {
  url: 'https://example.com',
  timestamp: '2026-01-01T00:00:00Z',
  statusCode: 200,
  performance: {},
};
const analysisResult: any = { type: 'comprehensive', summary: 'A short summary' };

describe('automatic report vectorization on save (CON-23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    add.mockResolvedValue(undefined);
    execute.mockResolvedValue([]);
  });

  it('queues a high-priority embedding job for the saved analysis', async () => {
    const id = await aiAnalysisDb.saveAnalysis('website-1', crawlData, analysisResult);

    expect(execute).toHaveBeenCalledTimes(1); // the INSERT ran
    expect(add).toHaveBeenCalledWith({ analysisId: id, priority: 'high' });
  });

  it('is non-blocking: a queue failure does not fail the save', async () => {
    add.mockRejectedValueOnce(new Error('queue unavailable'));

    const id = await aiAnalysisDb.saveAnalysis('website-1', crawlData, analysisResult);

    expect(typeof id).toBe('string');
    expect(add).toHaveBeenCalledTimes(1);
  });
});
