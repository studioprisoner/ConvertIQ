/**
 * Cost Tracking Service for Firecrawl v1/v2 and AI Operations
 * 
 * Tracks and monitors API costs for:
 * - Firecrawl v1/v2 operations
 * - Anthropic Claude API usage
 * - Other AI service costs
 */

export interface CostEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  websiteId?: string;
  
  // Service details
  service: 'firecrawl-v1' | 'firecrawl-v2' | 'anthropic-claude' | 'voyage-ai' | 'other';
  operation: string;
  
  // Cost details
  costUsd: number;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
  
  // Billing details
  ratePer1kTokens?: number;
  billingModel: 'token-based' | 'request-based' | 'time-based';
  
  // Metadata
  modelName?: string;
  requestSize?: number;
  responseSize?: number;
  metadata?: Record<string, any>;
}

export interface CostSummary {
  timeRange: {
    start: Date;
    end: Date;
  };
  
  totalCost: number;
  
  byService: {
    [service: string]: {
      totalCost: number;
      requestCount: number;
      averageCost: number;
      totalTokens?: number;
    };
  };
  
  byUser?: {
    [userId: string]: {
      totalCost: number;
      requestCount: number;
      topService: string;
    };
  };
  
  trends: {
    dailyCosts: Array<{
      date: string;
      cost: number;
    }>;
    
    costByHour: Array<{
      hour: number;
      cost: number;
    }>;
  };
}

export interface CostAlert {
  type: 'daily-limit' | 'hourly-spike' | 'user-limit' | 'service-spike';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
}

class CostTrackingService {
  private costEntries: CostEntry[] = [];
  private readonly maxEntriesHistory = 50000; // Keep last 50k entries
  
  // Cost thresholds
  private readonly thresholds = {
    dailyLimit: parseFloat(process.env.DAILY_API_COST_LIMIT || '100'), // $100/day
    hourlySpike: parseFloat(process.env.HOURLY_COST_SPIKE_THRESHOLD || '20'), // $20/hour
    userDailyLimit: parseFloat(process.env.USER_DAILY_COST_LIMIT || '10'), // $10/user/day
    serviceSpike: parseFloat(process.env.SERVICE_COST_SPIKE_THRESHOLD || '50'), // $50 spike
  };

  /**
   * Record a cost entry
   */
  recordCost(entry: Omit<CostEntry, 'id' | 'timestamp'>): void {
    const costEntry: CostEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry,
    };
    
    this.costEntries.push(costEntry);
    
    // Keep only recent entries to prevent memory issues
    if (this.costEntries.length > this.maxEntriesHistory) {
      this.costEntries = this.costEntries.slice(-this.maxEntriesHistory);
    }
    
    // Check for cost alerts
    this.checkCostAlerts(costEntry);
    
