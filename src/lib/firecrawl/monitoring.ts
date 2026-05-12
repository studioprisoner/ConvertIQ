/**
 * Website Monitoring Service - Phase 2 Implementation
 * 
 * ConvertIQ-specific brand monitoring and change detection service
 * that leverages Firecrawl for automated website monitoring, competitor tracking,
 * and conversion element change detection.
 */

import { EnhancedFirecrawlService } from './enhanced-service';
import { generateAnalysisSummary } from './analysis-helpers';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { db } from '@/db';
import { websites, reports } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface MonitoringOptions {
  checkFrequency: 'hourly' | 'daily' | 'weekly';
  alertOnChanges: boolean;
  competitorUrls?: string[];
  trackingElements?: {
    callsToAction: boolean;
    pricing: boolean;
    products: boolean;
    socialProof: boolean;
    contentChanges: boolean;
    designChanges: boolean;
  };
  alertThreshold?: number; // Percentage change threshold for alerts (0-100)
  alertWebhook?: string;
  alertEmail?: string;
}

export interface WebsiteSnapshot {
  id: string;
  websiteId: string;
  timestamp: Date;
  url: string;
  extractedData: any;
  contentHash: string;
  screenshotUrl?: string;
  metadata: {
    pageTitle: string;
    wordCount: number;
    imageCount: number;
    linkCount: number;
    ctaCount: number;
  };
}

export interface ChangeDetection {
  type: 'content' | 'structure' | 'cta' | 'pricing' | 'product' | 'design' | 'seo';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  oldValue?: any;
  newValue?: any;
  confidence: number; // 0-1 confidence score
  location?: string; // Where on the page the change occurred
  impact?: 'positive' | 'negative' | 'neutral' | 'unknown';
}

export interface MonitoringResult {
  websiteId: string;
  snapshotId: string;
  hasChanges: boolean;
  changes: ChangeDetection[];
  changeScore: number; // 0-100 overall change significance
  summary: string;
  recommendations: string[];
  competitorComparison?: {
    url: string;
    changes: ChangeDetection[];
  }[];
}

/**
 * Website Monitoring Service for automated change detection and competitor tracking
 */
export class WebsiteMonitoringService {
  private firecrawl: EnhancedFirecrawlService;

  constructor(firecrawlService?: EnhancedFirecrawlService) {
    this.firecrawl = firecrawlService || new EnhancedFirecrawlService();
  }

  /**
   * Setup automated website monitoring for a website
   */
  async setupWebsiteMonitoring(
    websiteId: string, 
    monitoringOptions: MonitoringOptions
  ): Promise<{ success: boolean; monitoringId?: string; error?: string }> {
    try {
      // Get website details from database
      const website = await db
        .select()
        .from(websites)
        .where(eq(websites.id, websiteId))
        .limit(1);

      if (!website.length) {
        return { success: false, error: 'Website not found' };
      }

      const websiteData = website[0];

      // Create initial baseline snapshot
      const baselineSnapshot = await this.createWebsiteSnapshot(websiteId, websiteData.domain);
      
      if (!baselineSnapshot.success) {
        return { 
          success: false, 
          error: `Failed to create baseline snapshot: ${baselineSnapshot.error}` 
        };
      }

      // Store monitoring configuration in database
      // Note: This would require a monitoring_configs table to be added to the schema
      const monitoringId = `monitoring_${websiteId}_${Date.now()}`;

      // Schedule monitoring based on frequency
      await this.scheduleMonitoring(monitoringId, websiteId, monitoringOptions);

      return {
        success: true,
        monitoringId
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown monitoring setup error'
      };
    }
  }

  /**
   * Create a snapshot of a website's current state
   */
  async createWebsiteSnapshot(
    websiteId: string, 
    url: string
  ): Promise<{ success: boolean; snapshot?: WebsiteSnapshot; error?: string }> {
    try {
      // Extract structured data using comprehensive analysis
      const extractionResult = await this.firecrawl.extractStructuredData([url], {
        extractionType: 'comprehensive',
        showSources: true,
        timeout: 30000
      });

      if (!extractionResult.success) {
        return { 
          success: false, 
          error: `Extraction failed: ${extractionResult.error}` 
        };
      }

      // Generate content hash for change detection
      const contentHash = this.generateContentHash(extractionResult.data);

      // Calculate metadata
      const metadata = this.calculateSnapshotMetadata(extractionResult.data);

      const snapshot: WebsiteSnapshot = {
        id: `snapshot_${websiteId}_${Date.now()}`,
        websiteId,
        timestamp: new Date(),
        url,
        extractedData: extractionResult.data,
        contentHash,
        metadata
      };

      // Store snapshot in database
      // Note: This would require a website_snapshots table to be added to the schema

      return {
        success: true,
        snapshot
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Snapshot creation failed'
      };
    }
  }

