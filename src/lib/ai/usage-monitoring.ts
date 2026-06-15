/**
 * AI Usage Monitoring and Cost Tracking (CON-12)
 */

import { captureMessageWithContext, addBreadcrumb } from '../sentry-utils';

export interface UsageMetrics {
  provider: 'anthropic' | 'voyage';
  operation: string;
  tokensUsed?: number;
  requestCount: number;
  duration: number;
  success: boolean;
  cost?: number;
  userId?: string;
  timestamp: string;
}

export interface DailyUsageReport {
  date: string;
  anthropic: {
    totalRequests: number;
    totalTokens: number;
    estimatedCost: number;
    operationBreakdown: Record<string, number>;
  };
  voyage: {
    totalRequests: number;
    totalEmbeddings: number;
    estimatedCost: number;
    operationBreakdown: Record<string, number>;
  };
  errors: {
    anthropic: number;
    voyage: number;
  };
  performance: {
    averageResponseTime: number;
    slowestOperations: Array<{ operation: string; duration: number }>;
  };
}

/**
 * Cost estimation constants (approximate pricing as of 2024)
 */
const PRICING = {
  anthropic: {
    'claude-sonnet-4-6': {
      inputTokens: 3.00 / 1000000,  // $3 per million input tokens
      outputTokens: 15.00 / 1000000  // $15 per million output tokens
    },
    'claude-haiku-4-5': {
      inputTokens: 1.00 / 1000000,  // $1 per million input tokens
      outputTokens: 5.00 / 1000000  // $5 per million output tokens
    },
    'claude-opus-4-8': {
      inputTokens: 5.00 / 1000000,  // $5 per million input tokens
      outputTokens: 25.00 / 1000000  // $25 per million output tokens
    }
  },
  voyage: {
    'voyage-3.5': {
      perEmbedding: 0.00002  // Approximate cost per embedding
    }
  }
} as const;

/**
 * In-memory usage tracking (in production, this would be stored in Redis/DB)
 */
class AIUsageTracker {
  private metrics: UsageMetrics[] = [];
  private dailyReports: Map<string, DailyUsageReport> = new Map();
  private readonly maxMetricsRetention = 10000; // Keep last 10k metrics

  /**
   * Track an AI operation
   */
  trackUsage(metrics: Omit<UsageMetrics, 'timestamp'>): void {
    const fullMetrics: UsageMetrics = {
      ...metrics,
      timestamp: new Date().toISOString()
    };

    this.metrics.push(fullMetrics);
    
    // Cleanup old metrics to prevent memory issues
    if (this.metrics.length > this.maxMetricsRetention) {
      this.metrics = this.metrics.slice(-this.maxMetricsRetention);
    }

    // Update daily report
    this.updateDailyReport(fullMetrics);

    // Add breadcrumb for monitoring
    addBreadcrumb(
      `AI usage: ${metrics.provider} ${metrics.operation}`,
      'ai.usage',
      {
        provider: metrics.provider,
        operation: metrics.operation,
        duration: metrics.duration,
        success: metrics.success,
        cost: metrics.cost,
        userId: metrics.userId
      }
    );

    // Alert on high costs or unusual patterns
    this.checkForAlerts(fullMetrics);
  }

  /**
   * Estimate cost for Anthropic operations
   */
  estimateAnthropicCost(
    inputTokens: number = 0,
    outputTokens: number = 0,
    model: keyof typeof PRICING.anthropic = 'claude-sonnet-4-6'
  ): number {
    const pricing = PRICING.anthropic[model];
    return (inputTokens * pricing.inputTokens) + (outputTokens * pricing.outputTokens);
  }

  /**
   * Estimate cost for Voyage operations
   */
  estimateVoyageCost(
    embeddingCount: number,
    model: keyof typeof PRICING.voyage = 'voyage-3.5'
  ): number {
    const pricing = PRICING.voyage[model];
    return embeddingCount * pricing.perEmbedding;
  }

