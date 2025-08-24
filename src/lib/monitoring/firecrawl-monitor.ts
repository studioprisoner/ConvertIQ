/**
 * Firecrawl v1 vs v2 Monitoring Service
 * 
 * Tracks and compares performance metrics between Firecrawl versions
 * - API response times
 * - Analysis quality metrics
 * - Cost tracking
 * - Error rates
 */

export interface FirecrawlMetrics {
  version: 'v1' | 'v2';
  timestamp: Date;
  userId?: string;
  websiteId?: string;
  
  // Performance metrics
  responseTimeMs: number;
  tokenUsage?: number;
  costUsd?: number;
  
  // Quality metrics
  dataCompletenessScore?: number; // 0-100
  analysisQualityScore?: number; // 0-100
  extractionAccuracy?: number; // 0-100
  
  // Operation details
  operation: 'scrape' | 'extract' | 'batch' | 'crawl';
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  
  // Data size metrics
  contentLength?: number;
  structuredDataPoints?: number;
  
  // Additional metadata
  url?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface ComparisonReport {
  timeRange: {
    start: Date;
    end: Date;
  };
  
  metrics: {
    v1: {
      totalRequests: number;
      avgResponseTime: number;
      successRate: number;
      avgCost: number;
      avgQuality: number;
    };
    v2: {
      totalRequests: number;
      avgResponseTime: number;
      successRate: number;
      avgCost: number;
      avgQuality: number;
    };
  };
  
  improvements: {
    responseTimeImprovement: number; // percentage
    qualityImprovement: number; // percentage
    costEfficiency: number; // percentage
    reliabilityImprovement: number; // percentage
  };
  
  recommendations: string[];
}

class FirecrawlMonitoringService {
  private metrics: FirecrawlMetrics[] = [];
  private readonly maxMetricsHistory = 10000; // Keep last 10k metrics

  /**
   * Record a Firecrawl operation metric
   */
  recordMetric(metric: FirecrawlMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
    
    // Log significant events
    if (!metric.success) {
      console.warn(`Firecrawl ${metric.version} ${metric.operation} failed:`, {
        error: metric.errorType,
        message: metric.errorMessage,
        url: metric.url,
        userId: metric.userId,
      });
    }
    
    if (metric.responseTimeMs > 10000) { // > 10 seconds
      console.warn(`Slow Firecrawl ${metric.version} response:`, {
        responseTime: metric.responseTimeMs,
        operation: metric.operation,
        url: metric.url,
      });
    }
  }

  /**
   * Time a Firecrawl operation and automatically record metrics
   */
  async timeOperation<T>(
    version: 'v1' | 'v2',
    operation: FirecrawlMetrics['operation'],
    operationFn: () => Promise<T>,
    metadata: Partial<FirecrawlMetrics> = {}
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    let error: any = null;
    let result: T;

    try {
      result = await operationFn();
      success = true;
      return result;
    } catch (err) {
      error = err;
      success = false;
      throw err;
    } finally {
      const responseTimeMs = performance.now() - startTime;
      
      this.recordMetric({
        version,
        operation,
        timestamp: new Date(),
        responseTimeMs,
        success,
        errorType: error?.name,
        errorMessage: error?.message,
        ...metadata,
      });
    }
  }

  /**
   * Generate comparison report between v1 and v2
   */
  generateComparisonReport(hoursBack: number = 24): ComparisonReport {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    const v1Metrics = recentMetrics.filter(m => m.version === 'v1');
    const v2Metrics = recentMetrics.filter(m => m.version === 'v2');
    
    // Calculate v1 averages
    const v1Stats = {
      totalRequests: v1Metrics.length,
      avgResponseTime: this.calculateAverage(v1Metrics, 'responseTimeMs'),
      successRate: (v1Metrics.filter(m => m.success).length / Math.max(1, v1Metrics.length)) * 100,
      avgCost: this.calculateAverage(v1Metrics, 'costUsd', true),
      avgQuality: this.calculateAverage(v1Metrics, 'analysisQualityScore', true),
    };
    
    // Calculate v2 averages
    const v2Stats = {
      totalRequests: v2Metrics.length,
      avgResponseTime: this.calculateAverage(v2Metrics, 'responseTimeMs'),
      successRate: (v2Metrics.filter(m => m.success).length / Math.max(1, v2Metrics.length)) * 100,
      avgCost: this.calculateAverage(v2Metrics, 'costUsd', true),
      avgQuality: this.calculateAverage(v2Metrics, 'analysisQualityScore', true),
    };
    
    // Calculate improvements
    const improvements = {
      responseTimeImprovement: this.calculateImprovement(v1Stats.avgResponseTime, v2Stats.avgResponseTime, true),
      qualityImprovement: this.calculateImprovement(v1Stats.avgQuality, v2Stats.avgQuality, false),
      costEfficiency: this.calculateImprovement(v1Stats.avgCost, v2Stats.avgCost, true),
      reliabilityImprovement: this.calculateImprovement(v1Stats.successRate, v2Stats.successRate, false),
    };
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(v1Stats, v2Stats, improvements);
    
    return {
      timeRange: {
        start: cutoffTime,
        end: new Date(),
      },
      metrics: {
        v1: v1Stats,
        v2: v2Stats,
      },
      improvements,
      recommendations,
    };
  }

