/**
 * Streaming Analysis Service - Phase 3 Implementation
 * 
 * Provides real-time streaming analysis capabilities with:
 * - WebSocket integration for live updates
 * - Progressive analysis with incremental results
 * - Background job processing
 * - Real-time progress tracking
 */

import { AdvancedExtractionEngine, type AnalysisProgress, type AnalysisOptions } from './extraction-engine';
import { firecrawlService } from '@/lib/firecrawl/enhanced-service';
import { EventEmitter } from 'events';

export interface StreamingAnalysisEvent {
  type: 'progress' | 'page-complete' | 'error' | 'complete';
  data: any;
  timestamp: Date;
  sessionId: string;
}

export interface StreamingSession {
  id: string;
  websiteUrl: string;
  options: AnalysisOptions;
  startTime: Date;
  status: 'running' | 'completed' | 'error' | 'cancelled';
  progress: number;
  currentPhase: string;
  results?: any;
  error?: string;
}

export interface PageAnalysisResult {
  url: string;
  title: string;
  analysis: {
    conversionScore: number;
    seoScore: number;
    performanceScore: number;
    issues: Array<{
      type: 'conversion' | 'seo' | 'performance' | 'ux';
      severity: 'low' | 'medium' | 'high';
      message: string;
      suggestion: string;
    }>;
    keyFindings: string[];
  };
  processingTime: number;
}

/**
 * Streaming Analysis Service for real-time website analysis
 */
export class StreamingAnalysisService extends EventEmitter {
  private activeSessions: Map<string, StreamingSession> = new Map();
  private extractionEngine: AdvancedExtractionEngine;

  constructor() {
    super();
    this.extractionEngine = new AdvancedExtractionEngine(
      this.handleProgressUpdate.bind(this)
    );
    
    // Cleanup completed sessions after 1 hour
    setInterval(() => this.cleanupSessions(), 60 * 60 * 1000);
  }

  /**
   * Start a streaming website analysis session
   */
  async startStreamingAnalysis(
    websiteUrl: string, 
    options: AnalysisOptions = { analysisType: 'standard' }
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    
    const session: StreamingSession = {
      id: sessionId,
      websiteUrl,
      options,
      startTime: new Date(),
      status: 'running',
      progress: 0,
      currentPhase: 'initializing'
    };

    this.activeSessions.set(sessionId, session);
    
    // Start the analysis in the background
    this.performStreamingAnalysis(sessionId).catch(error => {
      this.handleError(sessionId, error);
    });

    return sessionId;
  }

