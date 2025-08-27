// Enhanced AI Analysis Engine for Phase 6 Integration
// Integrates with Enhanced Extraction Engine to provide structured data-driven analysis

import { v4 as uuidv4 } from 'uuid';
import type { CrawlResult } from '../crawler/types';
import type { AIAnalysisResult, AnalysisType } from './types';
import type { ExtractedData, PageType } from '../extraction/types';
import { AnthropicAnalysisProvider } from './providers/anthropic';
import { withSentryTracing, addBreadcrumb, captureErrorWithContext } from '../sentry-utils';

export interface EnhancedAnalysisInput {
  crawlData: CrawlResult;
  extractedData: ExtractedData;
  websiteId: string;
  analysisType: AnalysisType;
}

export interface EnhancedAnalysisResult extends AIAnalysisResult {
  enhancedMetadata: {
    pageType: PageType;
    extractionConfidence: number;
    dataRichness: number;
    structuredDataUsed: boolean;
    enhancedPromptUsed: boolean;
    extractionVersion: 'v2';
  };
}

export class EnhancedAIAnalysisEngine {
  private provider: AnthropicAnalysisProvider;

  constructor() {
    this.provider = new AnthropicAnalysisProvider();
  }

  /**
   * Perform enhanced AI analysis using structured extraction data
   */
  async analyzeWithEnhancedData(
    crawlData: CrawlResult,
    extractedData: ExtractedData,
    websiteId: string,
    analysisType: AnalysisType = 'comprehensive'
  ): Promise<EnhancedAnalysisResult> {
    return withSentryTracing(
      this._performEnhancedAnalysis.bind(this),
      'ai.enhanced-analysis',
      `Enhanced analysis for ${websiteId} with type ${analysisType}`
    )(crawlData, extractedData, websiteId, analysisType);
  }

