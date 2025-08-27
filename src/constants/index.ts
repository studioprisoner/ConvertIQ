// Application constants following Firegeo patterns

export const APP_CONSTANTS = {
  NAME: 'ConvertIQ',
  DESCRIPTION: 'AI-powered website optimization platform',
  VERSION: '1.0.0',
  
  // URLs and Navigation
  URLS: {
    HOMEPAGE: '/',
    DASHBOARD: '/dashboard',
    ONBOARDING: '/onboarding', 
    LOGIN: '/login',
    REGISTER: '/register',
    PRICING: '/pricing',
    DOCS: '/docs',
  },
  
  // Subscription Plans
  PLANS: {
    FREE: 'free',
    PRO: 'pro', 
    PREMIUM: 'premium',
  },
  
  // Feature Limits
  LIMITS: {
    FREE: {
      domains: 1,
      scansPerMonth: 5,
      reportsPerMonth: 3,
    },
    PRO: {
      domains: 5,
      scansPerMonth: 50,
      reportsPerMonth: 25,
    },
    PREMIUM: {
      domains: 25,
      scansPerMonth: 200,
      reportsPerMonth: 100,
    },
  },
  
  // Analysis Types
  ANALYSIS_TYPES: {
    CONVERSION: 'conversion-analysis',
    SEO: 'seo-analysis', 
    TECHNICAL: 'technical-analysis',
    COMPREHENSIVE: 'comprehensive-audit',
    COMPETITOR: 'competitor-analysis',
  } as const,
  
  // Report Status
  REPORT_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing', 
    COMPLETED: 'completed',
    FAILED: 'failed',
    ARCHIVED: 'archived',
  } as const,
  
  // Website Scan Status
  SCAN_STATUS: {
    QUEUED: 'queued',
    CRAWLING: 'crawling',
    ANALYZING: 'analyzing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  } as const,
} as const;

// AI Provider Constants
export const AI_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai', 
  GOOGLE: 'google',
} as const;

// Firecrawl Constants
export const FIRECRAWL_CONSTANTS = {
  FORMATS: {
    MARKDOWN: 'markdown',
    HTML: 'html',
    TEXT: 'text',
    EXTRACT: 'extract',
  },
  
  MAX_URLS: {
    BATCH_SCRAPE: 25,
    EXTRACT: 10,
    CRAWL_DEPTH: 5,
  },
  
  TIMEOUTS: {
    SCRAPE: 30000,
    CRAWL: 300000, // 5 minutes
    EXTRACT: 60000,
  },
} as const;

// UI Constants
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px', 
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
  
  ANIMATIONS: {
    DURATION: {
      FAST: '150ms',
      NORMAL: '300ms', 
      SLOW: '500ms',
    },
    EASING: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      IN: 'cubic-bezier(0.4, 0, 1, 1)',
      OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },
  
  COLORS: {
    PRIMARY: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      900: '#1e3a8a',
    },
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. Please contact support if you believe this is an error.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Too many requests. Please wait before trying again.',
  
  // Firecrawl specific
  FIRECRAWL_API_ERROR: 'Website analysis failed. Please try again or contact support.',
  FIRECRAWL_RATE_LIMITED: 'Analysis rate limit exceeded. Please wait before scanning again.',
  
  // AI specific  
  AI_ANALYSIS_FAILED: 'AI analysis failed. Please try again with a different approach.',
  AI_PROVIDER_ERROR: 'AI service unavailable. Please try again later.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SCAN_STARTED: 'Website scan started successfully!',
  SCAN_COMPLETED: 'Website scan completed successfully!',
  REPORT_GENERATED: 'Report generated successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  SUBSCRIPTION_UPDATED: 'Subscription updated successfully!',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'convertiq-theme',
  RECENT_SCANS: 'convertiq-recent-scans',
  USER_PREFERENCES: 'convertiq-user-preferences',
  ONBOARDING_COMPLETED: 'convertiq-onboarding-completed',
} as const;

// Type exports for constants
export type AnalysisType = typeof APP_CONSTANTS.ANALYSIS_TYPES[keyof typeof APP_CONSTANTS.ANALYSIS_TYPES];
export type ReportStatus = typeof APP_CONSTANTS.REPORT_STATUS[keyof typeof APP_CONSTANTS.REPORT_STATUS];
export type ScanStatus = typeof APP_CONSTANTS.SCAN_STATUS[keyof typeof APP_CONSTANTS.SCAN_STATUS];
export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];