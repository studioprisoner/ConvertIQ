// Extraction Performance Monitoring and Optimization
// Phase 4 Implementation

import type { ExtractionMetrics, TokenUsage, PageType } from '../types';

export interface PerformanceMetrics {
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  averageTokenUsage: number;
  averageCostPerExtraction: number;
  cacheHitRate: number;
  dataQualityScore: number;
}

export interface ExtractionEvent {
  url: string;
  pageType: PageType;
  timestamp: number;
  success: boolean;
  processingTime: number;
  tokenUsage: TokenUsage;
  dataQuality: number;
  errors?: string[];
  cacheHit: boolean;
}

export class ExtractionMonitor {
  private events: ExtractionEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events for analysis

  /**
   * Record an extraction event
   */
  recordExtraction(event: ExtractionEvent): void {
    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get performance metrics for the last N extractions
   */
  getPerformanceMetrics(lastN?: number): PerformanceMetrics {
    const recentEvents = lastN ? this.events.slice(-lastN) : this.events;
    
    if (recentEvents.length === 0) {
      return this.getEmptyMetrics();
    }

    const successfulExtractions = recentEvents.filter(e => e.success);
    const totalExtractions = recentEvents.length;
    
    return {
      averageProcessingTime: this.calculateAverage(recentEvents.map(e => e.processingTime)),
      successRate: successfulExtractions.length / totalExtractions,
      errorRate: (totalExtractions - successfulExtractions.length) / totalExtractions,
      averageTokenUsage: this.calculateAverage(recentEvents.map(e => e.tokenUsage.totalTokens)),
      averageCostPerExtraction: this.calculateAverage(recentEvents.map(e => e.tokenUsage.costUsd || 0)),
      cacheHitRate: recentEvents.filter(e => e.cacheHit).length / totalExtractions,
      dataQualityScore: this.calculateAverage(successfulExtractions.map(e => e.dataQuality))
    };
  }

  /**
   * Get performance metrics by page type
   */
  getMetricsByPageType(): Record<PageType, PerformanceMetrics> {
    const metrics: Record<string, PerformanceMetrics> = {};
    
    const pageTypes = [...new Set(this.events.map(e => e.pageType))];
    
    for (const pageType of pageTypes) {
      const pageTypeEvents = this.events.filter(e => e.pageType === pageType);
      const successfulEvents = pageTypeEvents.filter(e => e.success);
      
      metrics[pageType] = {
        averageProcessingTime: this.calculateAverage(pageTypeEvents.map(e => e.processingTime)),
        successRate: successfulEvents.length / pageTypeEvents.length,
        errorRate: (pageTypeEvents.length - successfulEvents.length) / pageTypeEvents.length,
        averageTokenUsage: this.calculateAverage(pageTypeEvents.map(e => e.tokenUsage.totalTokens)),
        averageCostPerExtraction: this.calculateAverage(pageTypeEvents.map(e => e.tokenUsage.costUsd || 0)),
        cacheHitRate: pageTypeEvents.filter(e => e.cacheHit).length / pageTypeEvents.length,
        dataQualityScore: this.calculateAverage(successfulEvents.map(e => e.dataQuality))
      };
    }

    return metrics as Record<PageType, PerformanceMetrics>;
  }

  /**
   * Identify performance bottlenecks and optimization opportunities
   */
  analyzePerformance(): {
    bottlenecks: string[];
    optimizations: string[];
    alerts: string[];
  } {
    const metrics = this.getPerformanceMetrics();
    const bottlenecks: string[] = [];
    const optimizations: string[] = [];
    const alerts: string[] = [];

    // Processing time analysis
    if (metrics.averageProcessingTime > 25000) { // > 25 seconds
      bottlenecks.push('High average processing time');
      optimizations.push('Consider implementing result caching');
      optimizations.push('Optimize extraction prompts for efficiency');
    }

    // Success rate analysis
    if (metrics.successRate < 0.9) { // < 90%
      alerts.push(`Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
      optimizations.push('Review and improve error handling');
      optimizations.push('Add more robust fallback mechanisms');
    }

    // Token usage analysis
    if (metrics.averageTokenUsage > 3000) {
      bottlenecks.push('High token usage per extraction');
      optimizations.push('Optimize extraction prompts for brevity');
      optimizations.push('Consider using smaller model for initial detection');
    }

    // Cache performance analysis
    if (metrics.cacheHitRate < 0.3) { // < 30%
      optimizations.push('Improve caching strategy');
      optimizations.push('Consider longer cache expiration times');
    }

    // Data quality analysis
    if (metrics.dataQualityScore < 0.6) {
      alerts.push(`Low data quality score: ${metrics.dataQualityScore.toFixed(2)}`);
      optimizations.push('Enhance extraction schemas');
      optimizations.push('Improve page type detection accuracy');
    }

    return { bottlenecks, optimizations, alerts };
  }

  /**
   * Get extraction failure analysis
   */
  getFailureAnalysis(): {
    commonErrors: Array<{ error: string; count: number; percentage: number }>;
    failuresByPageType: Record<string, number>;
    recommendations: string[];
  } {
    const failedEvents = this.events.filter(e => !e.success);
    const totalFailures = failedEvents.length;

    if (totalFailures === 0) {
      return {
        commonErrors: [],
        failuresByPageType: {},
        recommendations: ['No recent failures - system performing well']
      };
    }

    // Analyze common errors
    const errorCounts: Record<string, number> = {};
    failedEvents.forEach(event => {
      if (event.errors) {
        event.errors.forEach(error => {
          errorCounts[error] = (errorCounts[error] || 0) + 1;
        });
      }
    });

    const commonErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({
        error,
        count,
        percentage: (count / totalFailures) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Analyze failures by page type
    const failuresByPageType: Record<string, number> = {};
    failedEvents.forEach(event => {
      failuresByPageType[event.pageType] = (failuresByPageType[event.pageType] || 0) + 1;
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (commonErrors.length > 0) {
      const topError = commonErrors[0];
      if (topError.error.includes('timeout')) {
        recommendations.push('Consider increasing timeout values for complex pages');
      }
      if (topError.error.includes('rate limit')) {
        recommendations.push('Implement better rate limiting and request spacing');
      }
      if (topError.error.includes('network')) {
        recommendations.push('Add network retry logic with exponential backoff');
      }
    }

    return { commonErrors, failuresByPageType, recommendations };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    summary: PerformanceMetrics;
    byPageType: Record<PageType, PerformanceMetrics>;
    analysis: ReturnType<typeof this.analyzePerformance>;
    failures: ReturnType<typeof this.getFailureAnalysis>;
    period: { start: Date; end: Date; totalEvents: number };
  } {
    const summary = this.getPerformanceMetrics();
    const byPageType = this.getMetricsByPageType();
    const analysis = this.analyzePerformance();
    const failures = this.getFailureAnalysis();

    const timestamps = this.events.map(e => e.timestamp);
    const period = {
      start: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date(),
      end: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date(),
      totalEvents: this.events.length
    };

    return {
      summary,
      byPageType,
      analysis,
      failures,
      period
    };
  }

  /**
   * Clear old events and reset monitoring
   */
  reset(): void {
    this.events = [];
  }

  /**
   * Export events for external analysis
   */
  exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportAsCSV();
    }
    return JSON.stringify(this.events, null, 2);
  }

  // Helper methods

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      averageProcessingTime: 0,
      successRate: 0,
      errorRate: 0,
      averageTokenUsage: 0,
      averageCostPerExtraction: 0,
      cacheHitRate: 0,
      dataQualityScore: 0
    };
  }

  private exportAsCSV(): string {
    if (this.events.length === 0) return '';

    const headers = [
      'timestamp', 'url', 'pageType', 'success', 'processingTime',
      'totalTokens', 'costUsd', 'dataQuality', 'cacheHit', 'errors'
    ];

    const rows = this.events.map(event => [
      new Date(event.timestamp).toISOString(),
      event.url,
      event.pageType,
      event.success,
      event.processingTime,
      event.tokenUsage.totalTokens,
      event.tokenUsage.costUsd || 0,
      event.dataQuality,
      event.cacheHit,
      event.errors?.join('; ') || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

/**
 * Global extraction monitor instance
 */
export const extractionMonitor = new ExtractionMonitor();