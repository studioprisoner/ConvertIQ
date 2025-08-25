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
   * Perform AI analysis on crawl data (supports both v1 and enhanced v2 data)
   */
  async analyze(
    crawlData: CrawlResult,
    websiteId: string,
    analysisType: AnalysisType = 'comprehensive',
    extractedData?: any // Enhanced extraction data for v2 compatibility
  ): Promise<AIAnalysisResult> {
    return withSentryTracing(
      this._performAnalysis.bind(this),
      'ai.analysis',
      `Analyzing website ${websiteId} with type ${analysisType}`
    )(crawlData, websiteId, analysisType, extractedData);
  }

  private async _performAnalysis(
    crawlData: CrawlResult,
    websiteId: string,
    analysisType: AnalysisType = 'comprehensive',
    extractedData?: any // Enhanced extraction data for v2 compatibility
  ): Promise<AIAnalysisResult> {
    const analysisId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      addBreadcrumb(
        `AI analysis started for ${crawlData.url}`,
        'ai.analysis.start',
        { websiteId, analysisType, url: crawlData.url }
      );

      // Debug crawl data structure
      console.log('🔍 Debug crawl data keys:', Object.keys(crawlData));
      console.log('🔍 Debug htmlAnalysis exists:', !!crawlData.htmlAnalysis);
      if (crawlData.htmlAnalysis) {
        console.log('🔍 Debug htmlAnalysis keys:', Object.keys(crawlData.htmlAnalysis));
        console.log('🔍 Debug meta exists:', !!crawlData.htmlAnalysis.meta);
      }

      // Validate input data
      this.validateCrawlData(crawlData);

      // Create enhanced input if v2 extraction data is available
      const analysisInput = extractedData ? this.createEnhancedCrawlInput(crawlData, extractedData) : crawlData;
      const isEnhancedAnalysis = !!extractedData;

      console.log(`📊 Analysis mode: ${isEnhancedAnalysis ? 'Enhanced (v2)' : 'Standard (v1)'}`);
      if (isEnhancedAnalysis) {
        console.log(`📈 Page type: ${extractedData.structuredData?.pageType}, Quality: ${extractedData.extractionMetrics?.dataQualityScore}`);
      }

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

      // Perform analysis based on type using enhanced input when available
      switch (analysisType) {
        case 'conversion_psychology':
          const conversionResult = await this.provider.analyzeConversionPsychology(analysisInput);
          analysisResult.conversionPsychology = conversionResult.analysis;
          analysisResult.metadata = conversionResult.metadata;
          analysisResult.overallScore = conversionResult.analysis.overallScore;
          analysisResult.summary = isEnhancedAnalysis 
            ? this.generateEnhancedSummary(conversionResult.analysis, 'conversion', extractedData)
            : this.generateSummary(conversionResult.analysis, 'conversion');
          analysisResult.keyInsights = conversionResult.analysis.keyFindings || [];
          analysisResult.recommendations = isEnhancedAnalysis
            ? this.generateEnhancedRecommendations(conversionResult.analysis, 'conversion', extractedData)
            : this.generateRecommendations(conversionResult.analysis, 'conversion');
          break;

        case 'ux_ui_analysis':
          const uxResult = await this.provider.analyzeUX(analysisInput);
          analysisResult.uxAnalysis = uxResult.analysis;
          analysisResult.metadata = uxResult.metadata;
          analysisResult.overallScore = uxResult.analysis.overallScore;
          analysisResult.summary = isEnhancedAnalysis
            ? this.generateEnhancedSummary(uxResult.analysis, 'ux', extractedData)
            : this.generateSummary(uxResult.analysis, 'ux');
          analysisResult.keyInsights = uxResult.analysis.keyFindings || [];
          analysisResult.recommendations = isEnhancedAnalysis
            ? this.generateEnhancedRecommendations(uxResult.analysis, 'ux', extractedData)
            : this.generateRecommendations(uxResult.analysis, 'ux');
          break;

        case 'technical_seo':
          const seoResult = await this.provider.analyzeTechnicalSEO(analysisInput);
          analysisResult.technicalSeo = seoResult.analysis;
          analysisResult.metadata = seoResult.metadata;
          analysisResult.overallScore = seoResult.analysis.overallScore;
          analysisResult.summary = isEnhancedAnalysis
            ? this.generateEnhancedSummary(seoResult.analysis, 'seo', extractedData)
            : this.generateSummary(seoResult.analysis, 'seo');
          analysisResult.keyInsights = seoResult.analysis.keyFindings || [];
          analysisResult.recommendations = isEnhancedAnalysis
            ? this.generateEnhancedRecommendations(seoResult.analysis, 'seo', extractedData)
            : this.generateRecommendations(seoResult.analysis, 'seo');
          break;

        case 'comprehensive':
          // Additional validation for comprehensive analysis
          if (!analysisInput.htmlAnalysis || !analysisInput.htmlAnalysis.meta) {
            throw new Error('Comprehensive analysis requires valid htmlAnalysis with meta tags');
          }
          console.log('🔍 Comprehensive analysis input validation passed');
          const comprehensiveResult = await this.provider.generateComprehensiveAnalysis(analysisInput);
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
          analysisResult.recommendations = isEnhancedAnalysis
            ? this.combineEnhancedRecommendations([
                comprehensiveResult.conversionPsychology,
                comprehensiveResult.uxAnalysis,
                comprehensiveResult.technicalSeo,
              ], extractedData)
            : this.combineRecommendations([
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
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        stringified: JSON.stringify(error),
        keys: error && typeof error === 'object' ? Object.keys(error) : [],
      });
      
      captureErrorWithContext(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'ai-analysis-engine',
          action: 'analyze',
          url: crawlData.url,
          additionalData: { 
            websiteId, 
            analysisType,
            errorType: typeof error,
            errorStringified: JSON.stringify(error),
          }
        }
      );
      
      throw new Error(`Analysis failed for ${crawlData.url}: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
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

    if (!crawlData.htmlAnalysis.meta) {
      throw new Error('Crawl data missing HTML analysis meta tags');
    }

    if (crawlData.statusCode >= 400) {
      throw new Error(`Cannot analyze website with status code ${crawlData.statusCode}`);
    }

    console.log('✅ Crawl data validation passed for:', crawlData.url);
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

  // Enhanced methods for v2 compatibility
  private createEnhancedCrawlInput(crawlData: CrawlResult, extractedData: any): any {
    return {
      ...crawlData,
      enhancedData: {
        structuredData: extractedData.structuredData || {},
        extractionMetrics: extractedData.extractionMetrics || {},
        pageAnalysis: extractedData.pageAnalysis || {},
        extractionVersion: 'v2',
      },
    };
  }

  private generateEnhancedSummary(analysis: any, type: string, extractedData: any): string {
    const baseScore = analysis.overallScore || 0;
    const pageType = extractedData.structuredData?.pageType || 'unknown';
    const qualityScore = extractedData.extractionMetrics?.dataQualityScore || 0;
    
    switch (type) {
      case 'conversion':
        return `Enhanced conversion analysis (${pageType} page) reveals score ${baseScore}/10 with ${qualityScore}% data confidence. ${analysis.keyFindings?.length || 0} optimization opportunities identified using structured data insights.`;
      case 'ux':
        return `Enhanced UX analysis (${pageType} page) shows score ${baseScore}/10 with ${qualityScore}% extraction confidence. Recommendations based on structured content analysis and user experience patterns.`;
      case 'seo':
        return `Enhanced SEO analysis (${pageType} page) indicates score ${baseScore}/10 with ${qualityScore}% data quality. Technical recommendations enhanced with structured metadata insights.`;
      default:
        return `Enhanced analysis (${pageType} page) completed with score ${baseScore}/10 and ${qualityScore}% data confidence.`;
    }
  }

  private generateEnhancedRecommendations(analysis: any, category: string, extractedData: any): Array<Record<string, unknown>> {
    const baseRecommendations = this.generateRecommendations(analysis, category);
    const pageType = extractedData.structuredData?.pageType || 'unknown';
    const structuredData = extractedData.structuredData || {};
    
    // Enhance recommendations with structured data context
    return baseRecommendations.map((rec: any) => ({
      ...rec,
      enhancedContext: {
        pageType,
        dataConfidence: extractedData.extractionMetrics?.dataQualityScore || 0,
        structuredInsights: this.getStructuredInsights(structuredData, category),
      },
      implementation: {
        ...rec.implementation,
        enhancedSteps: this.getEnhancedImplementationSteps(rec, structuredData, pageType),
      },
    }));
  }

  private combineEnhancedRecommendations(analyses: Array<Record<string, unknown>>, extractedData: any): Array<Record<string, unknown>> {
    const recommendations: any[] = [];
    
    analyses.forEach((analysis, index) => {
      const categoryNames = ['conversion', 'ux', 'seo'];
      const category = categoryNames[index] || 'technical';
      
      if (analysis?.priorityRecommendations) {
        recommendations.push(...this.generateEnhancedRecommendations(analysis, category, extractedData));
      }
    });

    return this.prioritizeRecommendations(recommendations);
  }

  private getStructuredInsights(structuredData: any, category: string): Array<string> {
    const insights: string[] = [];
    
    switch (category) {
      case 'conversion':
        if (structuredData.ctaElements?.length) {
          insights.push(`Found ${structuredData.ctaElements.length} call-to-action elements`);
        }
        if (structuredData.trustSignals?.length) {
          insights.push(`Identified ${structuredData.trustSignals.length} trust signals`);
        }
        break;
      case 'ux':
        if (structuredData.navigation) {
          insights.push('Navigation structure analyzed for UX optimization');
        }
        if (structuredData.forms?.length) {
          insights.push(`Found ${structuredData.forms.length} forms for UX enhancement`);
        }
        break;
      case 'seo':
        if (structuredData.seoElements) {
          insights.push('Technical SEO elements extracted and analyzed');
        }
        if (structuredData.schema?.length) {
          insights.push(`Found ${structuredData.schema.length} schema markup elements`);
        }
        break;
    }
    
    return insights;
  }

  private getEnhancedImplementationSteps(recommendation: any, structuredData: any, pageType: string): Array<string> {
    const baseSteps = recommendation.implementation?.steps || [];
    const enhancedSteps = [...baseSteps];
    
    // Add page-type specific implementation guidance
    if (pageType === 'product' && structuredData.productInfo) {
      enhancedSteps.push('Leverage existing product data structure for optimization');
    } else if (pageType === 'homepage' && structuredData.heroSection) {
      enhancedSteps.push('Optimize hero section based on identified elements');
    } else if (pageType === 'landing' && structuredData.conversionElements) {
      enhancedSteps.push('Enhance conversion elements using structured insights');
    }
    
    return enhancedSteps;
  }
}

// Export singleton instance
export const aiAnalysisEngine = new AIAnalysisEngine();