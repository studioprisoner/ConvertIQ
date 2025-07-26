import { v4 as uuidv4 } from 'uuid';
import type { CrawlResult } from '../crawler/types';
import type { AIAnalysisResult, AnalysisType } from './types';
import { AnthropicAnalysisProvider } from './providers/anthropic';
import { withSentryTracing, addBreadcrumb, captureErrorWithContext } from '../sentry-utils';

export class AIAnalysisEngine {
  private provider: AnthropicAnalysisProvider;

  constructor() {
    this.provider = new AnthropicAnalysisProvider();
  }

  /**
   * Perform AI analysis on crawl data
   */
  async analyze(
    crawlData: CrawlResult,
    websiteId: string,
    analysisType: AnalysisType = 'comprehensive'
  ): Promise<AIAnalysisResult> {
    return withSentryTracing(
      this._performAnalysis.bind(this),
      'ai.analysis',
      `Analyzing website ${websiteId} with type ${analysisType}`
    )(crawlData, websiteId, analysisType);
  }

  private async _performAnalysis(
    crawlData: CrawlResult,
    websiteId: string,
    analysisType: AnalysisType = 'comprehensive'
  ): Promise<AIAnalysisResult> {
    const analysisId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      addBreadcrumb(
        `AI analysis started for ${crawlData.url}`,
        'ai.analysis.start',
        { websiteId, analysisType, url: crawlData.url }
      );

      // Validate input data
      this.validateCrawlData(crawlData);

      const analysisResult: Partial<AIAnalysisResult> = {
        id: analysisId,
        websiteId,
        analysisType,
        timestamp,
        recommendations: [],
        overallScore: 0,
        summary: '',
        keyInsights: [],
        ethicalCompliance: {
          noDarkPatterns: true,
          transparentRecommendations: true,
          userFocused: true,
          notes: [],
        },
      };

      // Perform analysis based on type
      switch (analysisType) {
        case 'conversion_psychology':
          const conversionResult = await this.provider.analyzeConversionPsychology(crawlData);
          analysisResult.conversionPsychology = conversionResult.analysis;
          analysisResult.metadata = conversionResult.metadata;
          analysisResult.overallScore = conversionResult.analysis.overallScore;
          analysisResult.summary = this.generateSummary(conversionResult.analysis, 'conversion');
          analysisResult.keyInsights = conversionResult.analysis.keyFindings || [];
          analysisResult.recommendations = this.generateRecommendations(conversionResult.analysis, 'conversion');
          break;

        case 'ux_ui_analysis':
          const uxResult = await this.provider.analyzeUX(crawlData);
          analysisResult.uxAnalysis = uxResult.analysis;
          analysisResult.metadata = uxResult.metadata;
          analysisResult.overallScore = uxResult.analysis.overallScore;
          analysisResult.summary = this.generateSummary(uxResult.analysis, 'ux');
          analysisResult.keyInsights = uxResult.analysis.keyFindings || [];
          analysisResult.recommendations = this.generateRecommendations(uxResult.analysis, 'ux');
          break;

        case 'technical_seo':
          const seoResult = await this.provider.analyzeTechnicalSEO(crawlData);
          analysisResult.technicalSeo = seoResult.analysis;
          analysisResult.metadata = seoResult.metadata;
          analysisResult.overallScore = seoResult.analysis.overallScore;
          analysisResult.summary = this.generateSummary(seoResult.analysis, 'seo');
          analysisResult.keyInsights = seoResult.analysis.keyFindings || [];
          analysisResult.recommendations = this.generateRecommendations(seoResult.analysis, 'seo');
          break;

        case 'comprehensive':
          const comprehensiveResult = await this.provider.generateComprehensiveAnalysis(crawlData);
          analysisResult.conversionPsychology = comprehensiveResult.conversionPsychology;
          analysisResult.uxAnalysis = comprehensiveResult.uxAnalysis;
          analysisResult.technicalSeo = comprehensiveResult.technicalSeo;
          analysisResult.metadata = comprehensiveResult.metadata;
          analysisResult.overallScore = comprehensiveResult.overallInsights.overallScore;
          analysisResult.summary = comprehensiveResult.overallInsights.summary;
          analysisResult.keyInsights = this.combineKeyInsights([
            comprehensiveResult.conversionPsychology,
            comprehensiveResult.uxAnalysis,
            comprehensiveResult.technicalSeo,
          ]);
          analysisResult.recommendations = this.combineRecommendations([
            comprehensiveResult.conversionPsychology,
            comprehensiveResult.uxAnalysis,
            comprehensiveResult.technicalSeo,
          ]);
          break;

        default:
          throw new Error(`Unsupported analysis type: ${analysisType}`);
      }

      // Validate ethical compliance
      this.validateEthicalCompliance(analysisResult);

      // Sort recommendations by priority
      analysisResult.recommendations = this.prioritizeRecommendations(analysisResult.recommendations || []);

      addBreadcrumb(
        `AI analysis completed for ${crawlData.url}`,
        'ai.analysis.success',
        { 
          websiteId, 
          analysisType, 
          score: analysisResult.overallScore,
          recommendationCount: analysisResult.recommendations?.length || 0
        }
      );

      return analysisResult as AIAnalysisResult;
    } catch (error) {
      console.error('AI Analysis failed:', error);
      
      captureErrorWithContext(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'ai-analysis-engine',
          action: 'analyze',
          url: crawlData.url,
          additionalData: { websiteId, analysisType }
        }
      );
      
