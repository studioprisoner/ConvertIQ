/**
 * Feature Flag Service for Progressive Firecrawl v2 Rollout
 * 
 * Manages feature flags for controlled deployment of Firecrawl v2 capabilities
 * - firecrawl_v2_enabled: Controls overall v2 API usage
 * - firecrawl_extraction_enabled: Controls structured data extraction feature
 */

export interface FeatureFlags {
  firecrawl_v2_enabled: boolean;
  firecrawl_extraction_enabled: boolean;
  enhanced_analysis_enabled: boolean;
  batch_processing_enabled: boolean;
}

export interface UserFeatureOverride {
  userId: string;
  flagName: keyof FeatureFlags;
  enabled: boolean;
  reason?: string;
  createdAt: Date;
}

export interface FeatureFlagConfig {
  // Global rollout percentages
  globalRolloutPercentage: {
    firecrawl_v2_enabled: number;
    firecrawl_extraction_enabled: number;
    enhanced_analysis_enabled: number;
    batch_processing_enabled: number;
  };
  
  // User-specific overrides
  userOverrides: Map<string, Partial<FeatureFlags>>;
  
  // Environment-specific flags
  environmentFlags: {
    development: Partial<FeatureFlags>;
    preview: Partial<FeatureFlags>;
    production: Partial<FeatureFlags>;
  };
}

class FeatureFlagService {
  private config: FeatureFlagConfig;

  constructor() {
    this.config = {
      globalRolloutPercentage: {
        firecrawl_v2_enabled: parseInt(process.env.FIRECRAWL_V2_ROLLOUT_PERCENTAGE || '0'),
        firecrawl_extraction_enabled: parseInt(process.env.FIRECRAWL_EXTRACTION_ROLLOUT_PERCENTAGE || '0'),
        enhanced_analysis_enabled: parseInt(process.env.ENHANCED_ANALYSIS_ROLLOUT_PERCENTAGE || '0'),
        batch_processing_enabled: parseInt(process.env.BATCH_PROCESSING_ROLLOUT_PERCENTAGE || '0'),
      },
      
      userOverrides: new Map(),
      
      environmentFlags: {
        development: {
          // Enable all features in development
          firecrawl_v2_enabled: true,
          firecrawl_extraction_enabled: true,
          enhanced_analysis_enabled: true,
          batch_processing_enabled: true,
        },
        preview: {
          // Enable v2 in preview for testing
          firecrawl_v2_enabled: true,
          firecrawl_extraction_enabled: true,
          enhanced_analysis_enabled: true,
          batch_processing_enabled: false, // Conservative on batch processing
        },
        production: {
          // Production uses percentage rollout
          firecrawl_v2_enabled: undefined,
          firecrawl_extraction_enabled: undefined,
          enhanced_analysis_enabled: undefined,
          batch_processing_enabled: undefined,
        },
      },
    };
  }

  /**
   * Check if a feature flag is enabled for a specific user
   */
  async isFeatureEnabled(
    flagName: keyof FeatureFlags, 
    userId?: string,
    userEmail?: string
  ): Promise<boolean> {
    // Environment-specific override
    const environment = this.getCurrentEnvironment();
    const envFlag = this.config.environmentFlags[environment][flagName];
    if (envFlag !== undefined) {
      return envFlag;
    }

    // User-specific override
    if (userId) {
      const userOverride = this.config.userOverrides.get(userId);
      if (userOverride && userOverride[flagName] !== undefined) {
        return userOverride[flagName]!;
      }
    }

    // Email-based beta testing (for specific users)
    if (userEmail && this.isBetaTester(userEmail)) {
      return true;
    }

    // Percentage-based rollout
    const rolloutPercentage = this.config.globalRolloutPercentage[flagName];
    if (rolloutPercentage === 0) {
      return false;
    }
    if (rolloutPercentage === 100) {
      return true;
    }

    // Consistent hash-based percentage rollout
    const userHash = userId ? this.hashUserId(userId) : Math.random() * 100;
    return userHash < rolloutPercentage;
  }

