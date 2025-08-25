import { env, validateFeatureFlags, getAIProviderConfig, isDevelopment } from './env-validation';

// Create configuration from validated environment variables
function createConfig() {
  const aiConfig = getAIProviderConfig();
  const featureFlags = validateFeatureFlags();
  
  return {
    app: {
      name: 'ConvertIQ',
      url: env.NEXT_PUBLIC_APP_URL,
      description: 'AI-powered website optimization platform',
      version: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
    },
    
    ai: {
      providers: aiConfig.providers,
      defaultProvider: aiConfig.defaultProvider as 'anthropic' | 'openai' | 'google',
    },
    
    firecrawl: {
      apiKey: env.FIRECRAWL_API_KEY,
      baseUrl: 'https://api.firecrawl.dev',
      rateLimits: {
        scrape: env.FIRECRAWL_RATE_LIMIT_SCRAPE || 100,
        crawl: env.FIRECRAWL_RATE_LIMIT_CRAWL || 10,
        extract: env.FIRECRAWL_RATE_LIMIT_EXTRACT || 50,
        map: 30,
      },
      timeout: env.FIRECRAWL_TIMEOUT || 30000,
    },
    
    database: {
      url: env.DATABASE_URL,
      pooling: env.DATABASE_POOLING ?? true,
      maxConnections: env.DATABASE_MAX_CONNECTIONS || 20,
    },
    
    auth: {
      secret: env.BETTER_AUTH_SECRET,
      url: env.BETTER_AUTH_URL,
      sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
    },
    
    features: {
      firecrawlV2Enabled: featureFlags.firecrawlV2,
      enhancedAnalysisEnabled: featureFlags.enhancedAnalysis,
      multiProviderAIEnabled: featureFlags.multiProviderAI,
      realtimeUpdatesEnabled: featureFlags.realtimeUpdates,
      brandMonitoringEnabled: featureFlags.brandMonitoring,
    },
    
    monitoring: {
      sentry: {
        dsn: env.SENTRY_DSN,
        environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
        tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE || 0.1,
      },
    },
    
    storage: {
      ...(env.UPLOADTHING_SECRET && {
        uploadthing: {
          secret: env.UPLOADTHING_SECRET,
          appId: env.UPLOADTHING_APP_ID,
        },
      }),
    },
  };
}

// Export singleton config instance
export const config = createConfig();

// Export types
export type Config = ReturnType<typeof createConfig>;
export type AIProvider = keyof Config['ai']['providers'];

// Helper functions
export function isFeatureEnabled(featureName: keyof Config['features']): boolean {
  return config.features[featureName];
}

export function getAIProviderConfig(provider: AIProvider) {
  return config.ai.providers[provider];
}

export function getDefaultAIProvider(): AIProvider {
  return config.ai.defaultProvider;
}