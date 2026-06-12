import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for testing (NODE_ENV is set by vitest itself)
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/convertiq_test';
process.env.POLAR_ACCESS_TOKEN = 'test-token';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.BETTER_AUTH_SECRET = 'test-secret';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';

// Mock fetch for API testing
global.fetch = vi.fn();

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock Polar SDK
vi.mock('@/lib/polar', () => ({
  polar: {
    users: {
      create: vi.fn(),
      get: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
    },
  },
}));

// Mock AI SDK for testing
vi.mock('ai', () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

// Mock Anthropic SDK
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => 'claude-3-5-sonnet-20241022')),
}));

// Mock AI services
vi.mock('@/lib/ai/analysis-engine', () => ({
  analysisEngine: {
    generateAnalysis: vi.fn(),
  },
}));

// Mock report generators
vi.mock('@/lib/reports/generators/marketing-report', () => ({
  marketingReportGenerator: {
    generateMarketingReport: vi.fn(),
  },
}));

vi.mock('@/lib/reports/generators/conversion-report', () => ({
  conversionReportGenerator: {
    generateConversionReport: vi.fn(),
  },
}));

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  ShoppingCartIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'E-commerce Product icon' })),
  BuildingStorefrontIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'E-commerce Category icon' })),
  HomeIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'Homepage icon' })),
  DocumentTextIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'Blog Post icon' })),
  PhoneIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'Contact icon' })),
  CurrencyDollarIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'Pricing icon' })),
  ChartBarIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'Chart icon' })),
  TagIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'Tag icon' })),
  ChevronDownIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'Expand details' })),
  ChevronUpIcon: vi.fn(({ className }: { className?: string }) => ({ className, 'aria-label': 'Collapse details' })),
}));

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});