  /**
   * Detect changes between two website snapshots using AI analysis
   */
  async detectWebsiteChanges(
    previousSnapshot: WebsiteSnapshot, 
    currentSnapshot: WebsiteSnapshot
  ): Promise<MonitoringResult> {
    try {
      // Quick check: if content hashes are identical, no changes
      if (previousSnapshot.contentHash === currentSnapshot.contentHash) {
        return {
          websiteId: currentSnapshot.websiteId,
          snapshotId: currentSnapshot.id,
          hasChanges: false,
          changes: [],
          changeScore: 0,
          summary: 'No changes detected',
          recommendations: []
        };
      }

      // AI-powered change detection
      const changes = await this.analyzeChangesWithAI(previousSnapshot, currentSnapshot);

      // Calculate overall change score
      const changeScore = this.calculateChangeScore(changes);

      // Generate summary and recommendations
      const summary = this.generateChangeSummary(changes);
      const recommendations = await this.generateRecommendations(changes, currentSnapshot);

      return {
        websiteId: currentSnapshot.websiteId,
        snapshotId: currentSnapshot.id,
        hasChanges: changes.length > 0,
        changes,
        changeScore,
        summary,
        recommendations
      };

    } catch (error) {
      return {
        websiteId: currentSnapshot.websiteId,
        snapshotId: currentSnapshot.id,
        hasChanges: false,
        changes: [],
        changeScore: 0,
        summary: `Error detecting changes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: []
      };
    }
  }

  /**
   * Compare website against competitors for insights
   */
  async performCompetitorComparison(
    websiteId: string,
    competitorUrls: string[]
  ): Promise<{ success: boolean; comparison?: any; error?: string }> {
    try {
      // Get current website snapshot
      const website = await db
        .select()
        .from(websites)
        .where(eq(websites.id, websiteId))
        .limit(1);

      if (!website.length) {
        return { success: false, error: 'Website not found' };
      }

      const currentSnapshot = await this.createWebsiteSnapshot(websiteId, website[0].domain);
      
      if (!currentSnapshot.success) {
        return { success: false, error: 'Failed to create current snapshot' };
      }

      // Create snapshots for competitors
      const competitorSnapshots = await Promise.allSettled(
        competitorUrls.map(url => 
          this.firecrawl.extractStructuredData([url], {
            extractionType: 'comprehensive',
            timeout: 20000
          })
        )
      );

      // Analyze competitive landscape
      const comparison = await this.analyzeCompetitiveLandscape(
        currentSnapshot.snapshot!,
        competitorSnapshots,
        competitorUrls
      );

      return {
        success: true,
        comparison
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Competitor comparison failed'
      };
    }
  }

  // Private helper methods

  private generateContentHash(data: any): string {
    // Create a stable hash of the content for change detection
    const contentString = JSON.stringify(data, Object.keys(data).sort());
    
    // Simple hash function (in production, consider using a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(36);
  }

  private calculateSnapshotMetadata(data: any): WebsiteSnapshot['metadata'] {
    return {
      pageTitle: data.seoElements?.pageTitle || data.businessInfo?.name || 'Unknown',
      wordCount: data.contentStructure?.wordCount || 0,
      imageCount: data.contentStructure?.contentTypes?.filter((type: string) => type.includes('image')).length || 0,
      linkCount: data.technicalSeo?.linkCount || 0,
      ctaCount: data.callsToAction?.length || 0
    };
  }

  private async analyzeChangesWithAI(
    previousSnapshot: WebsiteSnapshot, 
    currentSnapshot: WebsiteSnapshot
  ): Promise<ChangeDetection[]> {
    try {
      const prompt = `
      Analyze the differences between these two website snapshots and identify significant changes that could impact conversion rates, user experience, or business performance.

      Previous Snapshot:
      ${JSON.stringify(previousSnapshot.extractedData, null, 2)}

      Current Snapshot:
      ${JSON.stringify(currentSnapshot.extractedData, null, 2)}

      Focus on:
      1. Changes to calls-to-action (text, position, prominence)
      2. Pricing modifications
      3. Product/service changes
      4. Social proof additions/removals
      5. Content structure changes
      6. SEO element modifications

      For each change, provide:
      - Type of change
      - Severity (low/medium/high/critical)
      - Description
      - Potential impact (positive/negative/neutral)
      - Confidence level (0-1)

      Return a JSON array of changes.
      `;

      const { text } = await generateText({
        model: anthropic('claude-3-haiku-20240307'),
        prompt,
        maxOutputTokens: 2000,
        temperature: 0.2
      });

      // Parse AI response
      try {
        const changes = JSON.parse(text);
        return Array.isArray(changes) ? changes : [];
      } catch (parseError) {
        console.error('Failed to parse AI change detection response:', parseError);
        return this.fallbackChangeDetection(previousSnapshot, currentSnapshot);
      }

    } catch (error) {
      console.error('AI change detection failed:', error);
      return this.fallbackChangeDetection(previousSnapshot, currentSnapshot);
    }
  }

  private fallbackChangeDetection(
    previousSnapshot: WebsiteSnapshot, 
    currentSnapshot: WebsiteSnapshot
  ): ChangeDetection[] {
    const changes: ChangeDetection[] = [];

    // Basic metadata comparison
    const prev = previousSnapshot.metadata;
    const curr = currentSnapshot.metadata;

    if (prev.pageTitle !== curr.pageTitle) {
      changes.push({
        type: 'seo',
        severity: 'medium',
        description: 'Page title changed',
        oldValue: prev.pageTitle,
        newValue: curr.pageTitle,
        confidence: 0.9,
        impact: 'unknown'
      });
    }

    if (Math.abs(prev.ctaCount - curr.ctaCount) > 0) {
      changes.push({
        type: 'cta',
        severity: prev.ctaCount > curr.ctaCount ? 'high' : 'medium',
        description: `CTA count changed from ${prev.ctaCount} to ${curr.ctaCount}`,
        confidence: 0.8,
        impact: prev.ctaCount < curr.ctaCount ? 'positive' : 'negative'
      });
    }

    return changes;
  }

  private calculateChangeScore(changes: ChangeDetection[]): number {
    if (changes.length === 0) return 0;

    const severityWeights = {
      low: 10,
      medium: 25,
      high: 50,
      critical: 100
    };

    const totalScore = changes.reduce((score, change) => {
      return score + (severityWeights[change.severity] * change.confidence);
    }, 0);

    return Math.min(totalScore / changes.length, 100);
  }

  private generateChangeSummary(changes: ChangeDetection[]): string {
    if (changes.length === 0) return 'No significant changes detected';

    const criticalChanges = changes.filter(c => c.severity === 'critical').length;
    const highChanges = changes.filter(c => c.severity === 'high').length;
    const mediumChanges = changes.filter(c => c.severity === 'medium').length;

    const summaryParts = [];
    if (criticalChanges > 0) summaryParts.push(`${criticalChanges} critical change${criticalChanges > 1 ? 's' : ''}`);
    if (highChanges > 0) summaryParts.push(`${highChanges} high-impact change${highChanges > 1 ? 's' : ''}`);
    if (mediumChanges > 0) summaryParts.push(`${mediumChanges} medium change${mediumChanges > 1 ? 's' : ''}`);

    return summaryParts.join(', ');
  }

  private async generateRecommendations(
    changes: ChangeDetection[],
    currentSnapshot: WebsiteSnapshot
  ): Promise<string[]> {
    const recommendations: string[] = [];

    changes.forEach(change => {
      switch (change.type) {
        case 'cta':
          if (change.severity === 'high') {
            recommendations.push('Review CTA changes for conversion impact');
          }
          break;
        case 'pricing':
          recommendations.push('Monitor pricing changes for revenue impact');
          break;
        case 'content':
          if (change.severity === 'high') {
            recommendations.push('Assess content changes for SEO and user experience impact');
          }
          break;
      }
    });

    return recommendations;
  }

  private async scheduleMonitoring(
    monitoringId: string,
    websiteId: string,
    options: MonitoringOptions
  ): Promise<void> {
    // In a production environment, this would integrate with a job scheduler
    // For now, we'll just log the scheduling intention
    console.log(`Scheduled monitoring for website ${websiteId} with frequency ${options.checkFrequency}`);
    
    // Implementation would depend on your job queue system (e.g., BullMQ, Agenda, etc.)
    // Example: await jobQueue.add('website-monitoring', { websiteId, options }, { repeat: { cron: '0 0 * * *' } });
  }

  private async analyzeCompetitiveLandscape(
    currentSnapshot: WebsiteSnapshot,
    competitorSnapshots: PromiseSettledResult<any>[],
    competitorUrls: string[]
  ): Promise<any> {
    // Analyze competitive positioning and opportunities
    const comparison = {
      website: currentSnapshot.extractedData,
      competitors: competitorSnapshots.map((result, index) => ({
        url: competitorUrls[index],
        data: result.status === 'fulfilled' ? result.value.data : null,
        error: result.status === 'rejected' ? result.reason?.message : null
      })),
      insights: {
        ctaComparison: this.compareCtaStrategies(currentSnapshot, competitorSnapshots),
        pricingComparison: this.comparePricingStrategies(currentSnapshot, competitorSnapshots),
        contentGaps: this.identifyContentGaps(currentSnapshot, competitorSnapshots)
      }
    };

    return comparison;
  }

  private compareCtaStrategies(currentSnapshot: WebsiteSnapshot, competitorSnapshots: PromiseSettledResult<any>[]): any {
    // Compare CTA strategies across competitors
    const currentCtas = currentSnapshot.extractedData?.callsToAction || [];
    const competitorCtas = competitorSnapshots
      .map(result => result.status === 'fulfilled' ? result.value.data?.callsToAction || [] : [])
      .flat();

    return {
      currentCount: currentCtas.length,
      competitorAverage: competitorCtas.length / competitorSnapshots.length,
      commonCtas: this.findCommonElements(currentCtas, competitorCtas, 'text'),
      uniqueCtas: currentCtas.filter(cta => 
        !competitorCtas.some(compCta => compCta.text?.toLowerCase() === cta.text?.toLowerCase())
      )
    };
  }

  private comparePricingStrategies(currentSnapshot: WebsiteSnapshot, competitorSnapshots: PromiseSettledResult<any>[]): any {
    // Compare pricing strategies and positioning
    const currentPricing = currentSnapshot.extractedData?.pricing;
    const competitorPricing = competitorSnapshots
      .map(result => result.status === 'fulfilled' ? result.value.data?.pricing : null)
      .filter(Boolean);

    return {
      hasPricing: !!currentPricing,
      competitorPricingCount: competitorPricing.length,
      pricingTransparency: currentPricing?.plans?.length || 0
    };
  }

  private identifyContentGaps(currentSnapshot: WebsiteSnapshot, competitorSnapshots: PromiseSettledResult<any>[]): any {
    // Identify content and feature gaps compared to competitors
    return {
      socialProofGaps: this.analyzeSocialProofGaps(currentSnapshot, competitorSnapshots),
      productFeatureGaps: this.analyzeProductFeatureGaps(currentSnapshot, competitorSnapshots)
    };
  }

  private analyzeSocialProofGaps(currentSnapshot: WebsiteSnapshot, competitorSnapshots: PromiseSettledResult<any>[]): any {
    const currentProof = currentSnapshot.extractedData?.socialProof;
    const competitorProof = competitorSnapshots
      .map(result => result.status === 'fulfilled' ? result.value.data?.socialProof : null)
      .filter(Boolean);

    return {
      hasTestimonials: (currentProof?.testimonials?.length || 0) > 0,
      competitorTestimonialAvg: competitorProof.reduce((acc, proof) => acc + (proof?.testimonials?.length || 0), 0) / competitorProof.length,
      missingProofTypes: []
    };
  }

  private analyzeProductFeatureGaps(currentSnapshot: WebsiteSnapshot, competitorSnapshots: PromiseSettledResult<any>[]): any {
    const currentProducts = currentSnapshot.extractedData?.products || [];
    const competitorProducts = competitorSnapshots
      .map(result => result.status === 'fulfilled' ? result.value.data?.products || [] : [])
      .flat();

    return {
      productCount: currentProducts.length,
      competitorAvg: competitorProducts.length / competitorSnapshots.length,
      featureGaps: []
    };
  }

  private findCommonElements(arr1: any[], arr2: any[], keyField: string): any[] {
    return arr1.filter(item1 => 
      arr2.some(item2 => 
        item1[keyField]?.toLowerCase() === item2[keyField]?.toLowerCase()
      )
    );
  }
}

// Singleton instance for application-wide use
export const websiteMonitoringService = new WebsiteMonitoringService();