  /**
   * Get the current status of a streaming session
   */
  getSessionStatus(sessionId: string): StreamingSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Cancel a running analysis session
   */
  cancelSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status === 'running') {
      session.status = 'cancelled';
      this.emit('session-cancelled', { sessionId });
      return true;
    }
    return false;
  }

  /**
   * Get all active sessions (for admin/monitoring)
   */
  getActiveSessions(): StreamingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Stream website analysis with real-time updates
   */
  async *streamWebsiteAnalysis(
    websiteUrl: string, 
    options: AnalysisOptions = { analysisType: 'standard' }
  ): AsyncGenerator<StreamingAnalysisEvent> {
    const sessionId = this.generateSessionId();
    
    try {
      yield this.createEvent('progress', {
        phase: 'crawling',
        progress: 0,
        message: 'Starting website crawl...'
      }, sessionId);

      // Phase 1: Website Crawling
      const crawlResult = await firecrawlService.crawlWebsiteComplete(websiteUrl, {
        maxDepth: options.maxDepth || 2,
        maxLinks: options.analysisType === 'comprehensive' ? 100 : 50
      });

      if (!crawlResult.success) {
        throw new Error(`Crawling failed: ${crawlResult.error}`);
      }

      yield this.createEvent('progress', {
        phase: 'crawling',
        progress: 100,
        message: `Found ${crawlResult.data.pages?.length || 0} pages`,
        data: { pagesFound: crawlResult.data.pages?.length || 0 }
      }, sessionId);

      // Phase 2: Progressive Page Analysis
      const pages = crawlResult.data.pages || [];
      const analysisResults: PageAnalysisResult[] = [];

      yield this.createEvent('progress', {
        phase: 'analysis',
        progress: 0,
        message: 'Starting page analysis...',
        totalPages: pages.length
      }, sessionId);

      for (const [index, page] of pages.entries()) {
        try {
          const pageAnalysis = await this.analyzePageWithAI(page, options);
          analysisResults.push(pageAnalysis);

          const progress = ((index + 1) / pages.length) * 100;
          
          yield this.createEvent('page-complete', {
            phase: 'analysis',
            progress,
            currentPage: index + 1,
            totalPages: pages.length,
            pageUrl: page.url,
            analysis: pageAnalysis
          }, sessionId);

        } catch (error) {
          console.warn(`Failed to analyze page ${page.url}:`, error);
          
          yield this.createEvent('error', {
            phase: 'analysis',
            pageUrl: page.url,
            error: error instanceof Error ? error.message : 'Unknown error',
            severity: 'warning'
          }, sessionId);
        }
      }

      // Phase 3: Generate Comprehensive Report
      yield this.createEvent('progress', {
        phase: 'report-generation',
        progress: 0,
        message: 'Generating comprehensive report...'
      }, sessionId);

      const comprehensiveReport = await this.generateComprehensiveReport(
        websiteUrl, 
        analysisResults, 
        options
      );

      yield this.createEvent('progress', {
        phase: 'report-generation',
        progress: 100,
        message: 'Report generation complete'
      }, sessionId);

      // Phase 4: Complete
      yield this.createEvent('complete', {
        phase: 'complete',
        progress: 100,
        message: 'Analysis complete',
        results: comprehensiveReport,
        totalTime: Date.now() - Date.now(), // Would calculate actual time
        pagesAnalyzed: analysisResults.length
      }, sessionId);

    } catch (error) {
      yield this.createEvent('error', {
        phase: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        severity: 'critical'
      }, sessionId);
      throw error;
    }
  }

  /**
   * Perform streaming analysis (used internally for background processing)
   */
  private async performStreamingAnalysis(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      const generator = this.streamWebsiteAnalysis(session.websiteUrl, session.options);
      
      for await (const event of generator) {
        if (session.status === 'cancelled') break;
        
        // Update session progress
        if (event.type === 'progress') {
          session.progress = event.data.progress;
          session.currentPhase = event.data.phase;
        }
        
        // Emit event for WebSocket clients
        this.emit('analysis-event', { sessionId, event });
        
        if (event.type === 'complete') {
          session.status = 'completed';
          session.results = event.data.results;
        }
      }
      
    } catch (error) {
      this.handleError(sessionId, error);
    }
  }

  /**
   * Analyze a single page with AI
   */
  private async analyzePageWithAI(page: any, options: AnalysisOptions): Promise<PageAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Extract structured data for this page
      const extractionResult = await firecrawlService.extractStructuredData(
        [page.url],
        { 
          extractionType: 'comprehensive',
          showSources: true,
          timeout: 30000
        }
      );

      // Analyze the extracted data with AI
      const analysis = await this.performPageAnalysis(extractionResult.data, options);
      
      return {
        url: page.url,
        title: page.title || 'Untitled Page',
        analysis,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`Error analyzing page ${page.url}:`, error);
      
      // Return a minimal analysis result on error
      return {
        url: page.url,
        title: page.title || 'Untitled Page',
        analysis: {
          conversionScore: 0,
          seoScore: 0,
          performanceScore: 0,
          issues: [{
            type: 'performance',
            severity: 'high',
            message: 'Failed to analyze this page',
            suggestion: 'Check if the page is accessible and try again'
          }],
          keyFindings: ['Page analysis failed']
        },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform AI analysis on page data
   */
  private async performPageAnalysis(pageData: any, options: AnalysisOptions): Promise<PageAnalysisResult['analysis']> {
    // This would integrate with the multi-provider AI system from Phase 2
    // For now, returning a mock analysis
    
    return {
      conversionScore: Math.floor(Math.random() * 40) + 60, // 60-100
      seoScore: Math.floor(Math.random() * 40) + 50, // 50-90
      performanceScore: Math.floor(Math.random() * 30) + 70, // 70-100
      issues: [
        {
          type: 'seo',
          severity: 'medium',
          message: 'Missing meta description',
          suggestion: 'Add a compelling meta description to improve search visibility'
        }
      ],
      keyFindings: [
        'Strong call-to-action placement',
        'Good mobile responsiveness',
        'Room for SEO improvement'
      ]
    };
  }

  /**
   * Generate comprehensive report from individual page analyses
   */
  private async generateComprehensiveReport(
    websiteUrl: string,
    pageResults: PageAnalysisResult[],
    options: AnalysisOptions
  ): Promise<any> {
    // Aggregate results from all pages
    const avgConversionScore = pageResults.reduce((sum, page) => 
      sum + page.analysis.conversionScore, 0) / pageResults.length;
    
    const avgSeoScore = pageResults.reduce((sum, page) => 
      sum + page.analysis.seoScore, 0) / pageResults.length;
    
    const avgPerformanceScore = pageResults.reduce((sum, page) => 
      sum + page.analysis.performanceScore, 0) / pageResults.length;

    // Collect all issues
    const allIssues = pageResults.flatMap(page => page.analysis.issues);
    
    // Generate recommendations based on common issues
    const recommendations = this.generateRecommendationsFromIssues(allIssues);

    return {
      website: {
        url: websiteUrl,
        pagesAnalyzed: pageResults.length,
        analysisDate: new Date().toISOString()
      },
      overallScores: {
        conversion: Math.round(avgConversionScore),
        seo: Math.round(avgSeoScore),
        performance: Math.round(avgPerformanceScore),
        overall: Math.round((avgConversionScore + avgSeoScore + avgPerformanceScore) / 3)
      },
      pageResults,
      commonIssues: this.identifyCommonIssues(allIssues),
      recommendations,
      keyInsights: this.generateKeyInsights(pageResults)
    };
  }

  /**
   * Handle progress updates from the extraction engine
   */
  private handleProgressUpdate(progress: AnalysisProgress): void {
    // This would be called by the extraction engine to provide updates
    console.log('Analysis progress:', progress);
  }

  /**
   * Handle errors during streaming analysis
   */
  private handleError(sessionId: string, error: any): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    this.emit('analysis-error', { 
      sessionId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }

  /**
   * Create a streaming analysis event
   */
  private createEvent(
    type: StreamingAnalysisEvent['type'],
    data: any,
    sessionId: string
  ): StreamingAnalysisEvent {
    return {
      type,
      data,
      timestamp: new Date(),
      sessionId
    };
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Identify common issues across pages
   */
  private identifyCommonIssues(allIssues: any[]): any[] {
    const issueCounts = new Map();
    
    allIssues.forEach(issue => {
      const key = `${issue.type}-${issue.message}`;
      issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
    });

    return Array.from(issueCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([key, count]) => {
        const [type, message] = key.split('-');
        return { type, message, occurrences: count };
      })
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Generate recommendations from identified issues
   */
  private generateRecommendationsFromIssues(issues: any[]): any[] {
    // Group issues by type and generate recommendations
    const recommendations = [];
    const issueGroups = new Map();

    issues.forEach(issue => {
      if (!issueGroups.has(issue.type)) {
        issueGroups.set(issue.type, []);
      }
      issueGroups.get(issue.type).push(issue);
    });

    // Generate recommendations for each issue type
    issueGroups.forEach((groupIssues, type) => {
      if (groupIssues.length >= 2) { // Only recommend if it's a common issue
        recommendations.push({
          type,
          priority: this.determinePriority(groupIssues),
          title: `Fix ${type} issues across ${groupIssues.length} pages`,
          description: `Address common ${type} issues to improve overall website performance`,
          affectedPages: groupIssues.length,
          estimatedImpact: this.estimateImpact(type, groupIssues.length)
        });
      }
    });

    return recommendations;
  }

  /**
   * Generate key insights from page analysis results
   */
  private generateKeyInsights(pageResults: PageAnalysisResult[]): string[] {
    const insights = [];
    
    // Analyze score distributions
    const conversionScores = pageResults.map(p => p.analysis.conversionScore);
    const avgConversion = conversionScores.reduce((a, b) => a + b, 0) / conversionScores.length;
    
    if (avgConversion > 80) {
      insights.push('Strong conversion optimization across most pages');
    } else if (avgConversion < 60) {
      insights.push('Significant conversion optimization opportunities identified');
    }

    // Analyze common strengths
    const allFindings = pageResults.flatMap(p => p.analysis.keyFindings);
    const findingCounts = new Map();
    
    allFindings.forEach(finding => {
      findingCounts.set(finding, (findingCounts.get(finding) || 0) + 1);
    });

    const topFindings = Array.from(findingCounts.entries())
      .filter(([_, count]) => count >= pageResults.length * 0.5)
      .sort((a, b) => b[1] - a[1]);

    if (topFindings.length > 0) {
      insights.push(`Consistent strength: ${topFindings[0][0]}`);
    }

    return insights;
  }

  /**
   * Determine priority based on issue severity and frequency
   */
  private determinePriority(issues: any[]): 'low' | 'medium' | 'high' {
    const highSeverityCount = issues.filter(i => i.severity === 'high').length;
    if (highSeverityCount > issues.length * 0.5) return 'high';
    if (issues.length > 5) return 'medium';
    return 'low';
  }

  /**
   * Estimate impact based on issue type and frequency
   */
  private estimateImpact(type: string, frequency: number): string {
    if (type === 'conversion' && frequency > 3) return 'High - Could improve conversion rates by 10-20%';
    if (type === 'seo' && frequency > 2) return 'Medium - Could improve search visibility';
    if (type === 'performance' && frequency > 2) return 'High - Could improve user experience and SEO';
    return 'Low to Medium - Incremental improvements';
  }

  /**
   * Cleanup old completed sessions
   */
  private cleanupSessions(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.status !== 'running' && session.startTime < oneHourAgo) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

// Export singleton instance
export const streamingAnalysisService = new StreamingAnalysisService();