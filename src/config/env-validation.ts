import { z } from 'zod';

// Environment variable schemas
const requiredEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Auth
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL').or(z.string().min(1)),
  
  // AI Providers
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  
  // Firecrawl
  FIRECRAWL_API_KEY: z.string().min(1, 'FIRECRAWL_API_KEY is required'),
  
  // App Config
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL').or(z.string().min(1)),
});

const optionalEnvSchema = z.object({
  // Additional AI Providers
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  
  // Storage
  UPLOADTHING_SECRET: z.string().optional(),
  UPLOADTHING_APP_ID: z.string().optional(),
  
  // Feature Flags
  FEATURE_FIRECRAWL_V2_ENABLED: z.string().transform(s => s === 'true').optional(),
  FEATURE_ENHANCED_ANALYSIS_ENABLED: z.string().transform(s => s === 'true').optional(),
  FEATURE_MULTI_PROVIDER_AI_ENABLED: z.string().transform(s => s === 'true').optional(),
  FEATURE_REALTIME_UPDATES_ENABLED: z.string().transform(s => s === 'true').optional(),
  FEATURE_BRAND_MONITORING_ENABLED: z.string().transform(s => s === 'true').optional(),
  
  // Performance & Rate Limits
  FIRECRAWL_RATE_LIMIT_SCRAPE: z.string().transform(Number).optional(),
  FIRECRAWL_RATE_LIMIT_CRAWL: z.string().transform(Number).optional(),
  FIRECRAWL_RATE_LIMIT_EXTRACT: z.string().transform(Number).optional(),
  FIRECRAWL_TIMEOUT: z.string().transform(Number).optional(),
  
  DATABASE_MAX_CONNECTIONS: z.string().transform(Number).optional(),
  DATABASE_POOLING: z.string().transform(s => s !== 'false').optional(),
  
  // AI Configuration
  AI_DEFAULT_PROVIDER: z.enum(['anthropic', 'openai', 'google']).optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  ANTHROPIC_MAX_TOKENS: z.string().transform(Number).optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_MAX_TOKENS: z.string().transform(Number).optional(),
  GOOGLE_MODEL: z.string().optional(),
  GOOGLE_MAX_TOKENS: z.string().transform(Number).optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
  
  // Sentry
  SENTRY_TRACES_SAMPLE_RATE: z.string().transform(Number).optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

const envSchema = requiredEnvSchema.merge(optionalEnvSchema);

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 * Throws an error if required variables are missing or invalid
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'));
      
      const invalidVars = error.errors
        .filter(err => err.code !== 'invalid_type' || err.received !== 'undefined')
        .map(err => `${err.path.join('.')}: ${err.message}`);
      
      let errorMessage = 'Environment validation failed:\n';
      
      if (missingVars.length > 0) {
        errorMessage += `\nMissing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}`;
      }
      
      if (invalidVars.length > 0) {
        errorMessage += `\nInvalid environment variables:\n${invalidVars.map(v => `  - ${v}`).join('\n')}`;
      }
      
      errorMessage += '\n\nPlease check your environment configuration.';
      
      throw new Error(errorMessage);
    }
    
    throw error;
  }
}

/**
 * Get validated environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv();

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Check if we're in staging mode
 */
export function isStaging(): boolean {
  return env.NODE_ENV === 'staging';
}

/**
 * Check if we're on Vercel
 */
export function isVercel(): boolean {
  return !!process.env.VERCEL;
}

/**
 * Get the current environment
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  return env.NODE_ENV;
}

/**
 * Validate specific feature flags
 */
export function validateFeatureFlags() {
  const flags = {
    firecrawlV2: env.FEATURE_FIRECRAWL_V2_ENABLED || false,
    enhancedAnalysis: env.FEATURE_ENHANCED_ANALYSIS_ENABLED || false,
    multiProviderAI: env.FEATURE_MULTI_PROVIDER_AI_ENABLED || false,
    realtimeUpdates: env.FEATURE_REALTIME_UPDATES_ENABLED || false,
    brandMonitoring: env.FEATURE_BRAND_MONITORING_ENABLED || false,
  };
  
  // Log feature flag status in development
  if (isDevelopment()) {
    console.log('🚩 Feature Flags:', flags);
  }
  
  return flags;
}

/**
 * Get AI provider configuration
 */
export function getAIProviderConfig() {
  const providers: Record<string, any> = {};
  
  if (env.ANTHROPIC_API_KEY) {
    providers.anthropic = {
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
      maxTokens: env.ANTHROPIC_MAX_TOKENS || 4000,
    };
  }
  
  if (env.OPENAI_API_KEY) {
    providers.openai = {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || 'gpt-4',
      maxTokens: env.OPENAI_MAX_TOKENS || 4000,
    };
  }
  
  if (env.GOOGLE_API_KEY) {
    providers.google = {
      apiKey: env.GOOGLE_API_KEY,
      model: env.GOOGLE_MODEL || 'gemini-pro',
      maxTokens: env.GOOGLE_MAX_TOKENS || 4000,
    };
  }
  
  return {
    providers,
    defaultProvider: env.AI_DEFAULT_PROVIDER || 'anthropic',
  };
}

/**
 * Safely log environment info (excluding secrets)
 */
export function logEnvironmentInfo() {
  if (!isDevelopment()) return;
  
  console.log('🌍 Environment Info:');
  console.log('  NODE_ENV:', env.NODE_ENV);
  console.log('  VERCEL_ENV:', env.VERCEL_ENV || 'none');
  console.log('  AI Providers:', Object.keys(getAIProviderConfig().providers));
  console.log('  Feature Flags:', Object.entries(validateFeatureFlags()).filter(([, enabled]) => enabled).map(([name]) => name));
  console.log('  Database Pooling:', env.DATABASE_POOLING ? 'enabled' : 'disabled');
}