  private async _performEnhancedAnalysis(
    crawlData: CrawlResult,
    extractedData: ExtractedData,
    websiteId: string,
    analysisType: AnalysisType
  ): Promise<EnhancedAnalysisResult> {
    const analysisId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      addBreadcrumb(
        `Enhanced AI analysis started for ${crawlData.url}`,
        'ai.enhanced-analysis.start',
        { 
          websiteId, 
          analysisType, 
          url: crawlData.url,
          pageType: extractedData.structuredData.pageType,
          dataQuality: extractedData.extractionMetrics.dataQualityScore
        }
      );

      // Validate input data
      this.validateEnhancedInputData(crawlData, extractedData);

      const analysisResult: Partial<EnhancedAnalysisResult> = {
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
        enhancedMetadata: {
          pageType: extractedData.structuredData.pageType,
          extractionConfidence: extractedData.structuredData.confidence,
          dataRichness: extractedData.extractionMetrics.dataQualityScore,
          structuredDataUsed: true,
          enhancedPromptUsed: true,
          extractionVersion: 'v2',
        },
      };

      // Create enhanced analysis input combining traditional and structured data
      const enhancedInput = this.createEnhancedAnalysisInput(crawlData, extractedData);

      // Perform analysis based on type using enhanced data with existing provider methods
      // The existing provider methods will be enhanced by the enriched crawl data input
      switch (analysisType) {
        case 'conversion_psychology':
          const conversionResult = await this.provider.analyzeConversionPsychology(enhancedInput);
          analysisResult.conversionPsychology = conversionResult.analysis;
          analysisResult.metadata = conversionResult.metadata;
          analysisResult.overallScore = conversionResult.analysis.overallScore;
          analysisResult.summary = this.generateEnhancedSummary(conversionResult.analysis, 'conversion', extractedData);
          analysisResult.keyInsights = conversionResult.analysis.keyFindings || [];
          analysisResult.recommendations = this.generateEnhancedRecommendations(conversionResult.analysis, 'conversion', extractedData);
          break;

        case 'ux_ui_analysis':
          const uxResult = await this.provider.analyzeUX(enhancedInput);
          analysisResult.uxAnalysis = uxResult.analysis;
          analysisResult.metadata = uxResult.metadata;
          analysisResult.overallScore = uxResult.analysis.overallScore;
          analysisResult.summary = this.generateEnhancedSummary(uxResult.analysis, 'ux', extractedData);
          analysisResult.keyInsights = uxResult.analysis.keyFindings || [];
          analysisResult.recommendations = this.generateEnhancedRecommendations(uxResult.analysis, 'ux', extractedData);
          break;

        case 'technical_seo':
          const seoResult = await this.provider.analyzeTechnicalSEO(enhancedInput);
          analysisResult.technicalSeo = seoResult.analysis;
          analysisResult.metadata = seoResult.metadata;
          analysisResult.overallScore = seoResult.analysis.overallScore;
          analysisResult.summary = this.generateEnhancedSummary(seoResult.analysis, 'seo', extractedData);
          analysisResult.keyInsights = seoResult.analysis.keyFindings || [];
          analysisResult.recommendations = this.generateEnhancedRecommendations(seoResult.analysis, 'seo', extractedData);
          break;

        case 'comprehensive':
          const comprehensiveResult = await this.provider.generateComprehensiveAnalysis(enhancedInput);
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
          analysisResult.recommendations = this.combineEnhancedRecommendations([
            comprehensiveResult.conversionPsychology,
            comprehensiveResult.uxAnalysis,
            comprehensiveResult.technicalSeo,
          ], extractedData);
          break;

        default:
          throw new Error(`Unsupported analysis type: ${analysisType}`);
      }

      // Validate ethical compliance with enhanced data context
      this.validateEthicalComplianceEnhanced(analysisResult, extractedData);

      // Sort recommendations by priority with enhanced scoring
      analysisResult.recommendations = this.prioritizeEnhancedRecommendations(
        analysisResult.recommendations || [], 
        extractedData
      );

      addBreadcrumb(
        `Enhanced AI analysis completed for ${crawlData.url}`,
        'ai.enhanced-analysis.success',
        { 
          websiteId, 
          analysisType, 
          score: analysisResult.overallScore,
          recommendationCount: analysisResult.recommendations?.length || 0,
          pageType: extractedData.structuredData.pageType,
          dataQuality: extractedData.extractionMetrics.dataQualityScore
        }
      );

      return analysisResult as EnhancedAnalysisResult;
    } catch (error) {
      console.error('Enhanced AI Analysis failed:', error);
      
      captureErrorWithContext(
        error instanceof Error ? error : new Error(String(error)),
        {
          component: 'enhanced-ai-analysis-engine',
          action: 'analyzeWithEnhancedData',
          url: crawlData.url,
          additionalData: { 
            websiteId, 
            analysisType,
            pageType: extractedData.structuredData.pageType,
            extractionConfidence: extractedData.structuredData.confidence
          }
        }
      );
      
      throw new Error(`Enhanced analysis failed for ${crawlData.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create enhanced analysis input by combining traditional crawl data with structured extraction data
   */
  private createEnhancedAnalysisInput(crawlData: CrawlResult, extractedData: ExtractedData): any {
    return {
      // Traditional crawl data
      url: crawlData.url,
      htmlAnalysis: crawlData.htmlAnalysis,
      cssAnalysis: crawlData.cssAnalysis,
      performance: crawlData.performance,
      
      // Enhanced structured data
      pageType: extractedData.structuredData.pageType,
      pageTypeConfidence: extractedData.structuredData.confidence,
      structuredData: extractedData.structuredData.data,
      
      // Extraction metadata
      extractionMetrics: extractedData.extractionMetrics,
      dataQuality: extractedData.extractionMetrics.dataQualityScore,
      
      // Combined content
      rawContent: extractedData.rawContent,
      
      // Enhancement flags
      isEnhanced: true,
      extractionVersion: 'v2',
    };
  }

  /**
   * Generate enhanced summary with structured data context
   */
  private generateEnhancedSummary(analysis: any, type: string, extractedData: ExtractedData): string {
    const pageType = extractedData.structuredData.pageType;
    const confidence = extractedData.structuredData.confidence;
    const dataQuality = extractedData.extractionMetrics.dataQualityScore;
    
    const baseScore = analysis.overallScore || 0;
    const structuredInsight = dataQuality > 0.7 ? 'rich structured data' : 'basic structured data';
    
    switch (type) {
      case 'conversion':
        return `Enhanced conversion analysis (${structuredInsight}) for ${pageType} reveals score of ${baseScore}/10. Page type detected with ${(confidence * 100).toFixed(0)}% confidence. ${analysis.keyFindings?.length || 0} optimization opportunities identified.`;
      case 'ux':
        return `Enhanced UX analysis for ${pageType} shows score of ${baseScore}/10. Structured data quality: ${(dataQuality * 100).toFixed(0)}%. Page-specific UX recommendations available.`;
      case 'seo':
        return `Enhanced SEO analysis for ${pageType} indicates score of ${baseScore}/10. Leveraging ${structuredInsight} for page-specific optimization strategies.`;
      default:
        return `Enhanced analysis completed for ${pageType} with score of ${baseScore}/10. Data quality: ${(dataQuality * 100).toFixed(0)}%.`;
    }
  }

  /**
   * Generate enhanced recommendations using structured data context
   */
  private generateEnhancedRecommendations(analysis: any, category: string, extractedData: ExtractedData): any[] {
    const recommendations: any[] = [];
    const pageType = extractedData.structuredData.pageType;
    const structuredData = extractedData.structuredData.data;
    
    if (analysis.priorityRecommendations) {
      analysis.priorityRecommendations.forEach((rec: string, index: number) => {
        // Enhanced recommendation with structured data context
        const enhancedRec = {
          id: uuidv4(),
          title: `${category.toUpperCase()} Enhancement ${index + 1} (${pageType})`,
          description: rec,
          category: category,
          impact: {
            score: this.calculateEnhancedImpactScore(rec, pageType, structuredData),
            reasoning: `Enhanced scoring based on ${pageType} page analysis and structured data`,
            category: this.determineImpactCategory(rec, pageType),
          },
          effort: {
            score: this.calculateEnhancedEffortScore(rec, pageType, structuredData),
            reasoning: `Effort assessment for ${pageType} considering current implementation`,
            category: this.determineEffortCategory(rec, pageType),
          },
          implementation: {
            steps: this.generatePageTypeSpecificSteps(rec, pageType, structuredData),
            codeSnippets: [],
            resources: this.getPageTypeResources(pageType),
          },
          whyItMatters: this.generateEnhancedReasoningForPageType(rec, pageType, category),
          priority: this.determineEnhancedPriority(rec, pageType, structuredData),
          enhancedContext: {
            pageType,
            hasStructuredData: Object.keys(structuredData).length > 0,
            specificElements: this.extractRelevantElements(structuredData, category),
          },
        };
        
        recommendations.push(enhancedRec);
      });
    }

    return recommendations;
  }

  /**
   * Calculate enhanced impact score based on page type and structured data
   */
  private calculateEnhancedImpactScore(recommendation: string, pageType: PageType, structuredData: any): number {
    let baseScore = 5; // Default medium impact
    
    // Page-type specific impact scoring
    if (pageType === 'ecommerce-product') {
      if (recommendation.toLowerCase().includes('price') && structuredData.product?.price) {
        baseScore += 3; // High impact for pricing improvements on product pages
      }
      if (recommendation.toLowerCase().includes('review') && structuredData.socialProof?.reviews) {
        baseScore += 2; // Medium-high impact for review improvements
      }
      if (recommendation.toLowerCase().includes('cta') && structuredData.callsToAction) {
        baseScore += 2; // High impact for CTA improvements
      }
    } else if (pageType === 'service-landing') {
      if (recommendation.toLowerCase().includes('testimonial') && structuredData.credentialsAndProof) {
        baseScore += 3; // High impact for service testimonials
      }
      if (recommendation.toLowerCase().includes('contact') && structuredData.contactInfo) {
        baseScore += 2; // Medium-high impact for contact improvements
      }
    }
    
    return Math.min(10, Math.max(1, baseScore));
  }

  /**
   * Calculate enhanced effort score based on page type and existing elements
   */
  private calculateEnhancedEffortScore(recommendation: string, pageType: PageType, structuredData: any): number {
    let baseEffort = 5; // Default medium effort
    
    // If structured data shows elements already exist, effort is lower
    if (pageType === 'ecommerce-product') {
      if (recommendation.toLowerCase().includes('review') && structuredData.socialProof?.reviews?.length > 0) {
        baseEffort -= 2; // Lower effort if reviews already exist
      }
      if (recommendation.toLowerCase().includes('cta') && structuredData.callsToAction?.length > 0) {
        baseEffort -= 1; // Lower effort if CTAs exist
      }
    }
    
    return Math.min(10, Math.max(1, baseEffort));
  }

  /**
   * Generate page-type specific implementation steps
   */
  private generatePageTypeSpecificSteps(recommendation: string, pageType: PageType, structuredData: any): string[] {
    const baseSteps = [
      'Review current implementation',
      'Apply recommended changes',
      'Test and validate improvements',
      'Monitor results',
    ];

    // Add page-type specific steps based on structured data
    if (pageType === 'ecommerce-product') {
      if (recommendation.toLowerCase().includes('price') && structuredData.product?.price) {
        return [
          `Review current pricing display: ${structuredData.product.price.current}`,
          'Implement pricing optimization recommendations',
          'A/B test pricing presentation',
          'Monitor conversion rate impact',
        ];
      }
    } else if (pageType === 'service-landing') {
      if (recommendation.toLowerCase().includes('contact') && structuredData.contactInfo) {
        return [
          `Review current contact methods: ${Object.keys(structuredData.contactInfo).join(', ')}`,
          'Optimize contact form and information display',
          'Test contact conversion flow',
          'Monitor lead generation metrics',
        ];
      }
    }

    return baseSteps;
  }

  /**
   * Get page-type specific resources
   */
  private getPageTypeResources(pageType: PageType): string[] {
    const resourceMap: Record<PageType, string[]> = {
      'ecommerce-product': [
        'E-commerce conversion best practices',
        'Product page optimization guide',
        'Shopping cart abandonment solutions',
      ],
      'service-landing': [
        'Service business conversion guide',
        'Local business SEO strategies',
        'Lead generation optimization',
      ],
      'corporate-homepage': [
        'Homepage conversion optimization',
        'Brand messaging framework',
        'Corporate trust building',
      ],
      'blog-post': [
        'Content engagement strategies',
        'Blog conversion optimization',
        'Content marketing best practices',
      ],
      'about-us': ['About page best practices', 'Trust building strategies'],
      'contact': ['Contact page optimization', 'Lead capture best practices'],
      'landing-page': ['Landing page conversion guide', 'Campaign optimization'],
      'pricing': ['Pricing page optimization', 'SaaS pricing strategies'],
      'case-study': ['Case study presentation', 'Social proof optimization'],
      'product-comparison': ['Comparison page design', 'Decision-making optimization'],
      'ecommerce-category': ['Category page optimization', 'Product discovery'],
    };

    return resourceMap[pageType] || ['General optimization resources'];
  }

  /**
   * Generate enhanced reasoning specific to page type
   */
  private generateEnhancedReasoningForPageType(recommendation: string, pageType: PageType, category: string): string {
    const pageTypeContext = {
      'ecommerce-product': 'product pages drive direct sales',
      'service-landing': 'service pages generate qualified leads',
      'corporate-homepage': 'homepages create first impressions and guide user journeys',
      'blog-post': 'content pages build authority and drive engagement',
    };

    const context = pageTypeContext[pageType as keyof typeof pageTypeContext] || 'pages influence user behavior';
    
    return `This ${category} improvement is critical because ${context}. Optimizing this element directly impacts conversion rates and business growth for ${pageType} pages.`;
  }

  /**
   * Determine enhanced priority based on page type and structured data
   */
  private determineEnhancedPriority(recommendation: string, pageType: PageType, structuredData: any): 'low' | 'medium' | 'high' | 'critical' {
    // High priority for missing essential elements
    if (pageType === 'ecommerce-product') {
      if (recommendation.toLowerCase().includes('price') && !structuredData.product?.price) {
        return 'critical';
      }
      if (recommendation.toLowerCase().includes('cta') && (!structuredData.callsToAction || structuredData.callsToAction.length === 0)) {
        return 'high';
      }
    }
    
    if (pageType === 'service-landing') {
      if (recommendation.toLowerCase().includes('contact') && !structuredData.contactInfo) {
        return 'critical';
      }
    }
    
    return 'medium'; // Default priority
  }

  /**
   * Extract relevant elements from structured data for specific categories
   */
  private extractRelevantElements(structuredData: any, category: string): any {
    switch (category) {
      case 'conversion':
        return {
          callsToAction: structuredData.callsToAction || [],
          socialProof: structuredData.socialProof || {},
          conversionElements: structuredData.conversionElements || {},
        };
      case 'ux':
        return {
          navigation: structuredData.navigation || {},
          contentStructure: structuredData.contentStructure || {},
          userFlow: structuredData.userFlow || {},
        };
      case 'seo':
        return {
          seoElements: structuredData.seoElements || {},
          content: structuredData.content || {},
          metadata: structuredData.metadata || {},
        };
      default:
        return structuredData;
    }
  }

  /**
   * Determine impact category with enhanced scoring
   */
  private determineImpactCategory(recommendation: string, pageType: PageType): 'low' | 'medium' | 'high' {
    const score = this.calculateEnhancedImpactScore(recommendation, pageType, {});
    if (score >= 8) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  }

  /**
   * Determine effort category with enhanced scoring
   */
  private determineEffortCategory(recommendation: string, pageType: PageType): 'low' | 'medium' | 'high' {
    const score = this.calculateEnhancedEffortScore(recommendation, pageType, {});
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Validate enhanced input data
   */
  private validateEnhancedInputData(crawlData: CrawlResult, extractedData: ExtractedData): void {
    if (!crawlData.url) {
      throw new Error('Crawl data missing URL');
    }

    if (!extractedData.structuredData) {
      throw new Error('Enhanced extraction data missing structured data');
    }

    if (!extractedData.structuredData.pageType) {
      throw new Error('Enhanced extraction data missing page type');
    }

    if (crawlData.statusCode >= 400) {
      throw new Error(`Cannot analyze website with status code ${crawlData.statusCode}`);
    }
  }

  /**
   * Validate ethical compliance with enhanced data context
   */
  private validateEthicalComplianceEnhanced(analysisResult: Partial<EnhancedAnalysisResult>, extractedData: ExtractedData): void {
    const recommendations = analysisResult.recommendations || [];
    const pageType = extractedData.structuredData.pageType;
    
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
          ethicalIssues.push(`Potentially manipulative recommendation detected for ${pageType}: ${pattern}`);
        }
      });
    });

    // Additional validation for page-specific ethical concerns
    if (pageType === 'ecommerce-product' && extractedData.structuredData.data.conversionElements) {
      const conversionElements = extractedData.structuredData.data.conversionElements;
      if (conversionElements.scarcityIndicators?.some((indicator: string) => 
        indicator.toLowerCase().includes('fake') || indicator.toLowerCase().includes('false'))) {
        ethicalIssues.push('Detected potentially fake scarcity indicators');
      }
    }

    if (ethicalIssues.length > 0) {
      analysisResult.ethicalCompliance = {
        noDarkPatterns: false,
        transparentRecommendations: false,
        userFocused: true,
        notes: ethicalIssues,
      };
    }
  }

  /**
   * Combine key insights from multiple enhanced analyses
   */
  private combineKeyInsights(analyses: Array<any>): string[] {
    const insights: string[] = [];
    
    analyses.forEach(analysis => {
      if (analysis?.keyFindings) {
        insights.push(...analysis.keyFindings);
      }
    });

    return Array.from(new Set(insights)).slice(0, 15); // More insights for enhanced analysis
  }

  /**
   * Combine enhanced recommendations from multiple analyses
   */
  private combineEnhancedRecommendations(analyses: Array<any>, extractedData: ExtractedData): any[] {
    const recommendations: any[] = [];
    
    analyses.forEach((analysis, index) => {
      const categoryNames = ['conversion', 'ux', 'seo'];
      const category = categoryNames[index] || 'technical';
      
      if (analysis?.priorityRecommendations) {
        recommendations.push(...this.generateEnhancedRecommendations(analysis, category, extractedData));
      }
    });

    return this.prioritizeEnhancedRecommendations(recommendations, extractedData);
  }

  /**
   * Prioritize recommendations with enhanced scoring based on structured data
   */
  private prioritizeEnhancedRecommendations(recommendations: any[], extractedData: ExtractedData): any[] {
    const pageType = extractedData.structuredData.pageType;
    const dataQuality = extractedData.extractionMetrics.dataQualityScore;
    
    return recommendations.sort((a, b) => {
      // Enhanced priority scoring that considers page type and data quality
      const aScore = this.calculateRecommendationScore(a, pageType, dataQuality);
      const bScore = this.calculateRecommendationScore(b, pageType, dataQuality);
      
      return bScore - aScore; // Sort by score descending
    });
  }

  /**
   * Calculate recommendation score based on impact, effort, and page-specific factors
   */
  private calculateRecommendationScore(recommendation: any, pageType: PageType, dataQuality: number): number {
    const impact = recommendation.impact?.score || 5;
    const effort = recommendation.effort?.score || 5;
    
    // Basic impact/effort ratio
    let score = (impact * 2) - effort; // Prioritize high impact, low effort
    
    // Boost score for high-quality data recommendations
    if (dataQuality > 0.7) {
      score += 2;
    }
    
    // Page-type specific boosts
    if (pageType === 'ecommerce-product' && recommendation.description?.toLowerCase().includes('conversion')) {
      score += 1;
    }
    
    return score;
  }
}