  /**
   * Get all feature flags for a user
   */
  async getUserFeatureFlags(userId?: string, userEmail?: string): Promise<FeatureFlags> {
    return {
      firecrawl_v2_enabled: await this.isFeatureEnabled('firecrawl_v2_enabled', userId, userEmail),
      firecrawl_extraction_enabled: await this.isFeatureEnabled('firecrawl_extraction_enabled', userId, userEmail),
      enhanced_analysis_enabled: await this.isFeatureEnabled('enhanced_analysis_enabled', userId, userEmail),
      batch_processing_enabled: await this.isFeatureEnabled('batch_processing_enabled', userId, userEmail),
    };
  }

  /**
   * Set user-specific feature flag override
   */
  setUserOverride(userId: string, flagName: keyof FeatureFlags, enabled: boolean, reason?: string): void {
    if (!this.config.userOverrides.has(userId)) {
      this.config.userOverrides.set(userId, {});
    }
    
    const userFlags = this.config.userOverrides.get(userId)!;
    userFlags[flagName] = enabled;
    
    console.log(`Feature flag override set: ${flagName}=${enabled} for user ${userId} (${reason || 'no reason'})`);
  }

  /**
   * Remove user-specific override
   */
  removeUserOverride(userId: string, flagName: keyof FeatureFlags): void {
    const userFlags = this.config.userOverrides.get(userId);
    if (userFlags) {
      delete userFlags[flagName];
      if (Object.keys(userFlags).length === 0) {
        this.config.userOverrides.delete(userId);
      }
    }
  }

  /**
   * Update global rollout percentage
   */
  updateGlobalRollout(flagName: keyof FeatureFlags, percentage: number): void {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
    
    this.config.globalRolloutPercentage[flagName] = percentage;
    console.log(`Global rollout updated: ${flagName} = ${percentage}%`);
  }

  /**
   * Get current rollout statistics
   */
  getRolloutStats(): {
    globalPercentages: typeof this.config.globalRolloutPercentage;
    userOverrideCount: number;
    environment: string;
  } {
    return {
      globalPercentages: { ...this.config.globalRolloutPercentage },
      userOverrideCount: this.config.userOverrides.size,
      environment: this.getCurrentEnvironment(),
    };
  }

  /**
   * Check if user is a beta tester based on email
   */
  private isBetaTester(email: string): boolean {
    const betaTesters = [
      'josh@convertiq.cloud',
      // Add other beta tester emails here
    ];
    
    return betaTesters.includes(email.toLowerCase());
  }

  /**
   * Generate consistent hash for user ID (for percentage rollout)
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Determine current environment
   */
  private getCurrentEnvironment(): 'development' | 'preview' | 'production' {
    if (process.env.NODE_ENV === 'development') {
      return 'development';
    }
    if (process.env.VERCEL_ENV === 'preview') {
      return 'preview';
    }
    return 'production';
  }

  /**
   * Emergency kill switch - disable all v2 features
   */
  emergencyDisableV2(): void {
    this.config.globalRolloutPercentage.firecrawl_v2_enabled = 0;
    this.config.globalRolloutPercentage.firecrawl_extraction_enabled = 0;
    this.config.globalRolloutPercentage.enhanced_analysis_enabled = 0;
    this.config.globalRolloutPercentage.batch_processing_enabled = 0;
    
    console.warn('🚨 EMERGENCY: All Firecrawl v2 features disabled');
  }

  /**
   * Progressive rollout helper - increase rollout by specified percentage
   */
  progressiveRollout(flagName: keyof FeatureFlags, increaseBy: number): void {
    const current = this.config.globalRolloutPercentage[flagName];
    const newPercentage = Math.min(100, current + increaseBy);
    this.updateGlobalRollout(flagName, newPercentage);
  }
}

// Singleton instance
export const featureFlagService = new FeatureFlagService();

// Export convenience functions
export async function isFeatureEnabled(
  flagName: keyof FeatureFlags, 
  userId?: string,
  userEmail?: string
): Promise<boolean> {
  return featureFlagService.isFeatureEnabled(flagName, userId, userEmail);
}

export async function getUserFeatureFlags(userId?: string, userEmail?: string): Promise<FeatureFlags> {
  return featureFlagService.getUserFeatureFlags(userId, userEmail);
}