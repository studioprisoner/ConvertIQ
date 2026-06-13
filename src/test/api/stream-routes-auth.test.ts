import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auth } from '@/lib/auth';

// Keep the heavy AI deps inert — the auth gate returns before any of them run.
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: vi.fn(() => vi.fn(() => 'model')) }));
vi.mock('ai', () => ({ streamText: vi.fn() }));
vi.mock('@/lib/ai/providers/anthropic', () => ({ AnthropicAnalysisProvider: vi.fn() }));

import { POST as streamAnalysis } from '@/app/api/ai/stream-analysis/route';
import { POST as streamComprehensive } from '@/app/api/ai/stream-comprehensive/route';
import { POST as streamSimple } from '@/app/api/ai/stream-simple/route';

const getSession = vi.mocked(auth.api.getSession);

function req(body: unknown): Request {
  return new Request('http://localhost/api/ai/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('streaming AI routes — require auth (CON-112)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stream-analysis returns 401 for anonymous callers', async () => {
    getSession.mockResolvedValue(null as any);
    const res = await streamAnalysis(req({}) as any);
    expect(res.status).toBe(401);
  });

  it('stream-comprehensive returns 401 for anonymous callers', async () => {
    getSession.mockResolvedValue(null as any);
    const res = await streamComprehensive(req({}) as any);
    expect(res.status).toBe(401);
  });

  it('stream-simple returns 401 for anonymous callers', async () => {
    getSession.mockResolvedValue(null as any);
    const res = await streamSimple(req({}) as any);
    expect(res.status).toBe(401);
  });
});