  /**
   * Get current health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    v1Status: 'healthy' | 'degraded' | 'unhealthy';
    v2Status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  } {
    const recentMetrics = this.metrics.filter(
      m => m.timestamp >= new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
    );
    
    const v1Recent = recentMetrics.filter(m => m.version === 'v1');
    const v2Recent = recentMetrics.filter(m => m.version === 'v2');
    
    const v1SuccessRate = v1Recent.length > 0 ? 
      (v1Recent.filter(m => m.success).length / v1Recent.length) * 100 : 100;
    const v2SuccessRate = v2Recent.length > 0 ? 
      (v2Recent.filter(m => m.success).length / v2Recent.length) * 100 : 100;
    
    const v1AvgResponse = this.calculateAverage(v1Recent, 'responseTimeMs');
    const v2AvgResponse = this.calculateAverage(v2Recent, 'responseTimeMs');
    
    const issues: string[] = [];
    
    // Determine v1 status
    let v1Status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (v1SuccessRate < 95) {
      v1Status = v1SuccessRate < 90 ? 'unhealthy' : 'degraded';
      issues.push(`Firecrawl v1 success rate: ${v1SuccessRate.toFixed(1)}%`);
    }
    if (v1AvgResponse > 8000) {
      v1Status = v1Status === 'healthy' ? 'degraded' : v1Status;
      issues.push(`Firecrawl v1 slow response: ${v1AvgResponse.toFixed(0)}ms avg`);
    }
    
    // Determine v2 status
    let v2Status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (v2SuccessRate < 95) {
      v2Status = v2SuccessRate < 90 ? 'unhealthy' : 'degraded';
      issues.push(`Firecrawl v2 success rate: ${v2SuccessRate.toFixed(1)}%`);
    }
    if (v2AvgResponse > 8000) {
      v2Status = v2Status === 'healthy' ? 'degraded' : v2Status;
      issues.push(`Firecrawl v2 slow response: ${v2AvgResponse.toFixed(0)}ms avg`);
    }
    
    // Overall status
    const overallStatus = [v1Status, v2Status].includes('unhealthy') ? 'unhealthy' :
                         [v1Status, v2Status].includes('degraded') ? 'degraded' : 'healthy';
    
    return {
      status: overallStatus,
      v1Status,
      v2Status,
      issues,
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(hoursBack: number = 24): FirecrawlMetrics[] {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Clear old metrics (for memory management)
   */
  clearOldMetrics(hoursToKeep: number = 72): void {
    const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
    const initialCount = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    
    const removedCount = initialCount - this.metrics.length;
    if (removedCount > 0) {
      console.log(`Cleared ${removedCount} old Firecrawl metrics (kept ${hoursToKeep}h)`);
    }
  }

  /**
   * Calculate average for a numeric field, filtering out null/undefined values
   */
  private calculateAverage(
    metrics: FirecrawlMetrics[], 
    field: keyof FirecrawlMetrics,
    skipNulls: boolean = false
  ): number {
    const values = metrics
      .map(m => m[field] as number)
      .filter(v => typeof v === 'number' && !isNaN(v) && (skipNulls || v !== null));
    
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate improvement percentage (positive = better)
   */
  private calculateImprovement(oldVal: number, newVal: number, lowerIsBetter: boolean): number {
    if (oldVal === 0) return newVal === 0 ? 0 : (lowerIsBetter ? -100 : 100);
    
    const change = ((newVal - oldVal) / oldVal) * 100;
    return lowerIsBetter ? -change : change;
  }

  /**
   * Generate actionable recommendations based on comparison
   */
  private generateRecommendations(
    v1Stats: any, 
    v2Stats: any, 
    improvements: any
  ): string[] {
    const recommendations: string[] = [];
    
    if (improvements.responseTimeImprovement > 20) {
      recommendations.push('✅ v2 shows significant performance improvements - consider increasing rollout');
    } else if (improvements.responseTimeImprovement < -20) {
      recommendations.push('⚠️ v2 performance regression detected - investigate and consider rollback');
    }
    
    if (improvements.qualityImprovement > 15) {
      recommendations.push('✅ v2 analysis quality is significantly better - accelerate migration');
    } else if (improvements.qualityImprovement < -10) {
      recommendations.push('⚠️ v2 analysis quality issues detected - review extraction prompts');
    }
    
    if (improvements.reliabilityImprovement < -5) {
      recommendations.push('🚨 v2 reliability issues detected - implement additional error handling');
    }
    
    if (v2Stats.avgCost > v1Stats.avgCost * 1.5) {
      recommendations.push('💰 v2 costs are significantly higher - optimize extraction prompts');
    }
    
    if (v2Stats.totalRequests < v1Stats.totalRequests * 0.1) {
      recommendations.push('📊 Low v2 usage - consider increasing rollout percentage');
    }
    
    return recommendations;
  }
}

// Singleton instance
export const firecrawlMonitor = new FirecrawlMonitoringService();

// Export convenience functions
export function recordFirecrawlMetric(metric: FirecrawlMetrics): void {
  firecrawlMonitor.recordMetric(metric);
}

export async function timeFirecrawlOperation<T>(
  version: 'v1' | 'v2',
  operation: FirecrawlMetrics['operation'],
  operationFn: () => Promise<T>,
  metadata?: Partial<FirecrawlMetrics>
): Promise<T> {
  return firecrawlMonitor.timeOperation(version, operation, operationFn, metadata);
}