    // Log high-cost operations
    if (costEntry.costUsd > 1) { // > $1
      console.log(`High-cost API operation:`, {
        service: costEntry.service,
        operation: costEntry.operation,
        cost: `$${costEntry.costUsd.toFixed(4)}`,
        tokens: costEntry.tokensUsed,
        userId: costEntry.userId,
      });
    }
  }

  /**
   * Record Firecrawl operation cost
   */
  recordFirecrawlCost(
    version: 'v1' | 'v2',
    operation: string,
    costUsd: number,
    metadata?: {
      userId?: string;
      websiteId?: string;
      requestSize?: number;
      responseSize?: number;
      [key: string]: any;
    }
  ): void {
    this.recordCost({
      service: version === 'v1' ? 'firecrawl-v1' : 'firecrawl-v2',
      operation,
      costUsd,
      billingModel: 'request-based',
      ...metadata,
    });
  }

  /**
   * Record Anthropic Claude API cost
   */
  recordAnthropicCost(
    operation: string,
    costUsd: number,
    tokensUsed: number,
    inputTokens: number,
    outputTokens: number,
    modelName: string = 'claude-3-haiku-20240307',
    metadata?: {
      userId?: string;
      websiteId?: string;
      [key: string]: any;
    }
  ): void {
    this.recordCost({
      service: 'anthropic-claude',
      operation,
      costUsd,
      tokensUsed,
      inputTokens,
      outputTokens,
      modelName,
      billingModel: 'token-based',
      ratePer1kTokens: costUsd / (tokensUsed / 1000),
      ...metadata,
    });
  }

  /**
   * Calculate Anthropic cost based on token usage
   */
  calculateAnthropicCost(
    inputTokens: number,
    outputTokens: number,
    modelName: string = 'claude-3-haiku-20240307'
  ): number {
    // Anthropic pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }, // per 1k tokens
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    };
    
    const rates = pricing[modelName] || pricing['claude-3-haiku-20240307'];
    
    const inputCost = (inputTokens / 1000) * rates.input;
    const outputCost = (outputTokens / 1000) * rates.output;
    
    return inputCost + outputCost;
  }

  /**
   * Generate cost summary for a time period
   */
  generateCostSummary(hoursBack: number = 24): CostSummary {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const relevantEntries = this.costEntries.filter(e => e.timestamp >= cutoffTime);
    
    const totalCost = relevantEntries.reduce((sum, entry) => sum + entry.costUsd, 0);
    
    // Group by service
    const byService: CostSummary['byService'] = {};
    relevantEntries.forEach(entry => {
      if (!byService[entry.service]) {
        byService[entry.service] = {
          totalCost: 0,
          requestCount: 0,
          averageCost: 0,
          totalTokens: 0,
        };
      }
      
      const serviceStats = byService[entry.service];
      serviceStats.totalCost += entry.costUsd;
      serviceStats.requestCount += 1;
      serviceStats.totalTokens = (serviceStats.totalTokens || 0) + (entry.tokensUsed || 0);
      serviceStats.averageCost = serviceStats.totalCost / serviceStats.requestCount;
    });
    
    // Group by user (if available)
    const byUser: CostSummary['byUser'] = {};
    relevantEntries.forEach(entry => {
      if (entry.userId) {
        if (!byUser[entry.userId]) {
          byUser[entry.userId] = {
            totalCost: 0,
            requestCount: 0,
            topService: entry.service,
          };
        }
        
        byUser[entry.userId].totalCost += entry.costUsd;
        byUser[entry.userId].requestCount += 1;
      }
    });
    
    // Calculate trends
    const dailyCosts: CostSummary['trends']['dailyCosts'] = [];
    const costByHour: CostSummary['trends']['costByHour'] = [];
    
    // Daily costs for the past week
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayCost = this.costEntries
        .filter(e => e.timestamp >= dayStart && e.timestamp < dayEnd)
        .reduce((sum, e) => sum + e.costUsd, 0);
      
      dailyCosts.push({
        date: dayStart.toISOString().split('T')[0],
        cost: dayCost,
      });
    }
    
    // Hourly costs for the past 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(Date.now() - i * 60 * 60 * 1000).getHours();
      const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourCost = this.costEntries
        .filter(e => e.timestamp >= hourStart && e.timestamp < hourEnd)
        .reduce((sum, e) => sum + e.costUsd, 0);
      
      costByHour.push({ hour, cost: hourCost });
    }
    
    return {
      timeRange: {
        start: cutoffTime,
        end: new Date(),
      },
      totalCost,
      byService,
      byUser,
      trends: {
        dailyCosts,
        costByHour,
      },
    };
  }

  /**
   * Check for cost threshold alerts
   */
  private checkCostAlerts(newEntry: CostEntry): CostAlert[] {
    const alerts: CostAlert[] = [];
    const now = new Date();
    
    // Check daily limit
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCost = this.costEntries
      .filter(e => e.timestamp >= todayStart)
      .reduce((sum, e) => sum + e.costUsd, 0);
    
    if (todayCost > this.thresholds.dailyLimit) {
      alerts.push({
        type: 'daily-limit',
        severity: 'critical',
        message: `Daily cost limit exceeded: $${todayCost.toFixed(2)} > $${this.thresholds.dailyLimit}`,
        currentValue: todayCost,
        threshold: this.thresholds.dailyLimit,
        timestamp: now,
      });
    }
    
    // Check hourly spike
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
    const hourCost = this.costEntries
      .filter(e => e.timestamp >= hourStart)
      .reduce((sum, e) => sum + e.costUsd, 0);
    
    if (hourCost > this.thresholds.hourlySpike) {
      alerts.push({
        type: 'hourly-spike',
        severity: 'warning',
        message: `Hourly cost spike detected: $${hourCost.toFixed(2)} in last hour`,
        currentValue: hourCost,
        threshold: this.thresholds.hourlySpike,
        timestamp: now,
      });
    }
    
    // Check user daily limit
    if (newEntry.userId) {
      const userTodayCost = this.costEntries
        .filter(e => e.userId === newEntry.userId && e.timestamp >= todayStart)
        .reduce((sum, e) => sum + e.costUsd, 0);
      
      if (userTodayCost > this.thresholds.userDailyLimit) {
        alerts.push({
          type: 'user-limit',
          severity: 'warning',
          message: `User daily cost limit exceeded for ${newEntry.userId}: $${userTodayCost.toFixed(2)}`,
          currentValue: userTodayCost,
          threshold: this.thresholds.userDailyLimit,
          timestamp: now,
        });
      }
    }
    
    // Log alerts
    alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        console.error('🚨 CRITICAL COST ALERT:', alert.message);
      } else {
        console.warn('⚠️ Cost Alert:', alert.message);
      }
    });
    
    return alerts;
  }

  /**
   * Get current cost status
   */
  getCostStatus(): {
    todayCost: number;
    hourCost: number;
    isNearLimit: boolean;
    alerts: CostAlert[];
  } {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
    
    const todayCost = this.costEntries
      .filter(e => e.timestamp >= todayStart)
      .reduce((sum, e) => sum + e.costUsd, 0);
    
    const hourCost = this.costEntries
      .filter(e => e.timestamp >= hourStart)
      .reduce((sum, e) => sum + e.costUsd, 0);
    
    const isNearLimit = todayCost > this.thresholds.dailyLimit * 0.8; // 80% of daily limit
    
    return {
      todayCost,
      hourCost,
      isNearLimit,
      alerts: [], // Would store recent alerts in production
    };
  }

  /**
   * Export cost data for analysis
   */
  exportCostData(hoursBack: number = 24): CostEntry[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.costEntries.filter(e => e.timestamp >= cutoffTime);
  }

  /**
   * Clear old cost entries
   */
  clearOldEntries(hoursToKeep: number = 168): void { // Default: keep 1 week
    const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
    const initialCount = this.costEntries.length;
    this.costEntries = this.costEntries.filter(e => e.timestamp >= cutoffTime);
    
    const removedCount = initialCount - this.costEntries.length;
    if (removedCount > 0) {
      console.log(`Cleared ${removedCount} old cost entries (kept ${hoursToKeep}h)`);
    }
  }
}

// Singleton instance
export const costTracker = new CostTrackingService();

// Export convenience functions
export function recordFirecrawlCost(
  version: 'v1' | 'v2',
  operation: string,
  costUsd: number,
  metadata?: any
): void {
  costTracker.recordFirecrawlCost(version, operation, costUsd, metadata);
}

export function recordAnthropicCost(
  operation: string,
  costUsd: number,
  tokensUsed: number,
  inputTokens: number,
  outputTokens: number,
  modelName?: string,
  metadata?: any
): void {
  costTracker.recordAnthropicCost(
    operation,
    costUsd,
    tokensUsed,
    inputTokens,
    outputTokens,
    modelName,
    metadata
  );
}

export function calculateAnthropicCost(
  inputTokens: number,
  outputTokens: number,
  modelName?: string
): number {
  return costTracker.calculateAnthropicCost(inputTokens, outputTokens, modelName);
}