      throw new Error(`Analysis failed for ${crawlData.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test AI provider connection
   */
  async testConnection(): Promise<boolean> {
    return this.provider.testConnection();
  }

  private validateCrawlData(crawlData: CrawlResult): void {
    if (!crawlData.url) {
      throw new Error('Crawl data missing URL');
    }

    if (!crawlData.htmlAnalysis) {
      throw new Error('Crawl data missing HTML analysis');
    }

    if (crawlData.statusCode >= 400) {
      throw new Error(`Cannot analyze website with status code ${crawlData.statusCode}`);
    }
  }

  private validateEthicalCompliance(analysisResult: Partial<AIAnalysisResult>): void {
    // Check for potentially manipulative recommendations
    const recommendations = analysisResult.recommendations || [];
    
    const manipulativePatterns = [
      'fake scarcity',
      'false urgency', 
      'hidden costs',
      'dark pattern',
      'misleading',
      'deceptive',
      'trick users',
      'manipulate',
    ];

    const ethicalIssues: string[] = [];

    recommendations.forEach(rec => {
      const content = (rec.title + ' ' + rec.description + ' ' + rec.implementation.steps.join(' ')).toLowerCase();
      
      manipulativePatterns.forEach(pattern => {
        if (content.includes(pattern)) {
          ethicalIssues.push(`Potentially manipulative recommendation detected: ${pattern}`);
        }
      });
    });

    if (ethicalIssues.length > 0) {
      analysisResult.ethicalCompliance = {
        noDarkPatterns: false,
        transparentRecommendations: false,
        userFocused: true,
        notes: ethicalIssues,
      };
    }
  }

  private generateSummary(analysis: unknown, type: string): string {
    switch (type) {
      case 'conversion':
        return `Conversion psychology analysis reveals an overall score of ${analysis.overallScore}/10. ${analysis.keyFindings?.length || 0} key optimization opportunities identified.`;
      case 'ux':
        return `UX analysis shows an overall score of ${analysis.overallScore}/10. Mobile optimization and user experience improvements recommended.`;
      case 'seo':
        return `Technical SEO analysis indicates a score of ${analysis.overallScore}/10. Focus on meta tags, schema markup, and image optimization.`;
      default:
        return `Analysis completed with overall score of ${analysis.overallScore}/10.`;
    }
  }

  private generateRecommendations(analysis: Record<string, unknown>, category: string): Array<Record<string, unknown>> {
    const recommendations: any[] = [];
    const categoryMap = {
      conversion: 'conversion',
      ux: 'ux',
      seo: 'seo',
    };

    // Extract priority recommendations from analysis
    if (analysis.priorityRecommendations) {
      analysis.priorityRecommendations.forEach((rec: string, index: number) => {
        recommendations.push({
          id: uuidv4(),
          title: `${category.toUpperCase()} Optimization ${index + 1}`,
          description: rec,
          category: categoryMap[category as keyof typeof categoryMap] || 'technical',
          impact: {
            score: 8, // Default high impact
            reasoning: 'Priority recommendation from AI analysis',
            category: 'high',
          },
          effort: {
            score: 4, // Default low-medium effort
            reasoning: 'Standard implementation for small business',
            category: 'medium',
          },
          implementation: {
            steps: [
              'Review current implementation',
              'Apply recommended changes',
              'Test and validate improvements',
              'Monitor results',
            ],
            codeSnippets: [],
            resources: [],
          },
          whyItMatters: `This ${category} improvement directly impacts user experience and conversion rates.`,
          priority: 'high' as const,
        });
      });
    }

    return recommendations;
  }

  private combineKeyInsights(analyses: Array<Record<string, unknown>>): string[] {
    const insights: string[] = [];
    
    analyses.forEach(analysis => {
      if (analysis?.keyFindings) {
        insights.push(...analysis.keyFindings);
      }
    });

    // Remove duplicates and limit to top insights
    return Array.from(new Set(insights)).slice(0, 10);
  }

  private combineRecommendations(analyses: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    const recommendations: any[] = [];
    
    analyses.forEach((analysis, index) => {
      const categoryNames = ['conversion', 'ux', 'seo'];
      const category = categoryNames[index] || 'technical';
      
      if (analysis?.priorityRecommendations) {
        recommendations.push(...this.generateRecommendations(analysis, category));
      }
    });

    return this.prioritizeRecommendations(recommendations);
  }

  private prioritizeRecommendations(recommendations: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return recommendations.sort((a, b) => {
      // Sort by impact score descending, then by effort score ascending
      const impactDiff = b.impact.score - a.impact.score;
      if (impactDiff !== 0) return impactDiff;
      
      return a.effort.score - b.effort.score;
    });
  }
}

// Export singleton instance
export const aiAnalysisEngine = new AIAnalysisEngine();