  /**
   * Get current usage statistics
   */
  getCurrentUsage(): {
    today: DailyUsageReport | null;
    last24Hours: UsageMetrics[];
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  } {
    const today = new Date().toISOString().split('T')[0];
    const last24Hours = this.metrics.filter(
      m => Date.now() - new Date(m.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    const totalRequests = last24Hours.length;
    const errors = last24Hours.filter(m => !m.success).length;
    const errorRate = totalRequests > 0 ? errors / totalRequests : 0;
    const averageResponseTime = totalRequests > 0 
      ? last24Hours.reduce((sum, m) => sum + m.duration, 0) / totalRequests 
      : 0;

    return {
      today: this.dailyReports.get(today) || null,
      last24Hours,
      totalRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  /**
   * Get usage by user
   */
  getUserUsage(userId: string, days: number = 30): {
    totalRequests: number;
    totalCost: number;
    requestsByProvider: Record<string, number>;
    averageResponseTime: number;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const userMetrics = this.metrics.filter(
      m => m.userId === userId && new Date(m.timestamp) >= cutoffDate
    );

    const totalCost = userMetrics.reduce((sum, m) => sum + (m.cost || 0), 0);
    const requestsByProvider = userMetrics.reduce((acc, m) => {
      acc[m.provider] = (acc[m.provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageResponseTime = userMetrics.length > 0
      ? userMetrics.reduce((sum, m) => sum + m.duration, 0) / userMetrics.length
      : 0;

    return {
      totalRequests: userMetrics.length,
      totalCost: Math.round(totalCost * 100) / 100,
      requestsByProvider,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  /**
   * Update daily report
   */
  private updateDailyReport(metrics: UsageMetrics): void {
    const date = metrics.timestamp.split('T')[0];
    const report = this.dailyReports.get(date) || this.createEmptyDailyReport(date);

    if (metrics.provider === 'anthropic') {
      report.anthropic.totalRequests++;
      if (metrics.tokensUsed) {
        report.anthropic.totalTokens += metrics.tokensUsed;
      }
      if (metrics.cost) {
        report.anthropic.estimatedCost += metrics.cost;
      }
      report.anthropic.operationBreakdown[metrics.operation] = 
        (report.anthropic.operationBreakdown[metrics.operation] || 0) + 1;
      
      if (!metrics.success) {
        report.errors.anthropic++;
      }
    } else if (metrics.provider === 'voyage') {
      report.voyage.totalRequests++;
      report.voyage.totalEmbeddings++; // Assuming 1 embedding per request
      if (metrics.cost) {
        report.voyage.estimatedCost += metrics.cost;
      }
      report.voyage.operationBreakdown[metrics.operation] = 
        (report.voyage.operationBreakdown[metrics.operation] || 0) + 1;
      
      if (!metrics.success) {
        report.errors.voyage++;
      }
    }

    // Update performance metrics
    const totalRequests = report.anthropic.totalRequests + report.voyage.totalRequests;
    report.performance.averageResponseTime = 
      ((report.performance.averageResponseTime * (totalRequests - 1)) + metrics.duration) / totalRequests;

    // Track slow operations
    if (metrics.duration > 10000) { // > 10 seconds
      report.performance.slowestOperations.push({
        operation: `${metrics.provider}.${metrics.operation}`,
        duration: metrics.duration
      });
      
      // Keep only top 10 slowest
      report.performance.slowestOperations = report.performance.slowestOperations
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    }

    this.dailyReports.set(date, report);
  }

  /**
   * Create empty daily report structure
   */
  private createEmptyDailyReport(date: string): DailyUsageReport {
    return {
      date,
      anthropic: {
        totalRequests: 0,
        totalTokens: 0,
        estimatedCost: 0,
        operationBreakdown: {}
      },
      voyage: {
        totalRequests: 0,
        totalEmbeddings: 0,
        estimatedCost: 0,
        operationBreakdown: {}
      },
      errors: {
        anthropic: 0,
        voyage: 0
      },
      performance: {
        averageResponseTime: 0,
        slowestOperations: []
      }
    };
  }

  /**
   * Check for usage alerts
   */
  private checkForAlerts(metrics: UsageMetrics): void {
    const usage = this.getCurrentUsage();
    
    // Alert on high error rate
    if (usage.errorRate > 0.1) { // > 10% error rate
      captureMessageWithContext(
        `High AI service error rate: ${(usage.errorRate * 100).toFixed(1)}%`,
        'warning',
        {
          component: 'ai-usage-tracker',
          action: 'error-rate-alert',
          additionalData: {
            errorRate: usage.errorRate,
            totalRequests: usage.totalRequests
          }
        }
      );
    }

    // Alert on slow responses
    if (metrics.duration > 30000) { // > 30 seconds
      captureMessageWithContext(
        `Slow AI operation detected: ${metrics.provider}.${metrics.operation} took ${metrics.duration}ms`,
        'warning',
        {
          component: 'ai-usage-tracker',
          action: 'slow-operation-alert',
          additionalData: {
            provider: metrics.provider,
            operation: metrics.operation,
            duration: metrics.duration,
            userId: metrics.userId
          }
        }
      );
    }

    // Alert on high daily costs (basic threshold)
    const today = usage.today;
    if (today) {
      const totalDailyCost = today.anthropic.estimatedCost + today.voyage.estimatedCost;
      if (totalDailyCost > 100) { // > $100 per day
        captureMessageWithContext(
          `High daily AI costs: $${totalDailyCost.toFixed(2)}`,
          'warning',
          {
            component: 'ai-usage-tracker',
            action: 'cost-alert',
            additionalData: {
              dailyCost: totalDailyCost,
              anthropicCost: today.anthropic.estimatedCost,
              voyageCost: today.voyage.estimatedCost
            }
          }
        );
      }
    }
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(days: number = 7): {
    metrics: UsageMetrics[];
    dailyReports: DailyUsageReport[];
    summary: {
      totalRequests: number;
      totalCost: number;
      averageResponseTime: number;
      errorRate: number;
    };
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredMetrics = this.metrics.filter(
      m => new Date(m.timestamp) >= cutoffDate
    );

    const dailyReports = Array.from(this.dailyReports.values())
      .filter(r => new Date(r.date) >= cutoffDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalCost = filteredMetrics.reduce((sum, m) => sum + (m.cost || 0), 0);
    const errors = filteredMetrics.filter(m => !m.success).length;
    const errorRate = filteredMetrics.length > 0 ? errors / filteredMetrics.length : 0;
    const averageResponseTime = filteredMetrics.length > 0 
      ? filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / filteredMetrics.length 
      : 0;

    return {
      metrics: filteredMetrics,
      dailyReports,
      summary: {
        totalRequests: filteredMetrics.length,
        totalCost: Math.round(totalCost * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      }
    };
  }

  /**
   * Clear old data (for maintenance)
   */
  cleanup(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clean metrics
    this.metrics = this.metrics.filter(
      m => new Date(m.timestamp) >= cutoffDate
    );

    // Clean daily reports
    for (const [date, report] of this.dailyReports.entries()) {
      if (new Date(date) < cutoffDate) {
        this.dailyReports.delete(date);
      }
    }

    addBreadcrumb(
      `AI usage data cleanup completed`,
      'ai.usage.cleanup',
      {
        metricsRetained: this.metrics.length,
        reportsRetained: this.dailyReports.size,
        daysToKeep
      }
    );
  }
}

// Singleton instance
export const usageTracker = new AIUsageTracker();

/**
 * Decorator to automatically track AI operation usage
 */
export function trackAIUsage(
  provider: 'anthropic' | 'voyage',
  operation: string
) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = false;
      let tokensUsed: number | undefined;
      let cost: number | undefined;

      try {
        const result = await method.apply(this, args);
        success = true;
        
        // Extract token usage and cost from result if available
        if (result && typeof result === 'object') {
          tokensUsed = result.tokensUsed || result.metadata?.tokensUsed;
          cost = result.cost || result.metadata?.cost;
        }

        return result;
      } catch (error) {
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        
        usageTracker.trackUsage({
          provider,
          operation,
          tokensUsed,
          requestCount: 1,
          duration,
          success,
          cost,
          userId: args[1] // Assuming userId is typically the second argument
        });
      }
    } as T;
  };
}