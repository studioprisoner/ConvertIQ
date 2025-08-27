import { config, isFeatureEnabled, type Config, type AIProvider } from '@/config';

/**
 * Hook to access application configuration
 * Following Firegeo patterns for configuration management
 */
export function useConfig() {
  return {
    app: config.app,
    ai: config.ai,
    firecrawl: config.firecrawl,
    features: config.features,
    
    // Helper methods
    isFeatureEnabled,
    
    // AI provider helpers
    getAvailableAIProviders: (): AIProvider[] => {
      return Object.keys(config.ai.providers) as AIProvider[];
    },
    
    getDefaultAIProvider: (): AIProvider => {
      return config.ai.defaultProvider;
    },
    
    // Environment helpers
    isDevelopment: () => process.env.NODE_ENV === 'development',
    isProduction: () => process.env.NODE_ENV === 'production',
    
    // Feature flag shortcuts
    isFirecrawlV2Enabled: () => config.features.firecrawlV2Enabled,
    isEnhancedAnalysisEnabled: () => config.features.enhancedAnalysisEnabled,
    isMultiProviderAIEnabled: () => config.features.multiProviderAIEnabled,
    isRealtimeUpdatesEnabled: () => config.features.realtimeUpdatesEnabled,
    isBrandMonitoringEnabled: () => config.features.brandMonitoringEnabled,
  };
}