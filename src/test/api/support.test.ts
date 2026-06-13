import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/support/route';
import { auth } from '@/lib/auth';

// LinearClient is mocked so no real ticket is created. Uses a `function`
// (not an arrow) so `new LinearClient(...)` in the route is constructable.
const createIssue = vi.fn();
vi.mock('@linear/sdk', () => ({
  LinearClient: vi.fn(function (this: { createIssue: typeof createIssue }) {
    this.createIssue = createIssue;
  }),
}));

const getSession = vi.mocked(auth.api.getSession);

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  subject: 'Help with my report',
  description: 'The PDF export is blank.',
};

const authedSession = {
  user: { id: 'user-123', email: 'jane@example.com', name: 'Jane Doe' },
  session: { id: 's1', userId: 'user-123' },
};

describe('POST /api/support — auth + input limits (CON-97)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LINEAR_API_KEY = 'test-linear-key';
    process.env.LINEAR_TEAM_ID = 'test-team';
    createIssue.mockResolvedValue({ success: true, issue: { id: 'ISSUE-1' } });
  });

  it('rejects unauthenticated requests with 401 and never calls Linear', async () => {
    getSession.mockResolvedValue(null as any);

    const res = await POST(makeRequest(validBody) as any);

    expect(res.status).toBe(401);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('rejects an over-long description (>5000 chars) with 400', async () => {
    getSession.mockResolvedValue(authedSession as any);

    const res = await POST(
      makeRequest({ ...validBody, description: 'x'.repeat(5001) }) as any
    );

    expect(res.status).toBe(400);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('rejects a malformed email with 400', async () => {
    getSession.mockResolvedValue(authedSession as any);

    const res = await POST(makeRequest({ ...validBody, email: 'not-an-email' }) as any);

    expect(res.status).toBe(400);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('creates the ticket for an authenticated valid request and records the authenticated identity', async () => {
    getSession.mockResolvedValue(authedSession as any);

    const res = await POST(makeRequest(validBody) as any);

    expect(res.status).toBe(200);
    expect(createIssue).toHaveBeenCalledTimes(1);
    const arg = createIssue.mock.calls[0][0];
    // the trusted, session-derived identity is embedded so spoofed form values are detectable
    expect(arg.description).toContain('user-123');
    expect(arg.description).toContain('jane@example.com');
    expect(arg.priority).toBe(2);
  });
});
