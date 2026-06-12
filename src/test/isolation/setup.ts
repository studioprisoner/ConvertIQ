import { vi } from 'vitest';

// Test users (local development database IDs)
export const TEST_USERS = {
  josh: {
    id: 'ggRgyGOJhiOsMKGSjiH64tC4uoZH6DEI',
    email: 'josh@studioprisoner.com',
    websiteId: '0603c79d-3955-4d2b-bcb9-708ce018c968', // mad-dame.com
  },
  gmail: {
    id: '2dHJEWQWdhorZ2eUTYZx04bDIFIJvKPJ', 
    email: 'studioprisoner@gmail.com',
    websiteId: '96fa66e1-860b-4fe1-8056-f592704ed55f', // joshuaillichmann.com
  },
} as const;

// Test environment configuration (NODE_ENV is set by vitest itself)
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Database setup for testing
import { db } from '@/db/connection';

export { db };

// Helper function to create mock session for testing
export function createMockSession(userId: string) {
  const user = Object.values(TEST_USERS).find(u => u.id === userId);
  if (!user) throw new Error(`Unknown test user: ${userId}`);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.email.split('@')[0],
    },
    session: {
      id: `session_${userId}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    }
  };
}

// Mock auth for specific user
export function mockAuthForUser(userId: string) {
  const session = createMockSession(userId);
  
  vi.doMock('@/lib/auth', () => ({
    auth: {
      api: {
        getSession: vi.fn().mockResolvedValue(session),
      },
    },
  }));
  
  return session;
}