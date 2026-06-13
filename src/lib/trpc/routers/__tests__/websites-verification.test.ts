import { describe, it, expect, beforeEach, vi } from 'vitest';
import { websitesRouter } from '../websites';
import { db } from '@/db/connection';

// Mock the database connection used by websites.ts
vi.mock('@/db/connection', () => {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'limit', 'leftJoin', 'insert', 'values', 'returning', 'update', 'set'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = undefined; // configured per-test via setDbQueue
  return { db: chain };
});

// protectedProcedure loads the caller's subscription — keep it off the db mock
vi.mock('@/lib/subscription-service', () => ({
  getUserSubscription: vi.fn().mockResolvedValue(null),
  trackUsage: vi.fn().mockResolvedValue(undefined),
}));

// Keep SSRF guard hermetic (no real DNS); validateUrl is unused by these procedures
vi.mock('@/lib/url-validation', () => ({
  assertPublicTarget: vi.fn().mockResolvedValue({ safe: true }),
  validateUrl: vi.fn(),
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

describe('websites router — domain ownership verification (CON-96)', () => {
  const caller = websitesRouter.createCaller(authedCtx);
  const anonCaller = websitesRouter.createCaller(anonCtx);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('requestVerification', () => {
    it('rejects unauthenticated callers', async () => {
      await expect(anonCaller.requestVerification({ websiteId: WEBSITE_ID })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('throws when the website belongs to another user', async () => {
      setDbQueue([]); // ownership lookup finds nothing
      await expect(caller.requestVerification({ websiteId: WEBSITE_ID })).rejects.toThrow(/Website not found/);
    });

    it('returns a 32-char token and a meta tag containing it', async () => {
      setDbQueue(
        [{ id: WEBSITE_ID }], // ownership lookup passes
        [] // update
      );
      const result = await caller.requestVerification({ websiteId: WEBSITE_ID });

      expect(result.token).toMatch(/^[0-9a-f]{32}$/);
      expect(result.metaTag).toBe(`<meta name="convertiq-verification" content="${result.token}" />`);
    });
  });

  describe('confirmVerification', () => {
    it('rejects unauthenticated callers', async () => {
      await expect(anonCaller.confirmVerification({ websiteId: WEBSITE_ID })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('throws when no verification is in progress (no token)', async () => {
      setDbQueue([{ id: WEBSITE_ID, url: 'https://example.com', verificationToken: null }]);
      await expect(caller.confirmVerification({ websiteId: WEBSITE_ID })).rejects.toThrow(/No verification in progress/);
    });

    it('returns verified:true when the homepage contains the tag', async () => {
      const token = 'fake-token-tag-present-not-a-secret';
      setDbQueue(
        [{ id: WEBSITE_ID, url: 'https://example.com', verificationToken: token }], // select
        [] // update to valid
      );
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => `<html><head><meta name="convertiq-verification" content="${token}" /></head></html>`,
      }));

      const result = await caller.confirmVerification({ websiteId: WEBSITE_ID });
      expect(result.verified).toBe(true);
    });

    it('matches the tag regardless of attribute order', async () => {
      const token = 'fake-token-attr-order-not-a-secret';
      setDbQueue(
        [{ id: WEBSITE_ID, url: 'https://example.com', verificationToken: token }],
        []
      );
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => `<meta content="${token}" name="convertiq-verification">`,
      }));

      const result = await caller.confirmVerification({ websiteId: WEBSITE_ID });
      expect(result.verified).toBe(true);
    });

    it('returns verified:false when the tag is absent', async () => {
      const token = 'fake-token-tag-absent-not-a-secret';
      setDbQueue(
        [{ id: WEBSITE_ID, url: 'https://example.com', verificationToken: token }],
        []
      );
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => `<html><head><title>No tag here</title></head></html>`,
      }));

      const result = await caller.confirmVerification({ websiteId: WEBSITE_ID });
      expect(result.verified).toBe(false);
      expect(result.reason).toMatch(/not found/i);
    });

    it('returns verified:false (not an unhandled throw) when the fetch fails', async () => {
      const token = 'fake-token-fetch-fails-not-a-secret';
      setDbQueue([{ id: WEBSITE_ID, url: 'https://example.com', verificationToken: token }]);
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

      const result = await caller.confirmVerification({ websiteId: WEBSITE_ID });
      expect(result.verified).toBe(false);
      expect(result.reason).toBeTruthy();
    });

    it('returns verified:false without fetching when the target is a private address', async () => {
      const { assertPublicTarget } = await import('@/lib/url-validation');
      (assertPublicTarget as any).mockResolvedValueOnce({ safe: false, reason: 'Cannot scan private or internal IP addresses' });
      const token = 'fake-token-private-target-not-a-secret';
      setDbQueue([{ id: WEBSITE_ID, url: 'http://10.0.0.5/', verificationToken: token }]);
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const result = await caller.confirmVerification({ websiteId: WEBSITE_ID });
      expect(result.verified).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
